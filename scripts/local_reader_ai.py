#!/usr/bin/env python3
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import re
import sys
import threading
import time
import traceback
from typing import Any

WORKER_BUILD = "reader-ai-v14.3-response-id-fix"

os.environ.pop("TRANSFORMERS_CACHE", None)

try:
    sys.stdout.reconfigure(
        encoding="utf-8",
        errors="replace",
    )
    sys.stderr.reconfigure(
        encoding="utf-8",
        errors="backslashreplace",
    )
except Exception:
    pass


MODEL = None
TOKENIZER = None

MODEL_KIND = None
MODEL_TYPE = None
DEVICE = None

MODEL_SEARCH_DONE = False
TOKENIZER_MODE = None

MODEL_LOCK = threading.Lock()
GENERATION_LOCK = threading.Lock()

CANCEL_LOCK = threading.Lock()
CANCELLED: set[str] = set()


PRIORITY = (
    "qwen",
    "mistral",
    "llama",
    "phi",
    "gemma",
    "instruct",
    "chat",
    "t5",
    "bart",
)


BAD_MODEL_TYPES = {
    "whisper",
    "wav2vec2",
    "hubert",
    "wavlm",
    "sew",
    "sew-d",
    "unispeech",
    "unispeech-sat",
    "speech_to_text",
    "speecht5",
    "clap",
    "encodec",
    "musicgen",
    "bark",
    "clip",
    "siglip",
    "vit",
    "swin",
    "convnext",
    "dinov2",
    "beit",
    "sam",
    "trocr",
    "donut",
    "layoutlm",
    "layoutlmv2",
    "layoutlmv3",
}


def _truthy(
    name: str,
    default: str = "1",
) -> bool:
    return (
        os.getenv(
            name,
            default,
        )
        .strip()
        .lower()
        not in {
            "0",
            "false",
            "no",
            "off",
        }
    )


def _env_int(
    name: str,
    default: int,
    lo: int,
    hi: int,
) -> int:
    try:
        value = int(
            os.getenv(
                name,
                str(default),
            )
        )
    except Exception:
        value = default

    return max(
        lo,
        min(
            hi,
            value,
        ),
    )


def _env_float(
    name: str,
    default: float,
    lo: float,
    hi: float,
) -> float:
    try:
        value = float(
            os.getenv(
                name,
                str(default),
            )
        )
    except Exception:
        value = default

    return max(
        lo,
        min(
            hi,
            value,
        ),
    )


def _sanitize_text(
    value: Any,
    label: str | None = None,
) -> str:
    """
    Remove invalid lone UTF-16 surrogate characters.

    PDF/OCR text can contain malformed surrogate code points.
    Python accepts them, but Rust tokenizers reject them.
    """

    if value is None:
        return ""

    if type(value) is str:
        text = value
    else:
        text = str(value)

    bad = 0
    out: list[str] | None = None

    for index, char in enumerate(text):
        codepoint = ord(char)

        if (
            0xD800
            <= codepoint
            <= 0xDFFF
        ):
            if out is None:
                out = list(text)

            out[index] = "\uFFFD"
            bad += 1

    if out is not None:
        text = "".join(out)

        if label:
            print(
                "[reader-ai] sanitized "
                f"{bad} invalid Unicode surrogate(s) "
                f"in {label}",
                file=sys.stderr,
                flush=True,
            )

    return text


def _read_config(
    path: Path,
) -> dict[str, Any]:
    try:
        return json.loads(
            (
                path
                / "config.json"
            ).read_text(
                encoding="utf-8",
            )
        )

    except Exception:
        return {}


def _is_text_model(
    path: Path,
) -> bool:
    config = _read_config(
        path
    )

    model_type = str(
        config.get(
            "model_type",
            "",
        )
    ).lower()

    architectures = " ".join(
        str(value).lower()
        for value
        in (
            config.get(
                "architectures"
            )
            or []
        )
    )

    if (
        model_type
        in BAD_MODEL_TYPES
    ):
        return False

    if any(
        token
        in architectures
        for token
        in (
            "speech",
            "audio",
            "whisper",
            "vision",
            "imageclassification",
            "ctc",
        )
    ):
        return False

    if config.get(
        "is_encoder_decoder"
    ):
        return True

    if any(
        token
        in architectures
        for token
        in (
            "causallm",
            "conditionalgeneration",
            "lmheadmodel",
        )
    ):
        return True

    return (
        model_type
        in {
            "llama",
            "mistral",
            "mixtral",
            "qwen",
            "qwen2",
            "qwen3",
            "phi",
            "phi3",
            "gemma",
            "gemma2",
            "gpt2",
            "gpt_neox",
            "falcon",
            "mpt",
            "bloom",
            "opt",
            "bart",
            "t5",
            "mt5",
            "longt5",
        }
    )


