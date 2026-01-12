"""
PDF Analyzer for DC Federal District Court Documents

Extracts document metadata and formatting information from PDFs
for validation against LCvR requirements.
"""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

# Note: Requires these dependencies:
# pip install PyPDF2 pdfplumber pymupdf


@dataclass
class DocumentMetadata:
    """Extracted document metadata."""
    page_count: int
    is_searchable: bool
    fonts: list[str]
    primary_font: Optional[str]
    font_sizes: list[float]
    primary_font_size: Optional[float]
    has_page_numbers: bool
    case_number: Optional[str]
    document_title: Optional[str]
    margins: Optional[dict]
    text_content: str


class PDFAnalyzer:
    """Analyzes PDFs for DC court compliance checking."""

    # Case number pattern
    CASE_NUMBER_PATTERN = r"1:\d{2}-cv-\d{5}-[A-Z]{2,4}"

    # Common document title patterns
    TITLE_PATTERNS = [
        r"MOTION\s+TO\s+\w+",
        r"MEMORANDUM\s+IN\s+(?:SUPPORT|OPPOSITION)",
        r"REPLY\s+(?:MEMORANDUM|IN\s+SUPPORT)",
        r"COMPLAINT",
        r"ANSWER",
        r"NOTICE\s+OF\s+APPEAL",
        r"BRIEF\s+(?:OF|IN\s+SUPPORT)",
    ]

    def __init__(self, pdf_path: str):
        self.pdf_path = Path(pdf_path)
        if not self.pdf_path.exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

    def analyze(self) -> DocumentMetadata:
        """
        Analyze PDF and extract metadata.

        Returns DocumentMetadata with all extracted information.
        """
        try:
            import fitz  # PyMuPDF
            return self._analyze_with_pymupdf()
        except ImportError:
            try:
                import pdfplumber
                return self._analyze_with_pdfplumber()
            except ImportError:
                from PyPDF2 import PdfReader
                return self._analyze_with_pypdf2()

    def _analyze_with_pymupdf(self) -> DocumentMetadata:
        """Analyze using PyMuPDF (most comprehensive)."""
        import fitz

        doc = fitz.open(str(self.pdf_path))

        # Basic info
        page_count = len(doc)

        # Extract text and check if searchable
        full_text = ""
        fonts = set()
        font_sizes = set()
        has_page_numbers = False

        for page_num, page in enumerate(doc):
            text = page.get_text()
            full_text += text + "\n"

            # Get font info from text blocks
            blocks = page.get_text("dict")["blocks"]
            for block in blocks:
                if "lines" in block:
                    for line in block["lines"]:
                        for span in line["spans"]:
                            fonts.add(span.get("font", "Unknown"))
                            font_sizes.add(span.get("size", 0))

            # Check for page numbers (look for standalone numbers at page edges)
            if self._detect_page_number(text, page_num + 1):
                has_page_numbers = True

        doc.close()

        # Determine primary font and size
        fonts_list = list(fonts)
        font_sizes_list = sorted(list(font_sizes), reverse=True)

        primary_font = self._get_primary_font(fonts_list)
        primary_font_size = font_sizes_list[0] if font_sizes_list else None

        # Check if searchable
        is_searchable = len(full_text.strip()) > 100

        # Extract case number
        case_number = self._extract_case_number(full_text)

        # Extract document title
        document_title = self._extract_document_title(full_text)

        return DocumentMetadata(
            page_count=page_count,
            is_searchable=is_searchable,
            fonts=fonts_list,
            primary_font=primary_font,
            font_sizes=font_sizes_list,
            primary_font_size=primary_font_size,
            has_page_numbers=has_page_numbers,
            case_number=case_number,
            document_title=document_title,
            margins=None,  # Requires more complex analysis
            text_content=full_text
        )

    def _analyze_with_pdfplumber(self) -> DocumentMetadata:
        """Analyze using pdfplumber (good text extraction)."""
        import pdfplumber

        full_text = ""
        fonts = set()
        font_sizes = set()

        with pdfplumber.open(str(self.pdf_path)) as pdf:
            page_count = len(pdf.pages)

            for page in pdf.pages:
                text = page.extract_text() or ""
                full_text += text + "\n"

                # Extract font info from chars
                for char in page.chars:
                    fonts.add(char.get("fontname", "Unknown"))
                    font_sizes.add(char.get("size", 0))

        fonts_list = list(fonts)
        font_sizes_list = sorted(list(font_sizes), reverse=True)

        return DocumentMetadata(
            page_count=page_count,
            is_searchable=len(full_text.strip()) > 100,
            fonts=fonts_list,
            primary_font=self._get_primary_font(fonts_list),
            font_sizes=font_sizes_list,
            primary_font_size=font_sizes_list[0] if font_sizes_list else None,
            has_page_numbers=self._detect_page_numbers_in_text(full_text, page_count),
            case_number=self._extract_case_number(full_text),
            document_title=self._extract_document_title(full_text),
            margins=None,
            text_content=full_text
        )

    def _analyze_with_pypdf2(self) -> DocumentMetadata:
        """Analyze using PyPDF2 (basic, fallback)."""
        from PyPDF2 import PdfReader

        reader = PdfReader(str(self.pdf_path))
        page_count = len(reader.pages)

        full_text = ""
        for page in reader.pages:
            text = page.extract_text() or ""
            full_text += text + "\n"

        return DocumentMetadata(
            page_count=page_count,
            is_searchable=len(full_text.strip()) > 100,
            fonts=[],  # PyPDF2 doesn't easily expose font info
            primary_font=None,
            font_sizes=[],
            primary_font_size=None,
            has_page_numbers=self._detect_page_numbers_in_text(full_text, page_count),
            case_number=self._extract_case_number(full_text),
            document_title=self._extract_document_title(full_text),
            margins=None,
            text_content=full_text
        )

    def _get_primary_font(self, fonts: list[str]) -> Optional[str]:
        """Determine the primary font (likely body text font)."""
        # Look for Times New Roman variants
        for font in fonts:
            if "times" in font.lower():
                return "Times New Roman"

        # Return first non-symbol font
        for font in fonts:
            if not any(x in font.lower() for x in ["symbol", "zapf", "wingding"]):
                return font

        return fonts[0] if fonts else None

    def _extract_case_number(self, text: str) -> Optional[str]:
        """Extract case number from document text."""
        match = re.search(self.CASE_NUMBER_PATTERN, text)
        return match.group(0) if match else None

    def _extract_document_title(self, text: str) -> Optional[str]:
        """Extract document title from first page."""
        # Look in first 2000 chars (first page area)
        first_page = text[:2000].upper()

        for pattern in self.TITLE_PATTERNS:
            match = re.search(pattern, first_page)
            if match:
                return match.group(0)

        return None

    def _detect_page_number(self, page_text: str, expected_num: int) -> bool:
        """Check if page has a page number."""
        # Look for the expected page number at start or end of text
        lines = page_text.strip().split("\n")
        if not lines:
            return False

        # Check last few lines for page number
        for line in lines[-3:]:
            line = line.strip()
            if line.isdigit() and int(line) == expected_num:
                return True
            if re.match(rf"^{expected_num}$", line):
                return True
            if re.match(rf"^Page\s+{expected_num}$", line, re.IGNORECASE):
                return True

        return False

    def _detect_page_numbers_in_text(self, text: str, page_count: int) -> bool:
        """Heuristic check for page numbers in document."""
        # Look for sequential numbers that could be page numbers
        for i in range(1, min(page_count + 1, 5)):
            if re.search(rf"\b{i}\b", text):
                continue
            return False
        return True

    def to_validation_dict(self) -> dict:
        """Convert metadata to format expected by DCCourtFormatChecker."""
        metadata = self.analyze()

        # Map font names to standard names
        font = metadata.primary_font
        if font and "times" in font.lower():
            font = "Times New Roman"

        return {
            "font": font,
            "font_size": metadata.primary_font_size,
            "margins": metadata.margins,
            "line_spacing": None,  # Hard to detect from PDF
            "page_count": metadata.page_count,
            "document_type": self._infer_document_type(metadata.document_title),
            "case_number": metadata.case_number,
            "caption": {
                "court_name": self._has_court_name(metadata.text_content),
                "plaintiff": True,  # Would need NER to extract
                "defendant": True,
                "case_number": metadata.case_number,
                "document_title": metadata.document_title
            } if metadata.case_number else None,
            "signature_block": self._detect_signature_block(metadata.text_content),
            "is_searchable": metadata.is_searchable,
            "has_page_numbers": metadata.has_page_numbers,
            "citations": self._extract_citations(metadata.text_content)
        }

    def _infer_document_type(self, title: Optional[str]) -> str:
        """Infer document type from title."""
        if not title:
            return "motion"

        title_upper = title.upper()
        if "REPLY" in title_upper:
            return "reply"
        if "OPPOSITION" in title_upper:
            return "opposition"
        return "motion"

    def _has_court_name(self, text: str) -> bool:
        """Check if document has DC court name."""
        patterns = [
            r"DISTRICT\s+COURT.*DISTRICT\s+OF\s+COLUMBIA",
            r"D\.D\.C\.",
            r"DDC"
        ]
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    def _detect_signature_block(self, text: str) -> Optional[dict]:
        """Detect signature block elements."""
        sig_block = {}

        # Look for /s/ signature
        if re.search(r"/s/\s+\w+", text):
            sig_block["attorney_name"] = True

        # Look for DC Bar number
        bar_match = re.search(r"(?:DC|D\.C\.)\s*Bar\s*(?:No\.?|#)?\s*(\d+)", text, re.IGNORECASE)
        if bar_match:
            sig_block["dc_bar_number"] = bar_match.group(1)

        # Look for email
        if re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text):
            sig_block["email"] = True

        # Look for phone
        if re.search(r"\(\d{3}\)\s*\d{3}[-.\s]?\d{4}", text):
            sig_block["telephone"] = True

        # Look for address (DC)
        if re.search(r"Washington,?\s*D\.?C\.?\s*\d{5}", text, re.IGNORECASE):
            sig_block["address"] = True

        return sig_block if sig_block else None

    def _extract_citations(self, text: str) -> list[str]:
        """Extract legal citations from text."""
        citations = []

        # Federal Reporter citations
        fed_pattern = r"\d+\s+F\.(?:2d|3d|4th)?\s+\d+"
        citations.extend(re.findall(fed_pattern, text))

        # US Reports citations
        us_pattern = r"\d+\s+U\.S\.\s+\d+"
        citations.extend(re.findall(us_pattern, text))

        # Supreme Court Reporter
        sct_pattern = r"\d+\s+S\.?\s*Ct\.?\s+\d+"
        citations.extend(re.findall(sct_pattern, text))

        return citations[:20]  # Limit to first 20


# CLI usage
if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) < 2:
        print("Usage: python pdf_analyzer.py <path_to_pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    analyzer = PDFAnalyzer(pdf_path)

    print(f"\nAnalyzing: {pdf_path}\n")

    metadata = analyzer.analyze()
    print(f"Page Count: {metadata.page_count}")
    print(f"Searchable: {metadata.is_searchable}")
    print(f"Primary Font: {metadata.primary_font}")
    print(f"Primary Font Size: {metadata.primary_font_size}")
    print(f"Has Page Numbers: {metadata.has_page_numbers}")
    print(f"Case Number: {metadata.case_number}")
    print(f"Document Title: {metadata.document_title}")

    print("\n--- Validation Data ---")
    validation_data = analyzer.to_validation_dict()
    print(json.dumps(validation_data, indent=2, default=str))
