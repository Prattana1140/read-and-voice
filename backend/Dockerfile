FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ghostscript \
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
  && /opt/venv/bin/pip install --no-cache-dir pdf2image pillow pytesseract

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=10000
ENV PATH="/opt/venv/bin:$PATH"

CMD ["npm", "start"]
