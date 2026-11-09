
from pathlib import Path
import pymupdf

from app.services.ocr_service import run_paddle_ocr

pdf_path = next(Path("private_uploads").rglob("*.pdf"))
test_image = Path("private_uploads/ocr_test_page.png")

# Render the first PDF page as an image.
with pymupdf.open(pdf_path) as pdf:
    page = pdf[0]
    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(2, 2))
    pixmap.save(test_image)

try:
    result = run_paddle_ocr(test_image)

    print("OCR METHOD:", result["method"])
    print("PAGES:", result["page_count"])
    print("CONFIDENCE:", result["confidence"])
    print("\nEXTRACTED TEXT:\n")
    print(result["text"][:3000])

finally:
    test_image.unlink(missing_ok=True)
