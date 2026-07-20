const express = require("express");
const {
  checkServerTtsRuntime,
  getServerTtsStatus,
  listServerTtsVoices,
  synthesizeSpeech,
} = require("../services/ttsService");

const router = express.Router();

router.get("/status", (_req, res) => {
  return res.json(getServerTtsStatus());
});

router.get("/health", async (_req, res) => {
  const result = await checkServerTtsRuntime();
  return res.status(result.ok ? 200 : 503).json(result);
});

router.get("/voices", async (_req, res) => {
  try {
    const voices = await listServerTtsVoices();
    return res.json({ voices });
  } catch (error) {
    return res.status(500).json({
      message: "โหลดรายการเสียง AI ไม่สำเร็จ",
      detail: error.stderr || error.message,
    });
  }
});

router.post("/synthesize", async (req, res) => {
  try {
    const result = await synthesizeSpeech({
      text: req.body?.text,
      voice: req.body?.voice,
      rate: req.body?.rate,
      pitch: req.body?.pitch,
      volume: req.body?.volume,
    });

    res.set("Content-Type", result.contentType);
    res.set("Cache-Control", "no-store");
    res.set("X-TTS-Engine", result.engine);
    return res.send(result.audio);
  } catch (error) {
    const status = error.code === "SERVER_TTS_DISABLED" ? 503 : 400;
    return res.status(status).json({
      message: "สร้างเสียง AI ไม่สำเร็จ",
      detail: error.stderr || error.message,
    });
  }
});

module.exports = router;
