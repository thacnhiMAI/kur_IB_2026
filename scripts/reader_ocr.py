#!/usr/bin/env python3
"""Local OCR helper for Smart Library with optional LaTeX math recognition.

Pipeline:
1. Native PDF text layer is still preferred in the browser.
2. When an image page (or a math-heavy native page) needs OCR, this worker can
   use Pix2Text for formula-aware OCR and LaTeX output.
3. Tesseract remains the always-available traditional OCR fallback.

Pix2Text is optional. If it is not installed, disabled, cannot load its models,
or returns no LaTeX-like formula, the request falls back to Tesseract.

The script supports a persistent ``--serve`` mode so formula models are loaded
once and reused across pages instead of being reloaded for every OCR request.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import sys
import threading
from typing import TextIO
from typing import Any

os.environ.pop("TRANSFORMERS_CACHE", None)

_PIX2TEXT_ENGINE: Any = None
_PIX2TEXT_FAILED = False
_PIX2TEXT_LOCK = threading.Lock()
_PROTOCOL_OUTPUT: TextIO | None = None


def configure_protocol_output() -> None:
    """Reserve the original stdout pipe for JSON; send library logs to stderr.

    Redirect fd 1 as well as sys.stdout so native libraries and subprocesses
    cannot accidentally write diagnostic messages into the JSONL protocol.
    Call before importing any optional OCR libraries, in both CLI modes.
    """
    global _PROTOCOL_OUTPUT
    if _PROTOCOL_OUTPUT is not None:
        return
    sys.stdout.flush()
    protocol_fd = os.dup(sys.stdout.fileno())
    os.set_inheritable(protocol_fd, False)
    _PROTOCOL_OUTPUT = os.fdopen(
        protocol_fd, "w", encoding="utf-8", errors="strict", buffering=1
    )
    os.dup2(sys.stderr.fileno(), sys.stdout.fileno())
    sys.stdout = sys.stderr


def emit(payload: dict) -> None:
    output = _PROTOCOL_OUTPUT or sys.stdout
    output.write(json.dumps(payload, ensure_ascii=False) + "\n")
    output.flush()


def env_truthy(name: str, default: str = "0") -> bool:
    return os.getenv(name, default).strip().lower() not in {"", "0", "false", "no", "off", "disabled"}


def normalize(text: str) -> str:
    """Normalize OCR text without destroying LaTeX/newline structure."""
    text = (text or "").replace("\x0c", "\n").replace("\r\n", "\n").replace("\r", "\n")
    lines = [re.sub(r"[\t\u00a0 ]+", " ", line).strip() for line in text.split("\n")]
    cleaned: list[str] = []
    blank = False
    for line in lines:
        if line:
            cleaned.append(line)
            blank = False
        elif cleaned and not blank:
            cleaned.append("")
            blank = True
    return "\n".join(cleaned).strip()


def looks_like_latex(text: str) -> bool:
    if not text:
        return False
    return bool(
        re.search(r"\$\$[\s\S]+?\$\$|\$[^$\n]+\$", text)
        or re.search(
            r"\\(?:frac|sqrt|sum|prod|int|oint|lim|begin|end|alpha|beta|gamma|delta|theta|lambda|mu|pi|rho|sigma|phi|omega|infty|partial|nabla|cdot|times|div|leq|geq|neq|approx|in|notin|subset|supset)\b",
            text,
        )
    )


def extract_latex_sections(text: str) -> str:
    """Return only recognized formula segments, avoiding duplicate OCR prose."""
    if not text:
        return ""
    matches = re.findall(r"\$\$[\s\S]*?\$\$|(?<!\$)\$[^$\n]+?\$(?!\$)", text)
    unique: list[str] = []
    seen: set[str] = set()
    for value in matches:
        clean = normalize(value)
        if clean and clean not in seen:
            seen.add(clean)
            unique.append(clean)
    return "\n".join(unique)


def find_tesseract() -> str | None:
    explicit = os.getenv("TESSERACT_CMD", "").strip()
    if explicit and Path(explicit).exists():
        return explicit
    found = shutil.which("tesseract")
    if found:
        return found
    if os.name == "nt":
        for candidate in (
            Path(os.environ.get("ProgramFiles", r"C:\Program Files")) / "Tesseract-OCR" / "tesseract.exe",
            Path(os.environ.get("LOCALAPPDATA", "")) / "Programs" / "Tesseract-OCR" / "tesseract.exe",
        ):
            if candidate.exists():
                return str(candidate)
    return None


def preprocess_image(image_path: str):
    from PIL import Image, ImageEnhance, ImageFilter, ImageOps

    image = Image.open(image_path).convert("L")
    image = ImageOps.autocontrast(image)
    # Enlarging scanned text helps Tesseract without loading any neural model.
    scale = max(1, int(os.getenv("TESSERACT_SCALE", "2") or "2"))
    if scale > 1:
        image = image.resize((max(1, image.width * scale), max(1, image.height * scale)))
    image = image.filter(ImageFilter.SHARPEN)
    image = ImageEnhance.Contrast(image).enhance(1.3)
    return image


def run_tesseract(image_path: str, languages: str) -> str | None:
    import pytesseract

    command = find_tesseract()
    if command:
        pytesseract.pytesseract.tesseract_cmd = command

    image = preprocess_image(image_path)
    attempts: list[str] = []
    requested = languages or "eng"
    language_attempts = (requested, "eng") if requested != "eng" else ("eng",)
    for lang in language_attempts:
        for psm in (6, 3, 11):
            try:
                text = normalize(
                    pytesseract.image_to_string(
                        image,
                        lang=lang,
                        config=f"--oem 3 --psm {psm} -c preserve_interword_spaces=1",
                    )
                )
                if text:
                    attempts.append(text)
            except Exception as exc:
                print(f"[reader-ocr] Tesseract failed lang={lang} psm={psm}: {exc}", file=sys.stderr, flush=True)
    if not attempts:
        return None
    # Prefer a rich reading, but do not flatten line breaks/formulas.
    return max(attempts, key=lambda value: (len(value), value.count("\n")))


def math_ocr_enabled() -> bool:
    mode = os.getenv("MATH_OCR_ENABLED", "0").strip().lower()
    if mode in {"", "0", "false", "no", "off", "disabled"}:
        return False
    if mode == "auto":
        return importlib.util.find_spec("pix2text") is not None
    return True


def load_pix2text():
    global _PIX2TEXT_ENGINE, _PIX2TEXT_FAILED
    if _PIX2TEXT_ENGINE is not None:
        return _PIX2TEXT_ENGINE
    if _PIX2TEXT_FAILED or not math_ocr_enabled():
        return None

    with _PIX2TEXT_LOCK:
        if _PIX2TEXT_ENGINE is not None:
            return _PIX2TEXT_ENGINE
        if _PIX2TEXT_FAILED:
            return None
        try:
            from pix2text import Pix2Text

            device = os.getenv("MATH_OCR_DEVICE", "cpu").strip().lower() or "cpu"
            print(f"[reader-ocr] loading Pix2Text formula OCR on {device}", file=sys.stderr, flush=True)
            # enable_table=False keeps this path focused on text + math. The object
            # stays resident in --serve mode, so model initialization happens once.
            _PIX2TEXT_ENGINE = Pix2Text.from_config(
                enable_formula=True,
                enable_table=False,
                device=device,
            )
            print("[reader-ocr] Pix2Text formula OCR ready", file=sys.stderr, flush=True)
            return _PIX2TEXT_ENGINE
        except Exception as exc:
            _PIX2TEXT_FAILED = True
            print(f"[reader-ocr] Pix2Text unavailable; using Tesseract fallback: {exc}", file=sys.stderr, flush=True)
            return None


def run_pix2text(image_path: str) -> str | None:
    engine = load_pix2text()
    if engine is None:
        return None
    try:
        # text_formula is intended for mixed text + formula images and returns
        # formulas as LaTeX. We use explicit separators so downstream rendering
        # can distinguish inline and display math reliably.
        text = engine.recognize(
            image_path,
            file_type="text_formula",
            return_text=True,
            embed_sep=(" $", "$ "),
            isolated_sep=("$$\n", "\n$$"),
        )
        if isinstance(text, (list, tuple)):
            text = "\n".join(str(item) for item in text)
        text = normalize(str(text or ""))
        return text or None
    except Exception as exc:
        print(f"[reader-ocr] Pix2Text recognition failed: {exc}", file=sys.stderr, flush=True)
        return None


def run_ocr(image_path: str, languages: str, prefer_math: bool) -> dict:
    math_text: str | None = None
    latex_sections = ""
    if prefer_math and math_ocr_enabled():
        math_text = run_pix2text(image_path)
        if math_text and looks_like_latex(math_text):
            latex_sections = extract_latex_sections(math_text)

    try:
        text = run_tesseract(image_path, languages)
    except Exception as exc:
        print(f"[reader-ocr] pytesseract unavailable: {exc}", file=sys.stderr, flush=True)
        text = None

    if text:
        payload = {"ok": True, "text": text, "engine": "tesseract"}
        if latex_sections:
            payload["engine"] = "tesseract+pix2text-latex"
            payload["math_text"] = latex_sections
        return payload

    # If Tesseract failed completely, use the formula-aware page reading as the
    # primary OCR text rather than returning nothing.
    if math_text:
        payload = {"ok": True, "text": math_text, "engine": "pix2text-latex" if latex_sections else "pix2text"}
        if latex_sections:
            payload["math_text"] = latex_sections
        return payload

    return {
        "ok": False,
        "error": (
            "OCR недоступен или не распознал текст. Установите Tesseract и языковые пакеты. "
            "Для формул LaTeX дополнительно установите Pix2Text и включите MATH_OCR_ENABLED=1."
        ),
    }


def serve(default_languages: str) -> int:
    print("[reader-ocr] persistent OCR worker ready", file=sys.stderr, flush=True)
    for raw in sys.stdin:
        raw = raw.strip()
        if not raw:
            continue
        request_id = None
        try:
            request = json.loads(raw)
            request_id = request.get("id")
            image_path = str(request.get("image") or "")
            languages = str(request.get("languages") or default_languages or "eng")
            prefer_math = bool(request.get("prefer_math", False))
            if not image_path or not Path(image_path).exists():
                raise ValueError("OCR image does not exist.")
            result = run_ocr(image_path, languages, prefer_math)
            emit({"id": request_id, **result})
        except Exception as exc:
            print(f"[reader-ocr] worker request failed: {exc}", file=sys.stderr, flush=True)
            emit({"id": request_id, "ok": False, "error": str(exc)})
    return 0


def main() -> int:
    configure_protocol_output()
    parser = argparse.ArgumentParser()
    parser.add_argument("--image")
    parser.add_argument("--languages", default=os.getenv("OCR_LANGUAGES", "rus+eng+vie"))
    parser.add_argument("--prefer-math", action="store_true")
    parser.add_argument("--serve", action="store_true")
    args = parser.parse_args()

    if args.serve:
        return serve(args.languages)
    if not args.image:
        parser.error("--image is required unless --serve is used")

    result = run_ocr(args.image, args.languages, args.prefer_math)
    emit(result)
    return 0 if result.get("ok") else 2


if __name__ == "__main__":
    raise SystemExit(main())
