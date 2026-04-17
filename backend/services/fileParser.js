const fs = require("fs");
const path = require("path");
const { runPdfOCR } = require("./ocrService");

function normalizeText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
      const page = await pdf.getPage(pageNo);
      const textContent = await page.getTextContent();

      const pageText = normalizeText(
        textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
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
    pageTexts.reduce((sum, p) => sum + normalizeText(p).length, 0) / pageTexts.length;

  // ถ้าค่าเฉลี่ยต่อหน้าน้อยมาก มักเป็น PDF สแกนหรือดึงข้อความไม่ได้
  if (avgLength < 80) return true;

  const weirdChars = (joined.match(/�/g) || []).length;
  if (weirdChars > 20) return true;

  return false;
}

async function parsePdfFile(filePath) {
  console.log("PDF STEP 1: try text extraction with pdfjs-dist");

  let pageTexts = [];
  try {
    pageTexts = await extractPdfTextByPage(filePath);
  } catch (err) {
    console.error("PDF.js extraction error:", err);
  }

  const cleanPages = pageTexts.map((p) => normalizeText(p)).filter(Boolean);

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

  // ✅ เพิ่ม try-catch รอบ OCR
  try {
    const ocrResult = await runPdfOCR(filePath);

    const ocrPages = Array.isArray(ocrResult?.pages)
      ? ocrResult.pages.map((p) => normalizeText(p)).filter(Boolean)
      : splitTextToPages(ocrResult?.text || "");

    const fullText = normalizeText(
      Array.isArray(ocrResult?.pages)
        ? ocrResult.pages.join("\n\n")
        : ocrResult?.text || ""
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

    // ✅ ถ้า OCR ล้มเหลว ให้ใช้ข้อความที่ได้จาก pdfjs แทน (แม้จะน้อย)
    if (cleanPages.length > 0) {
      const fullText = normalizeText(cleanPages.join("\n\n"));
      return {
        sourceType: "pdf",
        fullText,
        pages: cleanPages,
        parseMethod: "pdfjs-partial",
      };
    }

    throw new Error("ไม่สามารถประมวลผล PDF ได้: " + ocrErr.message);
  }
}

async function parseBookFile(filePath, mimeType, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();

  if (ext === ".txt" || mimeType === "text/plain") {
    return parseTxtFile(filePath);
  }

  if (ext === ".pdf" || mimeType === "application/pdf") {
    return parsePdfFile(filePath);
  }

  throw new Error("รองรับเฉพาะไฟล์ .txt และ .pdf");
}

module.exports = {
  parseBookFile,
};