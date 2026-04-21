const fs = require("fs");
const path = require("path");
const { TextDecoder } = require("util");
const { runPdfOCR } = require("./ocrService");

const TEXT_ENCODINGS = ["utf-8", "utf-16le", "windows-874"];
const THAI_CHAR_PATTERN = /[\u0E00-\u0E7F]/g;
const THAI_CONSONANT_PATTERN = /[\u0E01-\u0E2E]/;
const LATIN_CHAR_PATTERN = /[A-Za-z]/g;
const DIGIT_PATTERN = /[0-9\u0E50-\u0E59]/g;
const PARA_MARKER_PATTERN = /(?:<\s*\/?\s*PARA\s*>|&lt;\s*\/?\s*PARA\s*&gt;)/gi;

function countMatches(text, pattern) {
  return (String(text || "").match(pattern) || []).length;
}

function looksLikeMojibake(text) {
  const value = String(text || "");
  if (!value) return false;

  const badSignals =
    countMatches(value, /\uFFFD/g) +
    countMatches(value, /[\u0080-\u009F]/g) +
    countMatches(value, /\u0E40\u0E18[\u0080-\u009F]/g) +
    countMatches(value, /\u0E40\u0E19[\u0080-\u009F]/g) +
    countMatches(value, /\u0E42[\u0080-\u009F]/g);

  return badSignals >= 8 || badSignals / Math.max(value.length, 1) > 0.025;
}

function scoreDecodedText(text) {
  const value = String(text || "");
  return (
    countMatches(value, /[\u0E00-\u0E7FA-Za-z0-9]/g) -
    countMatches(value, /\uFFFD/g) * 30 -
    countMatches(value, /[\u0080-\u009F]/g) * 30 -
    countMatches(value, PARA_MARKER_PATTERN) * 8 -
    (looksLikeMojibake(value) ? 120 : 0)
  );
}

function decodeTextBuffer(buffer) {
  const candidates = [];
  const utf8Text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);

  for (const encoding of TEXT_ENCODINGS) {
    try {
      candidates.push(new TextDecoder(encoding, { fatal: false }).decode(buffer));
    } catch (_) {
      // Some Node builds may not ship every legacy decoder.
    }
  }

  candidates.push(utf8Text, buffer.toString("utf8"));
  return candidates.sort((a, b) => scoreDecodedText(b) - scoreDecodedText(a))[0] || "";
}

function stripArtificialMarkers(text) {
  return String(text || "")
    .replace(PARA_MARKER_PATTERN, "\n\n")
    .replace(/\bPARA\b/gi, " ")
    .replace(/\[(?:PAGE|\u0E2B\u0E19\u0E49\u0E32)\s*\d+\]/gi, "\n\n");
}

