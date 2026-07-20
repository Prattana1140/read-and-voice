import argparse
import asyncio
import json
import os
import sys


DEFAULT_VOICE = "th-TH-PremwadeeNeural"


def parse_args():
    parser = argparse.ArgumentParser(description="Synthesize speech with edge-tts.")
    parser.add_argument("--text", default="", help="Text to synthesize.")
    parser.add_argument("--output", default="", help="Output audio path.")
    parser.add_argument("--voice", default=None, help="Voice name.")
    parser.add_argument("--rate", default=None, help="Rate, for example +0% or -10%.")
    parser.add_argument("--volume", default=None, help="Volume, for example +0% or -20%.")
    parser.add_argument("--pitch", default=None, help="Pitch, for example +0Hz.")
    parser.add_argument("--list-voices", action="store_true", help="List available voices.")
    parser.add_argument("--healthcheck", action="store_true", help="Verify edge-tts import.")
    return parser.parse_args()


async def list_voices():
    import edge_tts

    voices = await edge_tts.list_voices()
    preferred = [
        voice
        for voice in voices
        if str(voice.get("Locale", "")).lower().startswith(("th", "en"))
    ]
    return [
        {
            "name": voice.get("ShortName"),
            "locale": voice.get("Locale"),
            "gender": voice.get("Gender"),
            "display_name": voice.get("FriendlyName"),
        }
        for voice in preferred
        if voice.get("ShortName")
    ]


async def synthesize(args):
    import edge_tts

    text = str(args.text or "").strip()
    if not text:
        raise ValueError("Text is required.")
    if not args.output:
        raise ValueError("Output path is required.")

    voice = args.voice or os.getenv("SERVER_TTS_VOICE") or DEFAULT_VOICE
    rate = args.rate or os.getenv("SERVER_TTS_RATE") or "+0%"
    volume = args.volume or os.getenv("SERVER_TTS_VOLUME") or "+0%"
    pitch = args.pitch or os.getenv("SERVER_TTS_PITCH") or "+0Hz"
    communicate = edge_tts.Communicate(text, voice=voice, rate=rate, volume=volume, pitch=pitch)
    await communicate.save(args.output)
    return {
        "ok": True,
        "voice": voice,
        "output": args.output,
        "bytes": os.path.getsize(args.output),
    }


async def main_async():
    args = parse_args()

    try:
        import edge_tts  # noqa: F401
    except Exception as exc:
        print(json.dumps({"error": f"edge-tts import failed: {exc}"}), file=sys.stderr)
        return 2

    try:
        if args.healthcheck:
            print(json.dumps({"ok": True, "engine": "edge-tts"}))
            return 0
        if args.list_voices:
            print(json.dumps({"voices": await list_voices()}, ensure_ascii=False))
            return 0

        result = await synthesize(args)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({"error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main_async()))
