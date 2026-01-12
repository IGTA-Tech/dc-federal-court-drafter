"""
DC Federal District Court Document Format Checker

Validates documents against LCvR 5.1 and LCvR 7 requirements.
"""

import json
import re
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Optional


class Severity(Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationResult:
    check_id: str
    passed: bool
    severity: Severity
    message: str
    rule_reference: str
    details: Optional[str] = None


class DCCourtFormatChecker:
    """Validates documents against DC Federal District Court formatting rules."""

    # LCvR 7 Requirements
    REQUIRED_FONT = "Times New Roman"
    REQUIRED_FONT_SIZE = 12
    MIN_MARGIN_INCHES = 1.0
    LINE_SPACING = 2.0  # Double-spaced
    SPACES_BETWEEN_SENTENCES = 2

    # Page limits per LCvR 7(n)
    MAX_PAGES_MOTION = 45
    MAX_PAGES_REPLY = 25

    # Case number pattern: 1:YY-cv-NNNNN-ABC
    CASE_NUMBER_PATTERN = r"1:\d{2}-cv-\d{5}-[A-Z]{2,4}"

    def __init__(self):
        self.results: list[ValidationResult] = []

    def validate_document(self, document_data: dict) -> list[ValidationResult]:
        """Run all validation checks on document data."""
        self.results = []

        # Run all checks
        self._check_font(document_data.get("font"))
        self._check_font_size(document_data.get("font_size"))
        self._check_margins(document_data.get("margins"))
        self._check_line_spacing(document_data.get("line_spacing"))
        self._check_page_count(
            document_data.get("page_count"),
            document_data.get("document_type", "motion")
        )
        self._check_case_number(document_data.get("case_number"))
        self._check_caption(document_data.get("caption"))
        self._check_signature_block(document_data.get("signature_block"))
        self._check_searchable_pdf(document_data.get("is_searchable"))
        self._check_page_numbers(document_data.get("has_page_numbers"))
        self._check_pin_cites(document_data.get("citations"))

        return self.results

    def _check_font(self, font: Optional[str]) -> None:
        """Check font is Times New Roman."""
        if font is None:
            self.results.append(ValidationResult(
                check_id="font_check",
                passed=False,
                severity=Severity.ERROR,
                message="Could not detect font",
                rule_reference="LCvR 7(o)(1)"
            ))
        elif font.lower() != self.REQUIRED_FONT.lower():
            self.results.append(ValidationResult(
                check_id="font_check",
                passed=False,
                severity=Severity.ERROR,
                message=f"Font is '{font}'. Required: {self.REQUIRED_FONT}",
                rule_reference="LCvR 7(o)(1)"
            ))
        else:
            self.results.append(ValidationResult(
                check_id="font_check",
                passed=True,
                severity=Severity.INFO,
                message="Font check passed",
                rule_reference="LCvR 7(o)(1)"
            ))

    def _check_font_size(self, size: Optional[float]) -> None:
        """Check font size is 12pt."""
        if size is None:
            self.results.append(ValidationResult(
                check_id="font_size_check",
                passed=False,
                severity=Severity.ERROR,
                message="Could not detect font size",
                rule_reference="LCvR 7(o)(1)"
            ))
        elif size != self.REQUIRED_FONT_SIZE:
            self.results.append(ValidationResult(
                check_id="font_size_check",
                passed=False,
                severity=Severity.ERROR,
                message=f"Font size is {size}pt. Required: {self.REQUIRED_FONT_SIZE}pt",
                rule_reference="LCvR 7(o)(1)"
            ))
        else:
            self.results.append(ValidationResult(
                check_id="font_size_check",
                passed=True,
                severity=Severity.INFO,
                message="Font size check passed",
                rule_reference="LCvR 7(o)(1)"
            ))

    def _check_margins(self, margins: Optional[dict]) -> None:
        """Check margins are at least 1 inch."""
        if margins is None:
            self.results.append(ValidationResult(
                check_id="margin_check",
                passed=False,
                severity=Severity.ERROR,
                message="Could not detect margins",
                rule_reference="LCvR 7(o)(1)"
            ))
            return

        failed_margins = []
        for side, value in margins.items():
            if value < self.MIN_MARGIN_INCHES:
                failed_margins.append(f"{side}: {value}in")

        if failed_margins:
            self.results.append(ValidationResult(
                check_id="margin_check",
                passed=False,
                severity=Severity.ERROR,
                message=f"Margins too small: {', '.join(failed_margins)}. Minimum: {self.MIN_MARGIN_INCHES}in",
                rule_reference="LCvR 7(o)(1)"
            ))
        else:
            self.results.append(ValidationResult(
                check_id="margin_check",
                passed=True,
                severity=Severity.INFO,
                message="Margin check passed",
                rule_reference="LCvR 7(o)(1)"
            ))

    def _check_line_spacing(self, spacing: Optional[float]) -> None:
        """Check document is double-spaced."""
        if spacing is None:
            self.results.append(ValidationResult(
                check_id="spacing_check",
                passed=False,
                severity=Severity.WARNING,
                message="Could not detect line spacing",
                rule_reference="LCvR 7(o)(1)"
            ))
        elif spacing < self.LINE_SPACING:
            self.results.append(ValidationResult(
                check_id="spacing_check",
                passed=False,
                severity=Severity.ERROR,
                message=f"Line spacing is {spacing}. Required: double-spaced ({self.LINE_SPACING})",
                rule_reference="LCvR 7(o)(1)"
            ))
        else:
            self.results.append(ValidationResult(
                check_id="spacing_check",
                passed=True,
                severity=Severity.INFO,
                message="Line spacing check passed",
                rule_reference="LCvR 7(o)(1)"
            ))

    def _check_page_count(self, page_count: Optional[int], doc_type: str) -> None:
        """Check page count is within limits."""
        if page_count is None:
            self.results.append(ValidationResult(
                check_id="page_limit_check",
                passed=False,
                severity=Severity.ERROR,
                message="Could not determine page count",
                rule_reference="LCvR 7(n)(1)"
            ))
            return

        max_pages = self.MAX_PAGES_REPLY if "reply" in doc_type.lower() else self.MAX_PAGES_MOTION

        if page_count > max_pages:
            self.results.append(ValidationResult(
                check_id="page_limit_check",
                passed=False,
                severity=Severity.ERROR,
                message=f"Document is {page_count} pages. Maximum for {doc_type}: {max_pages} pages",
                rule_reference="LCvR 7(n)(1)",
                details="File motion for leave to exceed page limits if necessary"
            ))
        else:
            self.results.append(ValidationResult(
                check_id="page_limit_check",
                passed=True,
                severity=Severity.INFO,
                message=f"Page count ({page_count}) within {max_pages}-page limit",
                rule_reference="LCvR 7(n)(1)"
            ))

    def _check_case_number(self, case_number: Optional[str]) -> None:
        """Check case number format includes judge initials."""
        if case_number is None:
            self.results.append(ValidationResult(
                check_id="case_number_check",
                passed=False,
                severity=Severity.ERROR,
                message="No case number found in document",
                rule_reference="LCvR 5.1(b)"
            ))
            return

        if not re.match(self.CASE_NUMBER_PATTERN, case_number):
            self.results.append(ValidationResult(
                check_id="case_number_check",
                passed=False,
                severity=Severity.ERROR,
                message=f"Case number '{case_number}' invalid. Format: 1:YY-cv-NNNNN-ABC (must include judge initials)",
                rule_reference="LCvR 5.1(b)"
            ))
        else:
            self.results.append(ValidationResult(
                check_id="case_number_check",
                passed=True,
                severity=Severity.INFO,
                message="Case number format valid",
                rule_reference="LCvR 5.1(b)"
            ))

    def _check_caption(self, caption: Optional[dict]) -> None:
        """Check caption contains required elements."""
        if caption is None:
            self.results.append(ValidationResult(
                check_id="caption_check",
                passed=False,
                severity=Severity.ERROR,
                message="No caption detected",
                rule_reference="LCvR 5.1(b)"
            ))
            return

        required = ["court_name", "plaintiff", "defendant", "case_number", "document_title"]
        missing = [field for field in required if not caption.get(field)]

        if missing:
            self.results.append(ValidationResult(
                check_id="caption_check",
                passed=False,
                severity=Severity.ERROR,
                message=f"Caption missing: {', '.join(missing)}",
                rule_reference="LCvR 5.1(b)(c)"
            ))
        else:
            self.results.append(ValidationResult(
                check_id="caption_check",
                passed=True,
                severity=Severity.INFO,
                message="Caption contains all required elements",
                rule_reference="LCvR 5.1(b)(c)"
            ))

    def _check_signature_block(self, sig_block: Optional[dict]) -> None:
        """Check signature block completeness."""
        if sig_block is None:
            self.results.append(ValidationResult(
                check_id="signature_block_check",
                passed=False,
                severity=Severity.ERROR,
                message="No signature block detected",
                rule_reference="LCvR 5.1(d)"
            ))
            return

        required = ["attorney_name", "address", "telephone", "email"]
        missing = [field for field in required if not sig_block.get(field)]

        # DC Bar number required for DC Bar members
        if not sig_block.get("dc_bar_number") and sig_block.get("is_dc_bar_member", True):
            missing.append("dc_bar_number")

        if missing:
            self.results.append(ValidationResult(
                check_id="signature_block_check",
                passed=False,
                severity=Severity.ERROR,
                message=f"Signature block missing: {', '.join(missing)}",
                rule_reference="LCvR 5.1(d)"
            ))
        else:
            self.results.append(ValidationResult(
                check_id="signature_block_check",
                passed=True,
                severity=Severity.INFO,
                message="Signature block complete",
                rule_reference="LCvR 5.1(d)"
            ))

    def _check_searchable_pdf(self, is_searchable: Optional[bool]) -> None:
        """Check PDF is text-searchable."""
        if is_searchable is None:
            self.results.append(ValidationResult(
                check_id="searchable_pdf_check",
                passed=False,
                severity=Severity.WARNING,
                message="Could not determine if PDF is text-searchable",
                rule_reference="LCvR 5.4"
            ))
        elif not is_searchable:
            self.results.append(ValidationResult(
                check_id="searchable_pdf_check",
                passed=False,
                severity=Severity.ERROR,
                message="PDF is not text-searchable. ECF requires text-searchable PDFs",
                rule_reference="LCvR 5.4"
            ))
        else:
            self.results.append(ValidationResult(
                check_id="searchable_pdf_check",
                passed=True,
                severity=Severity.INFO,
                message="PDF is text-searchable",
                rule_reference="LCvR 5.4"
            ))

    def _check_page_numbers(self, has_page_numbers: Optional[bool]) -> None:
        """Check document has page numbers."""
        if has_page_numbers is None:
            self.results.append(ValidationResult(
                check_id="page_number_check",
                passed=False,
                severity=Severity.WARNING,
                message="Could not detect page numbers",
                rule_reference="LCvR 7(o)(1)"
            ))
        elif not has_page_numbers:
            self.results.append(ValidationResult(
                check_id="page_number_check",
                passed=False,
                severity=Severity.ERROR,
                message="Document missing page numbers",
                rule_reference="LCvR 7(o)(1)"
            ))
        else:
            self.results.append(ValidationResult(
                check_id="page_number_check",
                passed=True,
                severity=Severity.INFO,
                message="Page numbers present",
                rule_reference="LCvR 7(o)(1)"
            ))

    def _check_pin_cites(self, citations: Optional[list]) -> None:
        """Check citations include pin cites (page numbers)."""
        if citations is None:
            return  # Skip if no citations provided

        # Pattern for citations without page numbers
        missing_pin_cites = []
        for cite in citations:
            # Check if citation has page number (e.g., "123 F.3d 456" vs "123 F.3d 456, 460")
            if not re.search(r",\s*\d+", cite) and not re.search(r"at\s+\d+", cite):
                missing_pin_cites.append(cite)

        if missing_pin_cites:
            self.results.append(ValidationResult(
                check_id="pin_cite_check",
                passed=False,
                severity=Severity.WARNING,
                message=f"{len(missing_pin_cites)} citation(s) may be missing pin cites",
                rule_reference="LCvR 7(o)(2)",
                details=f"Review: {missing_pin_cites[:3]}..."  # Show first 3
            ))
        else:
            self.results.append(ValidationResult(
                check_id="pin_cite_check",
                passed=True,
                severity=Severity.INFO,
                message="All citations appear to include pin cites",
                rule_reference="LCvR 7(o)(2)"
            ))

    def get_summary(self) -> dict:
        """Get summary of validation results."""
        errors = [r for r in self.results if r.severity == Severity.ERROR and not r.passed]
        warnings = [r for r in self.results if r.severity == Severity.WARNING and not r.passed]
        passed = [r for r in self.results if r.passed]

        return {
            "total_checks": len(self.results),
            "passed": len(passed),
            "errors": len(errors),
            "warnings": len(warnings),
            "is_compliant": len(errors) == 0,
            "error_details": [{"check": e.check_id, "message": e.message} for e in errors],
            "warning_details": [{"check": w.check_id, "message": w.message} for w in warnings]
        }

    def print_report(self) -> None:
        """Print formatted validation report."""
        summary = self.get_summary()

        print("\n" + "=" * 60)
        print("DC FEDERAL DISTRICT COURT FORMAT VALIDATION REPORT")
        print("=" * 60)

        if summary["is_compliant"]:
            print("\n[PASS] Document meets DC District Court formatting requirements\n")
        else:
            print("\n[FAIL] Document has formatting issues that must be corrected\n")

        print(f"Total Checks: {summary['total_checks']}")
        print(f"Passed: {summary['passed']}")
        print(f"Errors: {summary['errors']}")
        print(f"Warnings: {summary['warnings']}")

        if summary["errors"] > 0:
            print("\n--- ERRORS (Must Fix) ---")
            for error in summary["error_details"]:
                print(f"  - {error['message']}")

        if summary["warnings"] > 0:
            print("\n--- WARNINGS (Review) ---")
            for warning in summary["warning_details"]:
                print(f"  - {warning['message']}")

        print("\n" + "=" * 60)


# Example usage
if __name__ == "__main__":
    # Sample document data (would come from PDF parser in real implementation)
    sample_document = {
        "font": "Times New Roman",
        "font_size": 12,
        "margins": {"top": 1.0, "bottom": 1.0, "left": 1.0, "right": 1.0},
        "line_spacing": 2.0,
        "page_count": 30,
        "document_type": "motion",
        "case_number": "1:24-cv-00123-ABC",
        "caption": {
            "court_name": "UNITED STATES DISTRICT COURT FOR THE DISTRICT OF COLUMBIA",
            "plaintiff": "John Doe",
            "defendant": "Jane Smith",
            "case_number": "1:24-cv-00123-ABC",
            "document_title": "MOTION TO DISMISS"
        },
        "signature_block": {
            "attorney_name": "Jane Attorney",
            "address": "123 Law Street, Washington, DC 20001",
            "telephone": "(202) 555-1234",
            "email": "jattorney@lawfirm.com",
            "dc_bar_number": "123456"
        },
        "is_searchable": True,
        "has_page_numbers": True,
        "citations": [
            "Bell Atl. Corp. v. Twombly, 550 U.S. 544, 570 (2007)",
            "Ashcroft v. Iqbal, 556 U.S. 662"  # Missing pin cite
        ]
    }

    checker = DCCourtFormatChecker()
    results = checker.validate_document(sample_document)
    checker.print_report()
