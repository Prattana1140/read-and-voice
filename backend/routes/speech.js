const express = require("express");
const multer = require("multer");
const { getSttStatus, transcribeAudioBuffer } = require("../services/sttService");

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

router.get("/status", (_req, res) => {
  return res.json(getSttStatus());
});

router.post("/transcribe", upload.single("audio"), async (req, res) => {
  if (!process.env.STT_COMMAND) {
    return res.status(503).json({
      message: "ยังไม่ได้ตั้งค่า STT ฝั่งเซิร์ฟเวอร์ ให้ตั้ง STT_COMMAND/STT_ARGS เพื่อใช้ engine ที่รันเอง",
      code: "STT_NOT_CONFIGURED",
    });
  }

  if (!req.file?.buffer?.length) {
    return res.status(400).json({ message: "ไม่พบไฟล์เสียง" });
  }

  try {
    const result = await transcribeAudioBuffer({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
      language: req.body?.language,
    });
    return res.json(result);
  } catch (error) {
    console.error("POST /speech/transcribe error:", error.message, error.stderr || "");
    return res.status(error.code === "STT_EMPTY_TRANSCRIPT" ? 422 : 500).json({
      message: "แปลงเสียงเป็นข้อความไม่สำเร็จ",
      detail: error.stderr || error.message,
    });
  }
});

module.exports = router;
