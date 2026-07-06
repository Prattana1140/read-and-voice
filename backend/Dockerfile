FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ghostscript \
    libgl1 \
    libglib2.0-0 \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-tha \
    tesseract-ocr-eng \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir --upgrade pip setuptools wheel \
  && /opt/venv/bin/pip install --no-cache-dir -r requirements-ocr.txt

RUN PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK=True /opt/venv/bin/python -c "from paddleocr import PaddleOCR; PaddleOCR(use_doc_orientation_classify=False, use_doc_unwarping=False, use_textline_orientation=True, text_detection_model_name='PP-OCRv5_mobile_det', text_recognition_model_name='th_PP-OCRv5_mobile_rec')"

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=10000
ENV PATH="/opt/venv/bin:$PATH"
ENV OCR_PYTHON_COMMAND=python3
ENV OCR_ENGINE=auto
ENV PADDLEOCR_LANG=th

CMD ["npm", "start"]
