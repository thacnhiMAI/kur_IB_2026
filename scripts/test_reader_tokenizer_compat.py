#!/usr/bin/env python3
"""Regression check for the Reader AI tokenizer compatibility adapter."""
from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "scripts" / "local_reader_ai.py"
spec = importlib.util.spec_from_file_location("local_reader_ai", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


class RejectUnbatchedTokenizer:
    def __init__(self):
        self.calls = []

    def __call__(self, text, **kwargs):
        self.calls.append((text, kwargs))
        if isinstance(text, str):
            raise TypeError("TextEncodeInput must be Union[TextInputSequence, Tuple[InputSequence, InputSequence]]")
        if not isinstance(text, list) or len(text) != 1 or not isinstance(text[0], str):
            raise AssertionError(f"expected one-item text batch, got {text!r}")
        return {"input_ids": [[1, 2, 3]], "attention_mask": [[1, 1, 1]]}


tokenizer = RejectUnbatchedTokenizer()
encoded = module._tokenize_rendered_prompt(tokenizer, "hello", 4096)
assert encoded["input_ids"] == [[1, 2, 3]]
assert tokenizer.calls[0][0] == ["hello"]
assert tokenizer.calls[0][1]["return_tensors"] == "pt"
assert tokenizer.calls[0][1]["truncation"] is True
assert tokenizer.calls[0][1]["max_length"] == 4096
print("PASS Reader AI uses a one-item text batch for tokenizer compatibility.")
