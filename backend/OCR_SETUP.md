OCR support for scanned PDFs and images

This project supports OCR for scanned PDF uploads and scanned image uploads
(`.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`, `.tif`, `.tiff`). OCR text is saved
as the book text, so the existing reader and TTS flow can read it.

What the backend expects
- Python 3 available as `python` or `py`
- Tesseract OCR installed and available on `PATH`, or configured with
  `TESSERACT_COMMAND`
- Thai language data installed for Tesseract
- Poppler installed and available on `PATH` when using the Python PDF OCR path
- Python packages:
  `python -m pip install pdf2image pillow pytesseract`

How it works
- If a PDF already contains embedded text, the backend uses that text directly.
- If the PDF has little or no embedded text, the backend tries Python OCR through `backend/services/ocr_pdf.py` when `OCR_PYTHON_COMMAND` is configured, then falls back to native PDF rendering plus Tesseract.
- Image uploads are sent directly to Tesseract OCR.
- If the native Tesseract command is unavailable, the backend falls back to
  `tesseract.js` and local `.traineddata` files in `backend/`.

Optional environment variables
- `ENABLE_OCR=true` to enable OCR for scanned PDFs and images
- `OCR_PYTHON_COMMAND` to override which Python command should run the OCR script
  (for example `python`, `py`, or `python3`). On Windows, Python OCR is skipped
  unless this is set.
- `TESSERACT_COMMAND` to override the Tesseract binary path, for example
  `C:\Program Files\Tesseract-OCR\tesseract.exe`
- `OCR_LANG` to override OCR languages. Default: `tha+eng`
- `OCR_PSM` to override Tesseract page segmentation mode. Default: `3`
- `TESSERACT_JS_LANG_PATH` to override the folder containing `.traineddata`
  files for the `tesseract.js` fallback
