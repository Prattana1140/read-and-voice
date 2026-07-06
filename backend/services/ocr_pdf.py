import contextlib
import json
import os
import sys
import tempfile

os.environ.setdefault("FLAGS_use_mkldnn", "0")
os.environ.setdefault("FLAGS_use_onednn", "0")
os.environ.setdefault("FLAGS_enable_pir_api", "0")
os.environ.setdefault("PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK", "True")

try:
    from pdf2image import convert_from_path
    import pytesseract
except Exception as e:
    print(json.dumps({"text": "", "pages": [], "error": str(e)}), end="")
    sys.exit(0)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}

_paddle_ocr = None


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False), end="")


def normalize_text(text):
    return str(text or "").replace("\r\n", "\n").replace("\x00", "").strip()


def is_pdf(file_path):
    return os.path.splitext(file_path)[1].lower() == ".pdf"


def get_ocr_engine():
    return os.environ.get("OCR_ENGINE", "auto").strip().lower() or "auto"


def get_paddle_ocr():
    global _paddle_ocr
    if _paddle_ocr is not None:
        return _paddle_ocr

    paddle_lang = os.environ.get("PADDLEOCR_LANG", "th").strip() or "th"
    det_model = os.environ.get("PADDLEOCR_DET_MODEL", "PP-OCRv5_mobile_det").strip()
    rec_model = os.environ.get("PADDLEOCR_REC_MODEL", "th_PP-OCRv5_mobile_rec").strip()

    base_kwargs = {
        "lang": paddle_lang,
        "use_doc_orientation_classify": False,
        "use_doc_unwarping": False,
        "text_detection_model_name": det_model,
        "text_recognition_model_name": rec_model,
    }

    with contextlib.redirect_stdout(sys.stderr):
        from paddleocr import PaddleOCR

        attempts = [
            {
                **base_kwargs,
                "use_textline_orientation": True,
            },
            {
                **base_kwargs,
                "use_angle_cls": True,
            },
            base_kwargs,
            {"lang": paddle_lang},
        ]

        last_error = None
        for kwargs in attempts:
            try:
                _paddle_ocr = PaddleOCR(**kwargs)
                return _paddle_ocr
            except Exception as error:
                last_error = error

        raise last_error or RuntimeError("Unable to initialize PaddleOCR")


def collect_paddle_items(value):
    items = []

    if value is None:
        return items

    if isinstance(value, dict):
        texts = value.get("rec_texts")
        scores = value.get("rec_scores") or []
        if isinstance(texts, list):
            for index, text in enumerate(texts):
                score = scores[index] if index < len(scores) else 1
                items.append((normalize_text(text), float(score or 0)))

        for key in ("text", "transcription"):
            if isinstance(value.get(key), str):
                score = value.get("score", value.get("confidence", 1))
                items.append((normalize_text(value[key]), float(score or 0)))

        for child in value.values():
            if isinstance(child, (list, tuple, dict)):
                items.extend(collect_paddle_items(child))

        return items

    if isinstance(value, (list, tuple)):
        if len(value) >= 2 and isinstance(value[0], str) and isinstance(value[1], (int, float)):
            return [(normalize_text(value[0]), float(value[1]))]

        if (
            len(value) >= 2
            and isinstance(value[1], (list, tuple))
            and len(value[1]) >= 2
            and isinstance(value[1][0], str)
            and isinstance(value[1][1], (int, float))
        ):
            return [(normalize_text(value[1][0]), float(value[1][1]))]

        for child in value:
            items.extend(collect_paddle_items(child))

    return items


def run_paddle_image(image_path):
    ocr = get_paddle_ocr()

    with contextlib.redirect_stdout(sys.stderr):
        try:
            result = ocr.ocr(image_path, cls=True)
        except TypeError:
            result = ocr.ocr(image_path)

    min_score = float(os.environ.get("PADDLEOCR_MIN_SCORE", "0.35") or 0.35)
    lines = []
    seen = set()

    for text, score in collect_paddle_items(result):
        clean = normalize_text(text)
        if clean and score >= min_score and clean not in seen:
            seen.add(clean)
            lines.append(clean)

    return "\n".join(lines).strip()


def run_tesseract_image(image):
    tess_cmd = os.environ.get("TESSERACT_COMMAND")
    if tess_cmd:
        pytesseract.pytesseract.tesseract_cmd = tess_cmd

    ocr_lang = os.environ.get("OCR_LANG", "tha+eng")
    psm = os.environ.get("OCR_PSM")
    config = f"--psm {psm}" if psm else ""
    return normalize_text(pytesseract.image_to_string(image, lang=ocr_lang, config=config))


def render_pdf_pages(pdf_path):
    dpi = int(os.environ.get("PADDLEOCR_DPI") or os.environ.get("OCR_RENDER_DPI") or "260")
    return convert_from_path(pdf_path, dpi=max(120, min(420, dpi)))


def run_paddle(file_path):
    if is_pdf(file_path):
        images = render_pdf_pages(file_path)
        pages = []

        for index, image in enumerate(images, start=1):
            temp_file = tempfile.NamedTemporaryFile(
                prefix=f"paddle-ocr-page-{os.getpid()}-{index}-",
                suffix=".png",
                delete=False,
            )
            image_path = temp_file.name
            temp_file.close()

            try:
                image.save(image_path)
                pages.append(run_paddle_image(image_path))
            finally:
                try:
                    os.remove(image_path)
                except OSError:
                    pass
    else:
        pages = [run_paddle_image(file_path)]

    return {
        "engine": "paddleocr",
        "text": "\n\n".join([page for page in pages if page.strip()]),
        "pages": pages,
    }


def run_tesseract(file_path):
    if is_pdf(file_path):
        images = render_pdf_pages(file_path)
    else:
        from PIL import Image

        images = [Image.open(file_path)]

    pages = [run_tesseract_image(image) for image in images]
    return {
        "engine": "tesseract",
        "text": "\n\n".join([page for page in pages if page.strip()]),
        "pages": pages,
    }


def run_ocr(file_path):
    engine = get_ocr_engine()
    paddle_error = None

    if engine in ("auto", "paddle", "paddleocr"):
        try:
            result = run_paddle(file_path)
            if result["text"].strip():
                return result
            paddle_error = RuntimeError("PaddleOCR returned empty text")
        except Exception as error:
            paddle_error = error

        if engine in ("paddle", "paddleocr"):
            raise paddle_error

    result = run_tesseract(file_path)
    if paddle_error:
        result["fallback_from"] = "paddleocr"
        result["fallback_reason"] = str(paddle_error)
    return result


def main():
    if len(sys.argv) < 2:
        emit({"text": "", "pages": [], "error": "missing file path"})
        return

    file_path = sys.argv[1]

    if not os.path.exists(file_path):
        emit({"text": "", "pages": [], "error": "file not found"})
        return

    try:
        result = run_ocr(file_path)
        emit(result)
    except Exception as e:
        emit({"text": "", "pages": [], "error": str(e)})


if __name__ == "__main__":
    main()
