import argparse
import json
import os
import sys


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_CACHE_DIR = os.path.join(BASE_DIR, ".cache", "huggingface")


def parse_args():
    parser = argparse.ArgumentParser(description="Transcribe audio with faster-whisper.")
    parser.add_argument("input", nargs="?", help="Audio file path.")
    parser.add_argument("--language", "--lang", default=None, help="Language code, such as th or en.")
    parser.add_argument("--model", default=None, help="Whisper model size or local model path.")
    parser.add_argument("--device", default=None, help="Device, usually cpu or cuda.")
    parser.add_argument("--compute-type", default=None, help="Compute type, such as int8 or float16.")
    parser.add_argument("--healthcheck", action="store_true", help="Only verify imports and configuration.")
    return parser.parse_args()


def main():
    args = parse_args()
    cache_dir = os.getenv("STT_CACHE_DIR") or DEFAULT_CACHE_DIR
    if not os.path.isabs(cache_dir):
        cache_dir = os.path.join(BASE_DIR, cache_dir)
    os.environ.setdefault("HF_HOME", cache_dir)
    os.makedirs(os.environ["HF_HOME"], exist_ok=True)

    try:
        from faster_whisper import WhisperModel
    except Exception as exc:
        print(json.dumps({"error": f"faster-whisper import failed: {exc}"}), file=sys.stderr)
        return 2

    if args.healthcheck:
        print(json.dumps({"ok": True, "engine": "faster-whisper"}))
        return 0

    if not args.input or not os.path.exists(args.input):
        print(json.dumps({"error": "Audio input file was not found."}), file=sys.stderr)
        return 2

    model_name = args.model or os.getenv("STT_MODEL") or "tiny"
    device = args.device or os.getenv("STT_DEVICE") or "cpu"
    compute_type = args.compute_type or os.getenv("STT_COMPUTE_TYPE") or "int8"
    language = args.language or os.getenv("STT_LANGUAGE") or None

    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, info = model.transcribe(
        args.input,
        language=language,
        beam_size=int(os.getenv("STT_BEAM_SIZE") or "5"),
        vad_filter=os.getenv("STT_VAD_FILTER", "true").lower() in {"1", "true", "yes", "on"},
    )
    text = " ".join(segment.text.strip() for segment in segments).strip()

    print(
        json.dumps(
            {
                "text": text,
                "language": getattr(info, "language", language),
                "language_probability": getattr(info, "language_probability", None),
                "model": model_name,
            },
            ensure_ascii=False,
        )
    )
    return 0 if text else 3


if __name__ == "__main__":
    raise SystemExit(main())
