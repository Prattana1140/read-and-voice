const fs = require("fs");
const path = require("path");
const { runPdfOCR } = require("./ocrService");

function normalizeText(text) {
  return String(text || "")
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasUsefulLetters(line) {
  const compact = line.replace(/\s/g, "");
  if (!compact) return false;

  const thaiCount = (compact.match(/[\u0E00-\u0E7F]/g) || []).length;
  const latinCount = (compact.match(/[A-Za-z]/g) || []).length;
  const digitCount = (compact.match(/[0-9๐-๙]/g) || []).length;
  const usefulCount = thaiCount + latinCount + digitCount;

  if (usefulCount < 2) return false;

  // Preserve Thai, English, and mixed Thai-English lines while dropping OCR dust.
  return usefulCount / compact.length >= 0.35;
}

function cleanOcrLine(line) {
  return String(line || "")
    .normalize("NFC")
    .replace(/\u0000/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[|\\/~`^*_+=<>[\]{}]{2,}/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])([^\s])/g, "$1 $2")
    .trim();
}

function polishThaiOcrText(text) {
  return normalizeText(text)
    .replace(/([ก-ฮ])ํา/g, "$1ำ")
    .replace(/เเ/g, "แ")
    .replace(/([ๆฯ])\1+/g, "$1")
    .replace(/[ ]+([ะาิีึืุูเแโใไ])/g, "$1")
    .replace(/([เแโใไ])\s+([ก-ฮ])/g, "$1$2");
}

function cleanOcrText(text) {
  const lines = normalizeText(text)
    .split("\n")
    .map(cleanOcrLine)
    .filter(Boolean)
    .filter(hasUsefulLetters);

  return polishThaiOcrText(lines.join("\n"));
}

function splitTextToPages(text, chunkSize = 1800) {
  const cleanText = normalizeText(text);
  if (!cleanText) return [];

  const paragraphs = cleanText
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);

  const pages = [];
  let currentPage = "";

  for (const paragraph of paragraphs) {
    const next = currentPage ? `${currentPage}\n\n${paragraph}` : paragraph;

    if (next.length > chunkSize && currentPage) {
      pages.push(currentPage);
      currentPage = paragraph;
    } else {
      currentPage = next;
    }
  }

  if (currentPage) pages.push(currentPage);
  return pages.length ? pages : [cleanText];
}

async function parseTxtFile(filePath) {
  const text = fs.readFileSync(filePath, "utf8");

  return {
    sourceType: "txt",
    fullText: normalizeText(text),
    pages: splitTextToPages(text),
    parseMethod: "plain-text",
  };
}

function extractTextFromJsonValue(value) {
  if (value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(extractTextFromJsonValue).filter(Boolean).join("\n\n");
  }

  if (typeof value === "object") {
    const preferredKeys = [
      "title",
      "chapter",
      "heading",
      "name",
      "content",
      "text",
      "body",
      "paragraph",
      "paragraphs",
      "page_text",
      "pages",
      "chapters",
    ];

    const objectValue = value;
    const parts = [];

    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(objectValue, key)) {
        parts.push(extractTextFromJsonValue(objectValue[key]));
      }
    }

    if (parts.some(Boolean)) return parts.filter(Boolean).join("\n\n");

    return Object.values(objectValue)
      .map(extractTextFromJsonValue)
      .filter(Boolean)
      .join("\n\n");
  }

  return "";
}

async function parseJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`ไฟล์ JSON ไม่ถูกต้อง: ${error.message}`);
  }

  const fullText = normalizeText(extractTextFromJsonValue(parsed));

  if (!fullText) {
    throw new Error("ไม่พบข้อความที่สามารถอ่านได้ในไฟล์ JSON");
  }

  return {
    sourceType: "json",
    fullText,
    pages: splitTextToPages(fullText),
    parseMethod: "json",
  };
}

async function extractPdfTextByPage(filePath) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(filePath));

  const loadingTask = getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const pages = [];

  try {
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo);
      const textContent = await page.getTextContent();

      const pageText = normalizeText(
        textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
      );

      pages.push(pageText);
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  return pages;
}

function looksLikeScannedPdf(pageTexts) {
  if (!Array.isArray(pageTexts) || pageTexts.length === 0) return true;

  const joined = normalizeText(pageTexts.join("\n"));
  if (!joined) return true;

  const avgLength =
    pageTexts.reduce((sum, page) => sum + normalizeText(page).length, 0) /
    pageTexts.length;

  if (avgLength < 80) return true;

  const replacementChars = (joined.match(/�/g) || []).length;
  return replacementChars > 20;
}

async function parsePdfFile(filePath) {
  console.log("PDF STEP 1: try text extraction with pdfjs-dist");

  let pageTexts = [];
  try {
    pageTexts = await extractPdfTextByPage(filePath);
  } catch (err) {
    console.error("PDF.js extraction error:", err);
  }

  const cleanPages = pageTexts.map((page) => normalizeText(page)).filter(Boolean);

  if (!looksLikeScannedPdf(cleanPages)) {
    const fullText = normalizeText(cleanPages.join("\n\n"));
    return {
      sourceType: "pdf",
      fullText,
      pages: cleanPages,
      parseMethod: "pdfjs-dist",
    };
  }

  console.log("PDF STEP 2: fallback OCR");

  try {
    const ocrResult = await runPdfOCR(filePath);

    const ocrPages = Array.isArray(ocrResult?.pages)
      ? ocrResult.pages.map((page) => cleanOcrText(page)).filter(Boolean)
      : splitTextToPages(cleanOcrText(ocrResult?.text || ""));

    const fullText = cleanOcrText(
      Array.isArray(ocrResult?.pages)
        ? ocrResult.pages.join("\n\n")
        : ocrResult?.text || "",
    );

    if (!fullText) {
      throw new Error("ไม่สามารถอ่านข้อความจาก PDF ได้");
    }

    return {
      sourceType: "pdf",
      fullText,
      pages: ocrPages.length ? ocrPages : splitTextToPages(fullText),
      parseMethod: "ocr-fallback",
    };
  } catch (ocrErr) {
    console.error("OCR failed:", ocrErr.message);

    if (cleanPages.length > 0) {
      const fullText = normalizeText(cleanPages.join("\n\n"));
      return {
        sourceType: "pdf",
        fullText,
        pages: cleanPages,
        parseMethod: "pdfjs-partial",
      };
    }

    throw new Error(`ไม่สามารถประมวลผล PDF ได้: ${ocrErr.message}`);
  }
}

async function parseBookFile(filePath, mimeType, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();

  if (ext === ".txt" || mimeType === "text/plain") {
    return parseTxtFile(filePath);
  }

  if (ext === ".json" || mimeType === "application/json") {
    return parseJsonFile(filePath);
  }

  if (ext === ".pdf" || mimeType === "application/pdf") {
    return parsePdfFile(filePath);
  }

  throw new Error("รองรับเฉพาะไฟล์ .txt และ .pdf");
}

module.exports = {
  parseBookFile,
  cleanOcrText,
  extractTextFromJsonValue,
  normalizeText,
};
