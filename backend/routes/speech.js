const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const multer = require("multer");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.STT_MAX_UPLOAD_BYTES || 8 * 1024 * 1024),
  },
  fileFilter: (_req, file, cb) => {
    if (/^audio\//i.test(file.mimetype || "")) return cb(null, true);
    return cb(new Error("รองรับเฉพาะไฟล์เสียง"));
  },
});

function extensionForMime(mimeType = "") {
  if (/webm/i.test(mimeType)) return ".webm";
  if (/ogg/i.test(mimeType)) return ".ogg";
  if (/mpeg|mp3/i.test(mimeType)) return ".mp3";
  if (/wav/i.test(mimeType)) return ".wav";
  if (/mp4|m4a/i.test(mimeType)) return ".m4a";
  return ".audio";
}

function parseArgsTemplate(template, inputPath, language) {
  if (!template) return [inputPath];
  return template
    .split(/\s+/)
    .filter(Boolean)
    .map((arg) =>
      arg
        .replaceAll("{input}", inputPath)
        .replaceAll("{language}", language)
        .replaceAll("{lang}", language),
    );
}

function execFileText(command, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        encoding: "utf8",
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      },
      (error, stdout, stderr) => {
        if (error) {
          error.stderr = stderr;
          reject(error);
          return;
        }

        resolve(String(stdout || "").trim());
      },
    );
  });
}

function parseTranscript(stdout) {
  const text = String(stdout || "").trim();
  if (!text) return "";

  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "string") return parsed.trim();
    if (typeof parsed.text === "string") return parsed.text.trim();
    if (typeof parsed.transcript === "string") return parsed.transcript.trim();
  } catch {
    // Plain text output is the most portable contract for local STT commands.
  }

  return text;
}

router.get("/status", (_req, res) => {
  const configured = Boolean(process.env.STT_COMMAND);
  return res.json({
    configured,
    engine: configured ? "local-command" : "not-configured",
    max_upload_bytes: Number(process.env.STT_MAX_UPLOAD_BYTES || 8 * 1024 * 1024),
  });
});

router.post("/transcribe", upload.single("audio"), async (req, res) => {
  const command = process.env.STT_COMMAND;
  if (!command) {
    return res.status(503).json({
      message:
        "ยังไม่ได้ตั้งค่า STT ฝั่งเซิร์ฟเวอร์ ให้ตั้ง STT_COMMAND/STT_ARGS เพื่อใช้ engine ฟรีที่รันเอง",
      code: "STT_NOT_CONFIGURED",
    });
  }

  if (!req.file?.buffer?.length) {
    return res.status(400).json({ message: "ไม่พบไฟล์เสียง" });
  }

  const language = String(req.body?.language || process.env.STT_LANGUAGE || "th").trim() || "th";
  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "read-voice-stt-"));
  const inputPath = path.join(tempDir, `command${extensionForMime(req.file.mimetype)}`);

  try {
    await fs.promises.writeFile(inputPath, req.file.buffer);
    const args = parseArgsTemplate(process.env.STT_ARGS, inputPath, language);
    const stdout = await execFileText(
      command,
      args,
      Number(process.env.STT_TIMEOUT_MS || 30000),
    );
    const transcript = parseTranscript(stdout);

    if (!transcript) {
      return res.status(422).json({ message: "แปลงเสียงเป็นข้อความไม่สำเร็จ" });
    }

    return res.json({ transcript });
  } catch (error) {
    console.error("POST /speech/transcribe error:", error.message, error.stderr || "");
    return res.status(500).json({
      message: "แปลงเสียงเป็นข้อความไม่สำเร็จ",
      detail: error.stderr || error.message,
    });
  } finally {
    fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
});

module.exports = router;