def snapshots(
    cache_dir: Path,
) -> list[Path]:
    found: list[
        tuple[
            str,
            Path,
        ]
    ] = []

    if not cache_dir.exists():
        return []

    for root in cache_dir.glob(
        "models--*"
    ):
        snaps = (
            root
            / "snapshots"
        )

        if not snaps.exists():
            continue

        for snap in snaps.iterdir():
            if (
                not snap.is_dir()
                or
                not (
                    snap
                    / "config.json"
                ).exists()
            ):
                continue

            has_tokenizer = any(
                (
                    snap
                    / filename
                ).exists()
                for filename
                in (
                    "tokenizer.json",
                    "tokenizer_config.json",
                    "spiece.model",
                    "vocab.json",
                )
            )

            if not has_tokenizer:
                continue

            if not _is_text_model(
                snap
            ):
                print(
                    "[reader-ai] skipped "
                    "non-text checkpoint: "
                    f"{snap}",
                    file=sys.stderr,
                    flush=True,
                )
                continue

            found.append(
                (
                    root.name.lower(),
                    snap,
                )
            )

    def rank(
        item: tuple[
            str,
            Path,
        ],
    ) -> int:
        for index, token in enumerate(
            PRIORITY
        ):
            if token in item[0]:
                return index

        return 999

    return [
        path
        for _, path
        in sorted(
            found,
            key=rank,
        )
    ]


def _bnb_available() -> tuple[
    bool,
    str,
]:
    try:
        import bitsandbytes as bnb

        return (
            True,
            getattr(
                bnb,
                "__version__",
                "unknown",
            ),
        )

    except Exception as exc:
        return (
            False,
            str(exc),
        )


def _backend(
    tokenizer,
):
    for name in (
        "backend_tokenizer",
        "_tokenizer",
    ):
        try:
            value = getattr(
                tokenizer,
                name,
                None,
            )

        except Exception:
            value = None

        if (
            value is not None
            and
            hasattr(
                value,
                "encode",
            )
        ):
            return value

    return None


def _backend_ids(
    tokenizer,
    text: str,
) -> list[int]:
    backend = _backend(
        tokenizer
    )

    if backend is None:
        raise RuntimeError(
            "Tokenizer has no raw backend."
        )

    encoding = backend.encode(
        _sanitize_text(
            text,
            "tokenizer input",
        ),
        add_special_tokens=False,
    )

    ids = getattr(
        encoding,
        "ids",
        (
            encoding
            if isinstance(
                encoding,
                (
                    list,
                    tuple,
                ),
            )
            else None
        ),
    )

    if ids is None:
        raise RuntimeError(
            "Unsupported backend encoding "
            f"type: {type(encoding).__name__}"
        )

    return [
        int(token_id)
        for token_id
        in ids
    ]


def _probe_tokenizer(
    tokenizer,
) -> str:
    try:
        result = tokenizer(
            "Reader AI tokenizer probe.",
            add_special_tokens=False,
            return_attention_mask=False,
        )

        if result.get(
            "input_ids"
        ):
            return (
                "transformers-wrapper"
            )

    except Exception as exc:
        print(
            "[reader-ai] tokenizer "
            "wrapper probe failed: "
            f"{type(exc).__name__}: {exc}",
            file=sys.stderr,
            flush=True,
        )

    ids = _backend_ids(
        tokenizer,
        "Reader AI tokenizer probe.",
    )

    if not ids:
        raise RuntimeError(
            "Tokenizer probe returned "
            "zero tokens."
        )

    print(
        "[reader-ai] using direct "
        "tokenizer backend",
        file=sys.stderr,
        flush=True,
    )

    return "direct-backend"


def _tensor_from_ids(
    ids: list[int],
    limit: int,
):
    import torch

    if not ids:
        raise RuntimeError(
            "Tokenizer returned "
            "zero input tokens."
        )

    ids = ids[
        -limit:
    ]

    input_ids = torch.tensor(
        [
            ids
        ],
        dtype=torch.long,
    )

    return {
        "input_ids":
            input_ids,

        "attention_mask":
            torch.ones_like(
                input_ids
            ),
    }


