
from pathlib import Path
from functools import lru_cache
import pymupdf
from paddleocr import PaddleOCR


# Load the OCR model only once per backend process.
@lru_cache(maxsize=1)
def get_ocr_engine():
    return PaddleOCR(
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )


def run_paddle_ocr(file_path: Path) -> dict:
    """Extract text and recognition confidence using PaddleOCR."""

    engine = get_ocr_engine()
    results = engine.predict(str(file_path))

    pages = []
    all_scores = []

    for index, result in enumerate(results):
        texts = result["rec_texts"]
        scores = result["rec_scores"]

        lines = []

        for text, score in zip(texts, scores):
            text = str(text).strip()
            score = float(score)

            if text:
                lines.append(text)
                all_scores.append(score)

        pages.append({
            "page": index + 1,
            "text": "\n".join(lines),
        })

    extracted_text = "\n\n".join(
        page["text"] for page in pages if page["text"]
    )

    average_confidence = (
        sum(all_scores) / len(all_scores)
        if all_scores else 0.0
    )

    return {
        "text": extracted_text,
        "confidence": round(average_confidence, 4),
        "page_count": len(pages),
        "pages": pages,
        "method": "PADDLEOCR",
    }


def extract_document_text(file_path: Path, mime_type: str) -> dict:
    """
    Extract digital PDF text first.
    Use PaddleOCR for scanned PDFs and images.
    """

    if not file_path.is_file():
        raise FileNotFoundError("Document file not found")

    if mime_type == "application/pdf":

        with pymupdf.open(file_path) as pdf:
            digital_pages = [
                page.get_text("text").strip()
                for page in pdf
            ]

        # Check whether the PDF already contains readable text.
        if digital_pages and all(len(text) >= 30 for text in digital_pages):
            return {
                "text": "\n\n".join(digital_pages),
                "confidence": None,
                "page_count": len(digital_pages),
                "pages": [
                    {"page": i + 1, "text": text}
                    for i, text in enumerate(digital_pages)
                ],
                "method": "PYMUPDF",
            }

    elif mime_type not in {"image/jpeg", "image/png"}:
        raise ValueError("Unsupported document MIME type")

    
    return run_paddle_ocr(file_path)
