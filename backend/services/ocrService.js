const { execFile } = require("child_process");
const path = require("path");

function runPdfOCR(filePath) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, "..", "ocr_pdf.py");

    execFile(
      "python",
      [scriptPath, filePath],
      {
        timeout: 300000,
        maxBuffer: 50 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (stderr) {
          console.warn("OCR stderr:", stderr);
        }

        if (error) {
          console.error("OCR exec error:", error);
          return reject(new Error("OCR ทำงานไม่สำเร็จหรือใช้เวลานานเกินไป"));
        }

        const raw = String(stdout || "").trim();
        if (!raw) {
          return reject(new Error("OCR ไม่ได้ข้อความจากไฟล์ PDF"));
        }

        try {
          const parsed = JSON.parse(raw);

          if (
            parsed &&
            (typeof parsed.text === "string" || Array.isArray(parsed.pages))
          ) {
            return resolve({
              text: parsed.text || "",
              pages: Array.isArray(parsed.pages) ? parsed.pages : [],
            });
          }

          return reject(new Error("OCR ส่งข้อมูลกลับมาไม่ถูกต้อง"));
        } catch (e) {
          return reject(new Error("OCR ส่ง JSON กลับมาไม่สำเร็จ"));
        }
      }
    );
  });
}

module.exports = {
  runPdfOCR,
};