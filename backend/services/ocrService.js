const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

const DEFAULT_TESSERACT_COMMAND =
  process.env.TESSERACT_COMMAND || "C:\\Program Files\\Tesseract-OCR\\tesseract.exe";
const DEFAULT_OCR_LANG = process.env.OCR_LANG || "tha+eng";

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

function execFileAsync(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: "utf8", ...options }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        return reject(error);
      }

      resolve({
        stdout: String(stdout || ""),
        stderr: String(stderr || ""),
      });
    });
  });
}

async function renderPdfToPngPages(filePath) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { createCanvas } = require("@napi-rs/canvas");

  const tempDir = path.join(__dirname, "..", "uploads", "ocr-temp");
  fs.mkdirSync(tempDir, { recursive: true });

  const data = new Uint8Array(fs.readFileSync(filePath));
  const loadingTask = getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const imagePaths = [];

  try {
    for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
      const page = await pdf.getPage(pageNo);
      const viewport = page.getViewport({ scale: 2.4 });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext("2d");

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      const imagePath = path.join(tempDir, `page.${pageNo}.png`);
      fs.writeFileSync(imagePath, canvas.toBuffer("image/png"));
      imagePaths.push(imagePath);
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }

  return imagePaths;
}

async function runTesseractCliOCR(filePath) {
  const imagePaths = await renderPdfToPngPages(filePath);
  const pages = [];

  for (let i = 0; i < imagePaths.length; i += 1) {
    const { stdout } = await execFileAsync(
      DEFAULT_TESSERACT_COMMAND,
      [imagePaths[i], "stdout", "-l", DEFAULT_OCR_LANG, "--psm", "3"],
      {
        timeout: 2 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    pages.push(normalizeOcrText(stdout));
    console.log(`OCR page ${i + 1}/${imagePaths.length}`);
  }

  return {
    text: pages.filter(Boolean).join("\n\n"),
    pages,
  };
}

async function runPythonOCR(filePath) {
  const scriptPath = path.join(__dirname, "ocr_pdf.py");
  const pythonCommand = process.env.OCR_PYTHON_COMMAND || "python";

  const { stdout, stderr } = await execFileAsync(
    pythonCommand,
    [scriptPath, filePath],
    {
      timeout: 30 * 60 * 1000,
      maxBuffer: 200 * 1024 * 1024,
    },
  );

  if (stderr) {
    console.warn("OCR stderr:", stderr);
  }

  const raw = normalizeOcrText(stdout);
  if (!raw) {
    throw new Error("OCR ไม่ได้ข้อความจากไฟล์ PDF");
  }

  const parsed = JSON.parse(raw);

  if (parsed?.error && !parsed.text && !parsed.pages?.length) {
    throw new Error(parsed.error);
  }

  if (parsed && (typeof parsed.text === "string" || Array.isArray(parsed.pages))) {
    return {
      text: normalizeOcrText(parsed.text || ""),
      pages: Array.isArray(parsed.pages) ? parsed.pages.map(normalizeOcrText) : [],
    };
  }

  throw new Error("OCR ส่งข้อมูลกลับมาไม่ถูกต้อง");
}

function runPdfOCR(filePath) {
  return runPythonOCR(filePath).catch(async (pythonError) => {
    console.warn("Python OCR failed, trying Tesseract CLI:", pythonError.message);

    try {
      return await runTesseractCliOCR(filePath);
    } catch (tesseractError) {
      console.error("Tesseract CLI OCR failed:", tesseractError);
      throw new Error(
        `OCR ทำงานไม่สำเร็จ: ${tesseractError.message || pythonError.message}`,
      );
    }
  });
}

module.exports = {
  runPdfOCR,
};
