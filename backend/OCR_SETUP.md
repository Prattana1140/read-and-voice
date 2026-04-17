OCR support for scanned PDFs

This project now supports a fallback OCR path for scanned PDF uploads.

What the backend expects
- Python 3 available as `python` or `py`
- Tesseract OCR installed and available on `PATH`
- Thai language data installed for Tesseract
- Python packages:
  `python -m pip install pymupdf pillow pytesseract`

How it works
- If a PDF already contains embedded text, the backend uses that text directly.
- If the PDF has little or no embedded text, the backend runs OCR page by page using `backend/services/ocr_pdf.py`.

Optional environment variables
- `OCR_PYTHON_COMMAND` to override which Python command should run the OCR script
- `OCR_LANG` to override OCR languages. Default: `tha+eng`