def _tokenize(
    tokenizer,
    text: str,
    limit: int,
):
    global TOKENIZER_MODE

    text = _sanitize_text(
        text,
        "rendered prompt",
    )

    if not text.strip():
        raise RuntimeError(
            "Rendered prompt is empty."
        )

    if (
        TOKENIZER_MODE
        != "direct-backend"
    ):
        try:
            encoded = tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=limit,
                add_special_tokens=False,
            )

            if (
                "input_ids"
                not in encoded
            ):
                raise RuntimeError(
                    "Tokenizer did not "
                    "return input_ids."
                )

            return encoded

        except Exception as exc:
            print(
                "[reader-ai] tokenizer "
                "wrapper failed; switching "
                "to raw backend: "
                f"{type(exc).__name__}: {exc}",
                file=sys.stderr,
                flush=True,
            )

            TOKENIZER_MODE = (
                "direct-backend"
            )

    return _tensor_from_ids(
        _backend_ids(
            tokenizer,
            text,
        ),
        limit,
    )


def _decode(
    tokenizer,
    ids,
) -> str:
    try:
        return _sanitize_text(
            tokenizer.decode(
                ids,
                skip_special_tokens=True,
            )
        ).strip()

    except Exception:
        backend = _backend(
            tokenizer
        )

        if (
            backend is None
            or
            not hasattr(
                backend,
                "decode",
            )
        ):
            raise

        if hasattr(
            ids,
            "detach",
        ):
            ids = (
                ids
                .detach()
                .cpu()
                .tolist()
            )

        elif hasattr(
            ids,
            "tolist",
        ):
            ids = (
                ids
                .tolist()
            )

        return _sanitize_text(
            backend.decode(
                [
                    int(token_id)
                    for token_id
                    in ids
                ],
                skip_special_tokens=True,
            )
        ).strip()


