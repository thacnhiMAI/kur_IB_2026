"""Regression test: JSONL stays clean even when OCR dependencies log to stdout."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).with_name("reader_ocr.py")


class ProtocolTest(unittest.TestCase):
    def test_cli_and_persistent_worker(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            image = root / "page.png"
            image.touch()
            # A fake optional dependency exercises import, initialization, and
            # recognition without requiring model downloads or OCR binaries.
            (root / "pix2text.py").write_text('''
import os, subprocess, sys
print("Creating new Ultralytics Settings v0.0.8 file", flush=True)
os.write(1, b"warning: native stdout diagnostic\\n")
subprocess.run([sys.executable, "-c", "print('child diagnostic')"], check=True)
class Pix2Text:
    @classmethod
    def from_config(cls, **kwargs):
        print("model initialization diagnostic", flush=True)
        return cls()
    def recognize(self, *args, **kwargs):
        print("recognition diagnostic", flush=True)
        return "Русский tiếng Việt $x+1$"
''', encoding="utf-8")
            (root / "pytesseract.py").write_text(
                'raise ImportError("deliberately unavailable for fallback test")',
                encoding="utf-8",
            )
            env = dict(os.environ, MATH_OCR_ENABLED="1", PYTHONIOENCODING="utf-8")
            env["PYTHONPATH"] = str(root)
            cli = subprocess.run(
                [sys.executable, str(SCRIPT), "--image", str(image), "--prefer-math"],
                capture_output=True, encoding="utf-8", env=env, timeout=20,
            )
            self.assertEqual(cli.returncode, 0, cli.stderr)
            self.assertEqual(len(cli.stdout.splitlines()), 1)
            self.assertEqual(json.loads(cli.stdout)["text"], "Русский tiếng Việt $x+1$")
            requests = [
                {"id": 1, "image": str(image), "prefer_math": True},
                {"id": 2, "image": str(image), "prefer_math": True},
                {"id": 3, "image": str(root / "missing.png")},
            ]
            worker = subprocess.run(
                [sys.executable, str(SCRIPT), "--serve"],
                input="\n".join(json.dumps(r) for r in requests) + "\n",
                capture_output=True, encoding="utf-8", env=env, timeout=20,
            )
            self.assertEqual(worker.returncode, 0, worker.stderr)
            responses = [json.loads(line) for line in worker.stdout.splitlines()]
            self.assertEqual([r["id"] for r in responses], [1, 2, 3])
            self.assertTrue(responses[0]["ok"])
            self.assertTrue(responses[1]["ok"])
            self.assertFalse(responses[2]["ok"])
            self.assertEqual(worker.stderr.count("model initialization diagnostic"), 1)
            for marker in ("Creating new", "native stdout diagnostic", "child diagnostic", "recognition diagnostic"):
                self.assertIn(marker, cli.stderr)
                self.assertIn(marker, worker.stderr)


if __name__ == "__main__":
    unittest.main()
