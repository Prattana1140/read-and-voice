FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    poppler-utils \
    tesseract-ocr \
    tesseract-ocr-tha \
    tesseract-ocr-eng \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

COPY backend/ ./

RUN pip3 install --no-cache-dir pdf2image pillow pytesseract

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=10000

CMD ["npm", "start"]