def load_model(
    cache_dir: str,
    explicit_model: str | None,
) -> bool:
    global MODEL
    global TOKENIZER
    global MODEL_KIND
    global MODEL_TYPE
    global DEVICE
    global MODEL_SEARCH_DONE
    global TOKENIZER_MODE

    if MODEL is not None:
        return True

    if MODEL_SEARCH_DONE:
        return False

    with MODEL_LOCK:
        if MODEL is not None:
            return True

        if MODEL_SEARCH_DONE:
            return False

        MODEL_SEARCH_DONE = True

        cache = Path(
            cache_dir
        )

        if (
            cache.name.lower()
            == "hub"
        ):
            hf_home = (
                cache.parent
            )
        else:
            hf_home = cache

        os.environ.setdefault(
            "HF_HOME",
            str(hf_home),
        )

        os.environ.setdefault(
            "HF_HUB_OFFLINE",
            "1",
        )

        os.environ.setdefault(
            "TRANSFORMERS_OFFLINE",
            "1",
        )

        candidates: list[
            Path
        ] = []

        if explicit_model:
            path = Path(
                explicit_model
            )

            if (
                path.exists()
                and
                _is_text_model(
                    path
                )
            ):
                candidates.append(
                    path
                )

        candidates.extend(
            path
            for path
            in snapshots(
                cache
            )
            if path
            not in candidates
        )

        if not candidates:
            print(
                "[reader-ai] no compatible "
                "cached text model; using "
                "extractive fallback",
                file=sys.stderr,
                flush=True,
            )

            return False

        import torch
        import transformers

        from transformers import (
            AutoConfig,
            AutoModelForCausalLM,
            AutoModelForSeq2SeqLM,
            AutoTokenizer,
        )

        try:
            import tokenizers

            tokenizers_version = (
                getattr(
                    tokenizers,
                    "__version__",
                    "unknown",
                )
            )

        except Exception:
            tokenizers_version = (
                "unavailable"
            )

        print(
            "[reader-ai] "
            f"transformers={getattr(transformers, '__version__', 'unknown')} "
            f"tokenizers={tokenizers_version} "
            f"torch={getattr(torch, '__version__', 'unknown')}",
            file=sys.stderr,
            flush=True,
        )

        strict_4bit = (
            torch.cuda.is_available()
            and
            _truthy(
                "LOCAL_AI_4BIT",
                "1",
            )
        )

        if strict_4bit:
            (
                bnb_ok,
                bnb_info,
            ) = _bnb_available()

        else:
            bnb_ok = False
            bnb_info = "disabled"

        if (
            strict_4bit
            and
            not bnb_ok
        ):
            print(
                "[reader-ai] bitsandbytes "
                f"unavailable: {bnb_info}",
                file=sys.stderr,
                flush=True,
            )

            return False

        for candidate in candidates:
            try:
                config = (
                    AutoConfig
                    .from_pretrained(
                        str(candidate),
                        local_files_only=True,
                    )
                )

                tokenizer = (
                    AutoTokenizer
                    .from_pretrained(
                        str(candidate),
                        local_files_only=True,
                        use_fast=True,
                    )
                )

                tokenizer_mode = (
                    _probe_tokenizer(
                        tokenizer
                    )
                )

                is_seq2seq = bool(
                    getattr(
                        config,
                        "is_encoder_decoder",
                        False,
                    )
                )

                if is_seq2seq:
                    model_class = (
                        AutoModelForSeq2SeqLM
                    )
                else:
                    model_class = (
                        AutoModelForCausalLM
                    )

                model_type = str(
                    getattr(
                        config,
                        "model_type",
                        "",
                    )
                    or ""
                ).lower()

                if strict_4bit:
                    from transformers import (
                        BitsAndBytesConfig,
                    )

                    if (
                        torch.cuda
                        .is_bf16_supported()
                    ):
                        dtype = (
                            torch.bfloat16
                        )
                    else:
                        dtype = (
                            torch.float16
                        )

                    quantization = (
                        BitsAndBytesConfig(
                            load_in_4bit=True,
                            bnb_4bit_quant_type="nf4",
                            bnb_4bit_use_double_quant=True,
                            bnb_4bit_compute_dtype=dtype,
                        )
                    )

                    print(
                        "[reader-ai] loading "
                        "4-bit NF4 model "
                        f"(bnb {bnb_info}): "
                        f"{candidate}",
                        file=sys.stderr,
                        flush=True,
                    )

                    model = (
                        model_class
                        .from_pretrained(
                            str(candidate),
                            local_files_only=True,
                            quantization_config=quantization,
                            device_map={
                                "": 0
                            },
                            low_cpu_mem_usage=True,
                        )
                    )

                    if not getattr(
                        model,
                        "is_loaded_in_4bit",
                        False,
                    ):
                        raise RuntimeError(
                            "Model was not loaded "
                            "in 4-bit mode."
                        )

                    load_mode = (
                        "4-bit NF4"
                    )

                else:
                    model = (
                        model_class
                        .from_pretrained(
                            str(candidate),
                            local_files_only=True,
                            torch_dtype="auto",
                            device_map=(
                                "auto"
                                if torch.cuda.is_available()
                                else None
                            ),
                            low_cpu_mem_usage=True,
                        )
                    )

                    load_mode = str(
                        getattr(
                            model,
                            "dtype",
                            "auto",
                        )
                    )

                model.eval()

                try:
                    device = next(
                        model.parameters()
                    ).device

                except StopIteration:
                    device = (
                        torch.device(
                            "cuda"
                            if torch.cuda.is_available()
                            else "cpu"
                        )
                    )

                MODEL = model
                TOKENIZER = tokenizer

                if is_seq2seq:
                    MODEL_KIND = (
                        "seq2seq"
                    )
                else:
                    MODEL_KIND = (
                        "causal"
                    )

                MODEL_TYPE = (
                    model_type
                )

                DEVICE = device

                TOKENIZER_MODE = (
                    tokenizer_mode
                )

                print(
                    "[reader-ai] tokenizer="
                    f"{type(tokenizer).__name__} "
                    f"mode={tokenizer_mode}",
                    file=sys.stderr,
                    flush=True,
                )

                if (
                    torch.cuda
                    .is_available()
                ):
                    allocated = (
                        torch.cuda
                        .memory_allocated()
                        / (1024 ** 3)
                    )

                    reserved = (
                        torch.cuda
                        .memory_reserved()
                        / (1024 ** 3)
                    )

                    print(
                        "[reader-ai] local model "
                        f"loaded ({load_mode}); "
                        "CUDA allocated="
                        f"{allocated:.2f} GiB "
                        "reserved="
                        f"{reserved:.2f} GiB: "
                        f"{candidate}",
                        file=sys.stderr,
                        flush=True,
                    )

                else:
                    print(
                        "[reader-ai] local model "
                        f"loaded ({load_mode}): "
                        f"{candidate}",
                        file=sys.stderr,
                        flush=True,
                    )

                return True

            except Exception:
                traceback.print_exc(
                    file=sys.stderr
                )

                try:
                    if (
                        torch.cuda
                        .is_available()
                    ):
                        torch.cuda.empty_cache()

                except Exception:
                    pass

        print(
            "[reader-ai] all compatible "
            "local models failed; using "
            "extractive fallback",
            file=sys.stderr,
            flush=True,
        )

        return False


