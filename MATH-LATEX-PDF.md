# Math / LaTeX support for Smart Library PDF Reader

This patch adds end-to-end math support without removing the existing Tesseract fallback.

## What changed

- Native `pdf.js` text extraction now preserves line breaks and detects common superscript/subscript placement instead of flattening every item with spaces.
- Formula-heavy native pages can request a formula OCR enhancement.
- `scripts/reader_ocr.py` now supports a persistent worker (`--serve`) so an optional math OCR model is loaded only once.
- Pix2Text can recognize formulas and return LaTeX. Tesseract remains the fallback for ordinary Russian/English/Vietnamese text.
- AI Reader is instructed to preserve formulas as `$...$` / `$$...$$`.
- AI Reader renders LaTeX locally with KaTeX.

## Install

From the project directory:

```powershell
npm install
python -m pip install pytesseract pillow pix2text
```

Tesseract itself still needs to be installed at OS level, including the language packs configured by `OCR_LANGUAGES`.

Pix2Text is optional. If it is absent or fails to initialize, OCR automatically falls back to Tesseract. Native-text PDFs still benefit from the improved text-layer extraction and KaTeX rendering.

## Recommended `.env`

```env
OCR_LANGUAGES=rus+eng+vie
TESSERACT_CMD=
MATH_OCR_ENABLED=1
MATH_OCR_DEVICE=cpu
OCR_TIMEOUT_MS=300000
```

`MATH_OCR_DEVICE=cpu` is recommended when the local Reader AI model already occupies GPU VRAM. Change it to `cuda` only if the machine has enough free VRAM.

On the first Pix2Text use, its formula models may need to be downloaded/cached. For a fully offline machine, download/cache those models beforehand.

## Restart after applying

Stop the Next.js dev server completely, then remove `.next` and start it again so the persistent OCR worker and new frontend dependency are loaded cleanly.

```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

## Behavior

- Digital PDF with a usable text layer: the browser text layer remains primary.
- Math-heavy digital page: native text is retained and recognized LaTeX formulas can be appended as a formula-only OCR supplement.
- Scanned/image-only page: Tesseract extracts the main prose; Pix2Text adds formula LaTeX when available.
- If Pix2Text is unavailable: the reader continues to work with Tesseract as before.
