require("dotenv").config({ quiet: true });

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { createCanvas } = require("@napi-rs/canvas");

process.env.ENABLE_OCR = process.env.ENABLE_OCR || "true";

const { runImageOCR } = require("../ocrService");

const tesseractCommand =
  process.env.TESSERACT_COMMAND ||
  (process.platform === "win32" ? "C:\\Program Files\\Tesseract-OCR\\tesseract.exe" : "tesseract");
const pythonCommand = String(process.env.OCR_PYTHON_COMMAND || "").trim();
const ocrEngine = String(process.env.OCR_ENGINE || "auto").trim().toLowerCase() || "auto";
const requiredLangs = String(process.env.OCR_LANG || "tha+eng")
  .split(/[+,]/)
  .map((lang) => lang.trim())
  .filter(Boolean);

function execFileText(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: "utf8", windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        error.stderr = stderr;
        return reject(error);
      }
      resolve(`${stdout || ""}${stderr || ""}`);
    });
  });
}

async function checkTesseract() {
  const version = await execFileText(tesseractCommand, ["--version"]);
  console.log(`OK tesseract: ${version.split(/\r?\n/)[0]}`);

  const langsOutput = await execFileText(tesseractCommand, ["--list-langs"]);
  const installedLangs = new Set(langsOutput.split(/\s+/).map((item) => item.trim()).filter(Boolean));
  const missingLangs = requiredLangs.filter((lang) => !installedLangs.has(lang));

  if (missingLangs.length) {
    throw new Error(`Missing Tesseract language data: ${missingLangs.join(", ")}`);
  }

  console.log(`OK tesseract languages: ${requiredLangs.join("+")}`);
}

async function checkPython() {
  if (!pythonCommand) {
    console.log("SKIP python OCR: OCR_PYTHON_COMMAND is not set; backend will use Tesseract fallback");
    return;
  }

  try {
    const version = await execFileText(pythonCommand, ["--version"]);
    console.log(`OK python OCR command: ${version.trim()}`);
  } catch (error) {
    const message = `Python OCR command is not available: ${error.message}`;
    if (ocrEngine === "paddle" || ocrEngine === "paddleocr") {
      throw new Error(message);
    }
    console.warn(`WARN ${message}; backend will use Tesseract fallback`);
  }
}

function createTestImage(filePath) {
  const canvas = createCanvas(520, 180);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#111111";
  context.font = "52px Arial";
  context.fillText("Read Voice 123", 48, 105);
  fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
}

async function checkImageOcr() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "read-voice-ocr-"));
  const imagePath = path.join(tempDir, "ocr-test.png");

  try {
    createTestImage(imagePath);
    const result = await runImageOCR(imagePath);
    const text = String(result.text || "").replace(/\s+/g, " ").trim();

    if (!/read/i.test(text) || !/voice/i.test(text) || !/123/.test(text)) {
      throw new Error(`OCR returned unexpected text: ${text || "(empty)"}`);
    }

    console.log(`OK image OCR: ${text}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  await checkTesseract();
  await checkPython();
  await checkImageOcr();
}

main().catch((error) => {
  console.error(`OCR runtime check failed: ${error.message}`);
  process.exitCode = 1;
});