def _sentences(
    text: str,
) -> list[str]:
    text = (
        re.sub(
            r"\s+",
            " ",
            text,
        )
        .strip()
    )

    return [
        item.strip()
        for item
        in re.split(
            r"(?<=[.!?…])\s+",
            text,
        )
        if len(
            item.strip()
        ) > 24
    ]


def extractive_fallback(
    prompt: str,
) -> str:
    if "Материал:" in prompt:
        text = (
            prompt
            .split(
                "Материал:",
                1,
            )[1]
            .strip()
        )
    else:
        text = prompt

    sentences = _sentences(
        text
    )

    if not sentences:
        return (
            "В предоставленном материале "
            "недостаточно распознанного "
            "текста для ответа."
        )

    lower = prompt.lower()

    if (
        "самопроверк"
        in lower
        or
        "7 вопросов"
        in lower
    ):
        return "\n".join(
            (
                f"{index + 1}. "
                f"Вопрос по тезису: {sentence}\n"
                f"   Ответ: {sentence}"
            )
            for index, sentence
            in enumerate(
                sentences[:7]
            )
        )

    if "вопрос:" in lower:
        question = (
            lower
            .rsplit(
                "вопрос:",
                1,
            )[-1]
        )

        words = [
            word
            for word
            in re.findall(
                r"[\w-]{4,}",
                question,
            )
            if word
            not in {
                "который",
                "какой",
                "почему",
                "когда",
                "где",
            }
        ]

        sentences = sorted(
            sentences,
            key=lambda sentence:
                sum(
                    word
                    in sentence.lower()
                    for word
                    in words
                ),
            reverse=True,
        )

    return (
        "По предоставленному PDF:\n"
        + "\n".join(
            f"• {sentence}"
            for sentence
            in sentences[:6]
        )
    )


def _is_cancelled(
    job_id: str | None,
) -> bool:
    if not job_id:
        return False

    with CANCEL_LOCK:
        return (
            job_id
            in CANCELLED
        )


def _mark_cancelled(
    job_id: str | None,
) -> None:
    if not job_id:
        return

    with CANCEL_LOCK:
        CANCELLED.add(
            job_id
        )


def _clear_cancel(
    job_id: str | None,
) -> None:
    if not job_id:
        return

    with CANCEL_LOCK:
        CANCELLED.discard(
            job_id
        )


def _render_prompt(
    tokenizer,
    prompt: str,
) -> str:
    messages = [
        {
            "role":
                "system",

            "content":
                (
                    "You are a careful reading assistant. "
                    "Answer only from the provided text. "
                    "Be concise and factual. "
                    "Use Russian unless asked otherwise."
                ),
        },
        {
            "role":
                "user",

            "content":
                _sanitize_text(
                    prompt,
                    "chat message",
                ),
        },
    ]

    if hasattr(
        tokenizer,
        "apply_chat_template",
    ):
        kwargs: dict[
            str,
            Any,
        ] = {
            "tokenize":
                False,

            "add_generation_prompt":
                True,
        }

        if (
            MODEL_TYPE
            == "qwen3"
        ):
            kwargs[
                "enable_thinking"
            ] = False

        try:
            return _sanitize_text(
                tokenizer
                .apply_chat_template(
                    messages,
                    **kwargs,
                ),
                "chat template",
            )

        except TypeError:
            try:
                return _sanitize_text(
                    tokenizer
                    .apply_chat_template(
                        messages,
                        tokenize=False,
                        add_generation_prompt=True,
                    ),
                    "chat template",
                )

            except Exception as exc:
                print(
                    "[reader-ai] chat "
                    "template failed: "
                    f"{exc}",
                    file=sys.stderr,
                    flush=True,
                )

        except Exception as exc:
            print(
                "[reader-ai] chat "
                "template failed: "
                f"{exc}",
                file=sys.stderr,
                flush=True,
            )

    return (
        "SYSTEM: "
        + messages[0]["content"]
        + "\n\nUSER: "
        + messages[1]["content"]
        + "\n\nASSISTANT:"
    )


