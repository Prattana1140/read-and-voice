import sys
import json
import os

try:
    from pdf2image import convert_from_path
    import pytesseract
except Exception as e:
    print(json.dumps({"text": "", "pages": [], "error": str(e)}), end="")
    sys.exit(0)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"text": "", "pages": [], "error": "missing file path"}), end="")
        return

    pdf_path = sys.argv[1]

    if not os.path.exists(pdf_path):
        print(json.dumps({"text": "", "pages": [], "error": "file not found"}), end="")
        return

    try:
        images = convert_from_path(pdf_path, dpi=220)
        pages = []

        for img in images:
            text = pytesseract.image_to_string(img, lang="tha+eng")
            pages.append((text or "").strip())

        full_text = "\n\n".join([p for p in pages if p.strip()])

        print(json.dumps({
            "text": full_text,
            "pages": pages
        }, ensure_ascii=False), end="")
    except Exception as e:
        print(json.dumps({"text": "", "pages": [], "error": str(e)}, ensure_ascii=False), end="")

if __name__ == "__main__":
    main()