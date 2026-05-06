const { execFile } = require("child_process");
const fs = require("fs");
const path = require("path");

const DEFAULT_TESSERACT_COMMAND =
  process.env.TESSERACT_COMMAND ||
  (process.platform === "win32" ? "C:\\Program Files\\Tesseract-OCR\\tesseract.exe" : "tesseract");
const DEFAULT_OCR_LANG = process.env.OCR_LANG || "tha+eng";
const OCR_PSM = process.env.OCR_PSM || "3";
const OCR_PAGE_TIMEOUT_MS = Number(process.env.OCR_PAGE_TIMEOUT_MS || 120000);
const OCR_CONCURRENCY = Math.max(1, Math.min(6, Number(process.env.OCR_CONCURRENCY || 3)));
const OCR_RENDER_SCALE = Math.max(1.2, Math.min(2.8, Number(process.env.OCR_RENDER_SCALE || 2)));
const ENABLE_OCR = /^(1|true|yes)$/i.test(process.env.ENABLE_OCR || process.env.ENABLE_PDF_OCR || "");
const TESSERACT_JS_LANG_PATH = process.env.TESSERACT_JS_LANG_PATH || path.join(__dirname, "..");
const TESSERACT_JS_CACHE_PATH =
  process.env.TESSERACT_JS_CACHE_PATH || path.join(__dirname, "..", "uploads", "ocr-cache");

function normalizeOcrText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u0000/g, "")
    .trim();
}

function assertOcrEnabled() {
  if (!ENABLE_OCR) {
    const error = new Error(
      "OCR is disabled. Set ENABLE_OCR=true (or ENABLE_PDF_OCR=true) in the backend environment.",
    );
    error.code = "OCR_DISABLED";
    error.statusCode = 400;
    throw error;
  }
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

async function runTesseractCliOnImage(imagePath) {
  const { stdout } = await execFileAsync(
    DEFAULT_TESSERACT_COMMAND,
    [imagePath, "stdout", "-l", DEFAULT_OCR_LANG, "--psm", OCR_PSM],
    {
      windowsHide: true,
      timeout: OCR_PAGE_TIMEOUT_MS,
      maxBuffer: 25 * 1024 * 1024,
    },
  );

  return normalizeOcrText(stdout);
}

function getOcrLanguages() {
  return DEFAULT_OCR_LANG.split(/[+,]/)
    .map((lang) => lang.trim())
    .filter(Boolean);
}

async function runTesseractJsOnImages(imagePaths) {
  const { createWorker } = require("tesseract.js");
  const pages = [];
  let worker;

  fs.mkdirSync(TESSERACT_JS_CACHE_PATH, { recursive: true });

  try {
    worker = await createWorker(getOcrLanguages(), 1, {
      cachePath: TESSERACT_JS_CACHE_PATH,
      gzip: false,
      langPath: TESSERACT_JS_LANG_PATH,
    });

    await worker.setParameters({
      tessedit_pageseg_mode: OCR_PSM,
    });

    for (let i = 0; i < imagePaths.length; i += 1) {
      const result = await worker.recognize(imagePaths[i]);
      pages.push(normalizeOcrText(result?.data?.text || ""));
      console.log(`Tesseract.js OCR page ${i + 1}/${imagePaths.length}`);
    }
  } finally {
    if (worker) await worker.terminate();
  }

  return {
    text: pages.filter(Boolean).join("\n\n"),
    pages,
  };
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runNext() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => runNext()),
  );

  return results;
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
      const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
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

  try {
    const pages = await mapWithConcurrency(
      imagePaths,
      OCR_CONCURRENCY,
      async (imagePath, index) => {
        const text = await runTesseractCliOnImage(imagePath);
        console.log(`OCR page ${index + 1}/${imagePaths.length}`);
        return text;
      },
    );

    return {
      text: pages.filter(Boolean).join("\n\n"),
      pages,
    };
  } catch (cliError) {
    console.warn("Tesseract CLI OCR failed, retrying sequentially:", cliError.message);

    try {
      const pages = [];
      for (let i = 0; i < imagePaths.length; i += 1) {
        pages.push(await runTesseractCliOnImage(imagePaths[i]));
        console.log(`OCR page ${i + 1}/${imagePaths.length}`);
      }

      return {
        text: pages.filter(Boolean).join("\n\n"),
        pages,
      };
    } catch (sequentialError) {
      console.warn("Tesseract CLI OCR failed, trying Tesseract.js:", sequentialError.message);
      return runTesseractJsOnImages(imagePaths);
    }
  }
}

async function runImageOCR(filePath) {
  assertOcrEnabled();

  try {
    let text = "";

    try {
      text = await runTesseractCliOnImage(filePath);
    } catch (cliError) {
      console.warn("Tesseract CLI image OCR failed, trying Tesseract.js:", cliError.message);
      const jsResult = await runTesseractJsOnImages([filePath]);
      text = jsResult.text;
    }

    if (!text) {
      const error = new Error("OCR did not find readable text in this image.");
      error.code = "OCR_EMPTY_RESULT";
      throw error;
    }

    return {
      text,
      pages: [text],
    };
  } catch (error) {
    console.error("Image OCR failed:", error);
    const wrapped = new Error(`Image OCR failed: ${error.message}`);
    wrapped.code = error.code || "IMAGE_OCR_FAILED";
    wrapped.statusCode = error.statusCode || 400;
    throw wrapped;
  }
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
  if (!ENABLE_OCR) {
    return Promise.reject(
      new Error(
        "PDF นี้ไม่มีข้อความที่ดึงออกมาได้ และระบบ OCR ยังไม่ได้เปิดใช้งานบนเซิร์ฟเวอร์",
      ),
    );
  }

  return runPythonOCR(filePath).catch(async (pythonError) => {
    console.warn("Python OCR failed:", pythonError.message);

    if (!DEFAULT_TESSERACT_COMMAND) {
      throw new Error(
        `OCR ทำงานไม่สำเร็จ: ${pythonError.message}. ยังไม่ได้ตั้งค่า TESSERACT_COMMAND`,
      );
    }

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
  runImageOCR,
  runPdfOCR,
};