def generate(
    prompt: str,
    cache_dir: str,
    explicit_model: str | None,
    max_new_tokens: int,
    job_id: str | None,
) -> str:
    if _is_cancelled(
        job_id
    ):
        raise RuntimeError(
            "Cancelled"
        )

    prompt = _sanitize_text(
        prompt,
        "request prompt",
    )

    if not load_model(
        cache_dir,
        explicit_model,
    ):
        return extractive_fallback(
            prompt
        )

    import torch

    from transformers import (
        StoppingCriteria,
        StoppingCriteriaList,
    )

    tokenizer = TOKENIZER
    model = MODEL

    assert (
        tokenizer is not None
        and
        model is not None
    )

    output_limit = min(
        max(
            64,
            int(
                max_new_tokens
            ),
        ),
        _env_int(
            "LOCAL_AI_MAX_NEW_TOKENS",
            320,
            64,
            1024,
        ),
    )

    input_limit = _env_int(
        "LOCAL_AI_MAX_INPUT_TOKENS",
        3072,
        512,
        8192,
    )

    time_budget = _env_float(
        "LOCAL_AI_MAX_SECONDS",
        45.0,
        5.0,
        240.0,
    )

    rendered = _render_prompt(
        tokenizer,
        prompt,
    )

    encoded = _tokenize(
        tokenizer,
        rendered,
        input_limit,
    )

    if (
        encoded[
            "input_ids"
        ].shape[-1]
        > input_limit
    ):
        encoded[
            "input_ids"
        ] = (
            encoded[
                "input_ids"
            ][
                :,
                -input_limit:
            ]
        )

        if (
            "attention_mask"
            in encoded
        ):
            encoded[
                "attention_mask"
            ] = (
                encoded[
                    "attention_mask"
                ][
                    :,
                    -input_limit:
                ]
            )

    encoded = {
        key:
            value.to(
                DEVICE
            )

        for key, value
        in encoded.items()

        if hasattr(
            value,
            "to",
        )
    }

    input_tokens = int(
        encoded[
            "input_ids"
        ].shape[-1]
    )

    started = (
        time.monotonic()
    )

    class Stop(
        StoppingCriteria
    ):
        def __call__(
            self,
            input_ids,
            scores,
            **kwargs,
        ):
            return (
                _is_cancelled(
                    job_id
                )
                or
                (
                    time.monotonic()
                    - started
                )
                >= time_budget
            )

    generation: dict[
        str,
        Any,
    ] = {
        "max_new_tokens":
            output_limit,

        "do_sample":
            False,

        "repetition_penalty":
            1.05,

        "stopping_criteria":
            StoppingCriteriaList(
                [
                    Stop()
                ]
            ),

        "use_cache":
            True,
    }

    eos = getattr(
        tokenizer,
        "eos_token_id",
        None,
    )

    pad = getattr(
        tokenizer,
        "pad_token_id",
        None,
    )

    if eos is not None:
        generation[
            "eos_token_id"
        ] = eos

    if pad is not None:
        generation[
            "pad_token_id"
        ] = pad

    elif eos is not None:
        generation[
            "pad_token_id"
        ] = eos

    print(
        "[reader-ai] generation starting; "
        f"job={job_id or '-'} "
        f"input_tokens={input_tokens} "
        f"max_new_tokens={output_limit} "
        f"soft_timeout={time_budget:.0f}s "
        f"device={DEVICE}",
        file=sys.stderr,
        flush=True,
    )

    with GENERATION_LOCK:
        if _is_cancelled(
            job_id
        ):
            raise RuntimeError(
                "Cancelled"
            )

        generation_started = (
            time.monotonic()
        )

        with torch.inference_mode():
            output = (
                model.generate(
                    **encoded,
                    **generation,
                )
            )

        elapsed = (
            time.monotonic()
            - generation_started
        )

    if _is_cancelled(
        job_id
    ):
        raise RuntimeError(
            "Cancelled"
        )

    if (
        MODEL_KIND
        == "causal"
    ):
        generated = (
            output[0][
                input_tokens:
            ]
        )

    else:
        generated = (
            output[0]
        )

    generated_tokens = int(
        generated.shape[-1]
    )

    print(
        "[reader-ai] generation finished; "
        f"job={job_id or '-'} "
        f"generated_tokens={generated_tokens} "
        f"seconds={elapsed:.2f}",
        file=sys.stderr,
        flush=True,
    )

    answer = _decode(
        tokenizer,
        generated,
    )

    if not answer:
        answer = (
            extractive_fallback(
                prompt
            )
        )

    print(
        "[reader-ai] decode finished; "
        f"job={job_id or '-'} "
        f"answer_chars={len(answer)}",
        file=sys.stderr,
        flush=True,
    )

    return answer


