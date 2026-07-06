OCR support for scanned PDFs and images

This project supports OCR for scanned PDF uploads and scanned image uploads
(`.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`, `.tif`, `.tiff`). OCR text is saved
as the book text, so the existing reader and TTS flow can read it.

What the backend expects
- Python 3 available as `python` or `py`
- PaddleOCR installed for the best Thai OCR quality
- Tesseract OCR installed and available on `PATH`, or configured with
  `TESSERACT_COMMAND` as the fallback OCR engine
- Thai language data installed for Tesseract fallback
- Poppler installed and available on `PATH` when using the Python PDF OCR path
- Python packages:
  `python -m pip install -r requirements-ocr.txt`

Recommended local setup
- Windows:
  - Install Python 3.11 or newer.
  - Install Poppler and make sure `pdftoppm` is available on `PATH`.
  - Install Tesseract OCR plus Thai/English language data for fallback.
  - Run `python -m pip install -r requirements-ocr.txt` from `backend/`.
  - Set `ENABLE_OCR=true`, `OCR_PYTHON_COMMAND=python`, `OCR_ENGINE=auto`.
- Linux/macOS:
  - Install Poppler and Tesseract, for example `poppler-utils`, `tesseract-ocr`,
    `tesseract-ocr-tha`, and `tesseract-ocr-eng`.
  - Run `python3 -m pip install -r requirements-ocr.txt` from `backend/`.
  - Set `ENABLE_OCR=true`, `OCR_PYTHON_COMMAND=python3`, `OCR_ENGINE=auto`.

Production setup
- The provided Dockerfile installs Poppler, Tesseract, and Python OCR packages
  from `requirements-ocr.txt`.
- Configure the deployment with `ENABLE_OCR=true`.
- The Docker image sets `OCR_PYTHON_COMMAND=python3`, `OCR_ENGINE=auto`, and
  `PADDLEOCR_LANG=th` by default.

How it works
- If a PDF already contains embedded text, the backend uses that text directly.
- If the PDF has little or no embedded text, the backend tries Python OCR through
  `backend/services/ocr_pdf.py` when `OCR_PYTHON_COMMAND` is configured.
- Python OCR uses PaddleOCR first when available, then falls back to Tesseract.
- Image uploads also use the same Python OCR path first, then fall back to
  native Tesseract and `tesseract.js`.
- If the native Tesseract command is unavailable, the backend falls back to
  `tesseract.js` and local `.traineddata` files in `backend/`.

Optional environment variables
- `ENABLE_OCR=true` to enable OCR for scanned PDFs and images
- `OCR_PYTHON_COMMAND` to override which Python command should run the OCR script
  (for example `python`, `py`, or `python3`). On Windows, Python OCR is skipped
  unless this is set.
- `OCR_ENGINE` controls the Python OCR engine. Use `auto` for PaddleOCR first
  and Tesseract fallback, `paddle` to require PaddleOCR, or `tesseract` to skip
  PaddleOCR. Default: `auto`.
- `PADDLEOCR_LANG` controls PaddleOCR language. Default: `th`.
- `PADDLEOCR_MIN_SCORE` filters low-confidence PaddleOCR text. Default: `0.35`.
- `PADDLEOCR_DPI` controls PDF render DPI for PaddleOCR. Default: `260`.
- `TESSERACT_COMMAND` to override the Tesseract binary path, for example
  `C:\Program Files\Tesseract-OCR\tesseract.exe`
- `OCR_LANG` to override OCR languages. Default: `tha+eng`
- `OCR_PSM` to override Tesseract page segmentation mode. Default: `3`
- `TESSERACT_JS_LANG_PATH` to override the folder containing `.traineddata`
  files for the `tesseract.js` fallback
