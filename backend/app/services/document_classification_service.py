
import re


DOCUMENT_KEYWORDS = {
    "DISCHARGE_SUMMARY": [
        "discharge summary",
        "date of discharge",
        "condition at discharge",
        "discharge diagnosis",
        "hospital course",
    ],
    "INVESTIGATION_REPORT": [
        "laboratory report",
        "investigation report",
        "test result",
        "reference range",
        "haematology",
        "hematology",
        "radiology",
        "ultrasound",
        "blood test",
        "platelet count",
        "hemoglobin",
    ],
    "DOCTOR_PRESCRIPTION": [
        "prescription",
        "prescribed",
        "medication",
        "dosage",
        "tablet",
        "capsule",
        "doctor's advice",
        "follow up",
    ],
    "INSURANCE_CARD": [
        "insurance card",
        "policy number",
        "policy no",
        "member id",
        "tpa id",
        "health insurance",
        "insured person",
        "validity",
    ],
    "FINAL_BILL": [
        "final bill",
        "total bill amount",
        "net payable",
        "grand total",
        "bill number",
        "amount payable",
        "hospital charges",
        "invoice",
    ],
    "PRE_AUTHORIZATION_FORM": [
        "pre authorization",
        "pre-authorization",
        "preauth",
        "cashless authorization",
        "authorization request",
        "proposed treatment",
        "estimated expenses",
        "insurance company",
    ],
}




def _extract_first(patterns: list[str], text: str) -> str | None:
    field_boundary = re.compile(
        r"\s+(?="
        r"patient\s*name|name\s*of\s*patient|patient\s*id|uhid|mrn|"
        r"hospital\s*name|(?:final\s*)?diagnosis|provisional\s*diagnosis|"
        r"admission\s*date|date\s*of\s*admission|"
        r"discharge\s*date|date\s*of\s*discharge|"
        r"grand\s*total|total\s*bill\s*amount|net\s*payable|"
        r"amount\s*payable|document\s*date|report\s*date|bill\s*date"
        r")\s*[:\-]",
        re.IGNORECASE,
    )

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)

        if match:
            value = match.group(1).strip()
            value = field_boundary.split(value, maxsplit=1)[0]
            return value.strip()

    return None




def extract_structured_fields(text: str) -> dict:
    """Extract basic structured fields using field-label boundaries."""

    def extract(label_pattern: str) -> str | None:
        pattern = (
            label_pattern
            + r"\s*[:\-]\s*(.*?)"
            + r"(?=\s+(?:"
            + r"patient\s*name|name\s*of\s*patient|patient\s*id|"
            + r"uhid|mrn|hospital\s*name|diagnosis|"
            + r"provisional\s*diagnosis|admission\s*date|"
            + r"date\s*of\s*admission|discharge\s*date|"
            + r"date\s*of\s*discharge|grand\s*total|"
            + r"total\s*bill\s*amount|net\s*payable|"
            + r"amount\s*payable|document\s*date|"
            + r"report\s*date|bill\s*date"
            + r")\s*[:\-]|$)"
        )

        match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        return match.group(1).strip() if match else None

    return {
        "patient_name": extract(r"(?:patient\s*name|name\s*of\s*patient)"),
        "patient_id": extract(r"(?:patient\s*id|uhid|mrn)"),
        "hospital_name": extract(r"hospital\s*name"),
        "diagnosis": extract(r"(?:provisional\s*diagnosis|(?:final\s*)?diagnosis)"),
        "admission_date": extract(r"(?:date\s*of\s*admission|admission\s*date)"),
        "discharge_date": extract(r"(?:date\s*of\s*discharge|discharge\s*date)"),
        "bill_amount": extract(r"(?:grand\s*total|total\s*bill\s*amount|net\s*payable|amount\s*payable)"),
        "document_date": extract(r"(?:document\s*date|report\s*date|bill\s*date)"),
    }



def classify_document_text(text: str) -> dict:
    """
    Classify a document using keyword evidence.

    Confidence is a heuristic score, not a machine-learning
    probability. Results should be reviewed by a human.
    """

    normalized_text = re.sub(r"\s+", " ", text.lower()).strip()

    if not normalized_text:
        return {
            "document_type": None,
            "confidence": 0.0,
            "classification_status": "REVIEW_REQUIRED",
            "review_required": True,
            "matched_keywords": [],
            "extracted_fields": {},
        }

    scores = {}
    matched = {}

    for document_type, keywords in DOCUMENT_KEYWORDS.items():
        matches = [
            keyword
            for keyword in keywords
            if keyword in normalized_text
        ]

        scores[document_type] = len(matches)
        matched[document_type] = matches

    best_type = max(scores, key=scores.get)
    best_score = scores[best_type]

    total_matches = sum(scores.values())

    if best_score == 0:
        confidence = 0.0
        document_type = None
    else:
        # Heuristic: evidence strength and separation from other types.
        evidence_score = min(best_score / 3, 1.0)
        separation_score = best_score / max(total_matches, 1)

        confidence = round(
            (0.7 * evidence_score) + (0.3 * separation_score),
            4,
        )
        document_type = best_type if best_score >= 2 else None

    review_required = (
        document_type is None
        or confidence < 0.70
        or best_score < 2
    )

    return {
        "document_type": document_type,
        "confidence": confidence,
        "classification_status": (
            "REVIEW_REQUIRED" if review_required else "EXTRACTED"
        ),
        "review_required": review_required,
        "matched_keywords": (
            matched[best_type] if document_type else []
        ),
        "extracted_fields": extract_structured_fields(text),
    }