def main() -> None:
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--serve",
        action="store_true",
    )

    parser.add_argument(
        "--cache-dir",
        default=os.getenv(
            "LOCAL_AI_HF_HOME",
            r"D:\AIModels\huggingface\hub",
        ),
    )

    parser.add_argument(
        "--model",
        default=(
            os.getenv(
                "LOCAL_AI_MODEL_PATH",
                "",
            )
            or None
        ),
    )

    args = parser.parse_args()

    print(
        "[reader-ai] worker build="
        f"{WORKER_BUILD}",
        file=sys.stderr,
        flush=True,
    )

    # Một GPU -> một generation tại một thời điểm.
    executor = ThreadPoolExecutor(
        max_workers=1,
        thread_name_prefix="reader-ai",
    )

    stdout_lock = (
        threading.Lock()
    )

    def emit(
        payload: dict[
            str,
            Any,
        ],
    ) -> None:
        safe = dict(
            payload
        )

        # CỰC KỲ QUAN TRỌNG:
        # KHÔNG chuyển id thành str.
        #
        # Node giữ pending request bằng Map<number, ...>.
        # Nếu Python trả "id": "1" thay vì "id": 1,
        # Node sẽ không tìm thấy request và UI quay mãi.
        for key in (
            "job_id",
            "answer",
            "error",
        ):
            if (
                key in safe
                and
                safe[key]
                is not None
            ):
                safe[key] = (
                    _sanitize_text(
                        safe[key]
                    )
                )

        with stdout_lock:
            print(
                json.dumps(
                    safe,
                    ensure_ascii=False,
                ),
                flush=True,
            )

    def execute(
        request: dict[
            str,
            Any,
        ],
    ) -> None:
        request_id = (
            request.get(
                "id"
            )
        )

        job_id = _sanitize_text(
            request.get(
                "job_id"
            )
            or request_id
            or ""
        )

        try:
            answer = generate(
                _sanitize_text(
                    request.get(
                        "prompt",
                        "",
                    ),
                    "JSON prompt",
                ),
                args.cache_dir,
                args.model,
                int(
                    request.get(
                        "max_new_tokens",
                        320,
                    )
                ),
                job_id,
            )

            emit(
                {
                    "id":
                        request_id,

                    "job_id":
                        job_id,

                    "ok":
                        True,

                    "answer":
                        answer,
                }
            )

        except Exception as exc:
            if (
                str(exc)
                != "Cancelled"
            ):
                traceback.print_exc(
                    file=sys.stderr
                )

            emit(
                {
                    "id":
                        request_id,

                    "job_id":
                        job_id,

                    "ok":
                        False,

                    "error":
                        str(exc),
                }
            )

    for raw in sys.stdin:
        line = raw.strip()

        if not line:
            continue

        try:
            request = json.loads(
                line
            )

            if not isinstance(
                request,
                dict,
            ):
                raise ValueError(
                    "Worker request must "
                    "be a JSON object."
                )

            kind = request.get(
                "type",
                "generate",
            )

            job_id = _sanitize_text(
                request.get(
                    "job_id"
                )
                or ""
            )

            if kind == "cancel":
                _mark_cancelled(
                    job_id
                )

                print(
                    "[reader-ai] cancel "
                    "requested; "
                    f"job={job_id or '-'}",
                    file=sys.stderr,
                    flush=True,
                )

                continue

            if (
                kind
                == "clear_cancel"
            ):
                _clear_cancel(
                    job_id
                )

                continue

            executor.submit(
                execute,
                request,
            )

        except Exception as exc:
            traceback.print_exc(
                file=sys.stderr
            )

            print(
                "[reader-ai] invalid "
                "worker request: "
                f"{type(exc).__name__}: "
                f"{exc}",
                file=sys.stderr,
                flush=True,
            )


if __name__ == "__main__":
    main()