function normalizeText(text) {
  return stripArtificialMarkers(text)
    .normalize("NFC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasUsefulLetters(line) {
  const compact = String(line || "").replace(/\s/g, "");
  if (!compact) return false;

  const thaiCount = countMatches(compact, THAI_CHAR_PATTERN);
  const latinCount = countMatches(compact, LATIN_CHAR_PATTERN);
  const digitCount = countMatches(compact, DIGIT_PATTERN);
  const usefulCount = thaiCount + latinCount + digitCount;

  if (usefulCount < 2) return false;
  return usefulCount / compact.length >= 0.35;
}

function isLikelyOcrNoise(line) {
  const value = String(line || "").trim();
  if (!value) return true;
  if (looksLikeMojibake(value)) return true;

  const compact = value.replace(/\s/g, "");
  const thaiCount = countMatches(compact, THAI_CHAR_PATTERN);
  const latinCount = countMatches(compact, LATIN_CHAR_PATTERN);
  const digitCount = countMatches(compact, DIGIT_PATTERN);
  const symbolCount = compact.length - thaiCount - latinCount - digitCount;

  if (thaiCount === 0 && latinCount > 0 && symbolCount > latinCount) return true;
  if (
    thaiCount === 0 &&
    latinCount > 0 &&
    digitCount === 0 &&
    compact.length <= 8 &&
    value === value.toUpperCase()
  ) {
    return true;
  }
  if (thaiCount <= 1 && symbolCount >= Math.max(6, latinCount + digitCount)) return true;

  return false;
}

function cleanOcrLine(line) {
  return normalizeText(line)
    .replace(/[|\\/~`^*_+=<>[\]{}]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:!?])([^\s])/g, "$1 $2")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function polishThaiOcrText(text) {
  return normalizeText(text)
    .replace(/([\u0E01-\u0E2E])\u0E4D\u0E32/g, "$1\u0E33")
    .replace(/\u0E40\u0E40/g, "\u0E41")
    .replace(/([\u0E46\u0E2F])\1+/g, "$1")
    .replace(/[ ]+([\u0E30\u0E32\u0E34\u0E35\u0E36\u0E37\u0E38\u0E39\u0E40\u0E41\u0E42\u0E43\u0E44])/g, "$1")
    .replace(/([\u0E40\u0E41\u0E42\u0E43\u0E44])\s+([\u0E01-\u0E2E])/g, "$1$2")
    .replace(/([\u0E01-\u0E2E])\s+([\u0E48\u0E49\u0E4A\u0E4B\u0E4C])/g, "$1$2")
    .replace(/\s{2,}/g, " ");
}

function cleanOcrText(text) {
  const lines = normalizeText(text)
    .split("\n")
    .map(cleanOcrLine)
    .filter(Boolean)
    .filter(hasUsefulLetters)
    .filter((line) => !isLikelyOcrNoise(line));

  return polishThaiOcrText(lines.join("\n"));
}

function sanitizeBookText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return "";

  if (looksLikeMojibake(normalized)) {
    return cleanOcrText(normalized);
  }

  return normalized
    .split("\n")
    .map((line) => cleanOcrLine(line))
    .filter((line) => line && !isLikelyOcrNoise(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitTextToPages(text, chunkSize = 1800) {
  const cleanText = sanitizeBookText(text);
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
  const text = decodeTextBuffer(fs.readFileSync(filePath));
  const fullText = sanitizeBookText(text);

  return {
    sourceType: "txt",
    fullText,
    pages: splitTextToPages(fullText),
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
    const parts = [];

    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        parts.push(extractTextFromJsonValue(value[key]));
      }
    }

    if (parts.some(Boolean)) return parts.filter(Boolean).join("\n\n");

    return Object.values(value)
      .map(extractTextFromJsonValue)
      .filter(Boolean)
      .join("\n\n");
  }

  return "";
}

async function parseJsonFile(filePath) {
  const raw = decodeTextBuffer(fs.readFileSync(filePath));
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON file: ${error.message}`);
  }

  const fullText = sanitizeBookText(extractTextFromJsonValue(parsed));

  if (!fullText) {
    throw new Error("No readable text was found in the JSON file");
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
      const pageText = sanitizeBookText(
        textContent.items.map((item) => ("str" in item ? item.str : "")).join(" "),
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

  const joined = sanitizeBookText(pageTexts.join("\n"));
  if (!joined) return true;
  if (looksLikeMojibake(joined)) return true;

  const avgLength =
    pageTexts.reduce((sum, page) => sum + sanitizeBookText(page).length, 0) /
    pageTexts.length;

  return avgLength < 80;
}

async function parsePdfFile(filePath) {
  console.log("PDF STEP 1: try text extraction with pdfjs-dist");

  let pageTexts = [];
  try {
    pageTexts = await extractPdfTextByPage(filePath);
  } catch (err) {
    console.error("PDF.js extraction error:", err);
  }

  const cleanPages = pageTexts.map((page) => sanitizeBookText(page)).filter(Boolean);

  if (!looksLikeScannedPdf(cleanPages)) {
    const fullText = sanitizeBookText(cleanPages.join("\n\n"));
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
    const rawPages = Array.isArray(ocrResult?.pages) ? ocrResult.pages : [];
    const ocrPages = rawPages.map((page) => cleanOcrText(page)).filter(Boolean);
    const fullText = cleanOcrText(rawPages.length ? rawPages.join("\n\n") : ocrResult?.text || "");

    if (!fullText) {
      throw new Error("Unable to read text from this PDF");
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
      const fullText = sanitizeBookText(cleanPages.join("\n\n"));
      return {
        sourceType: "pdf",
        fullText,
        pages: cleanPages,
        parseMethod: "pdfjs-partial",
      };
    }

    const pdfError = new Error(`Unable to read text from this PDF: ${ocrErr.message}`);
    pdfError.statusCode = 400;
    pdfError.code = "PDF_TEXT_EXTRACTION_FAILED";
    throw pdfError;
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

  throw new Error("Only .txt, .json, and .pdf files are supported");
}

module.exports = {
  parseBookFile,
  cleanOcrText,
  extractTextFromJsonValue,
  normalizeText,
  sanitizeBookText,
  looksLikeMojibake,
};
