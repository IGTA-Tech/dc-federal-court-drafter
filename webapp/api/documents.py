"""
Document Generation API Endpoints
"""
import os
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file, current_app
from io import BytesIO
import csv

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.document_generator import DocumentGenerator
from config import DOCUMENT_TYPES, DC_JUDGES, FORMAT_SPECS, OUTPUT_DIR

documents_bp = Blueprint('documents', __name__, url_prefix='/api')

# User registrations file
USERS_FILE = OUTPUT_DIR / "registered_users.csv"


@documents_bp.route('/register-user', methods=['POST'])
def register_user():
    """
    Register a new user and save their information.
    This data is collected for lead tracking purposes.
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Validate required fields
        if not data.get('name') or not data.get('email'):
            return jsonify({"error": "Name and email are required"}), 400

        # Prepare user record
        user_record = {
            'name': data.get('name', ''),
            'email': data.get('email', ''),
            'organization': data.get('organization', ''),
            'phone': data.get('phone', ''),
            'registered_at': data.get('registered_at', datetime.now().isoformat()),
            'ip_address': request.remote_addr or '',
            'user_agent': request.headers.get('User-Agent', '')[:200]
        }

        # Ensure output directory exists
        OUTPUT_DIR.mkdir(exist_ok=True)

        # Append to CSV file
        file_exists = USERS_FILE.exists()
        with open(USERS_FILE, 'a', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=user_record.keys())
            if not file_exists:
                writer.writeheader()
            writer.writerow(user_record)

        current_app.logger.info(f"New user registered: {user_record['email']}")

        return jsonify({
            "success": True,
            "message": "Registration successful"
        })

    except Exception as e:
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@documents_bp.route('/users', methods=['GET'])
def list_users():
    """
    List all registered users (admin endpoint).
    In production, this should be protected with authentication.
    """
    try:
        if not USERS_FILE.exists():
            return jsonify({"users": [], "count": 0})

        users = []
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                users.append(row)

        return jsonify({
            "users": users,
            "count": len(users)
        })

    except Exception as e:
        current_app.logger.error(f"List users error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@documents_bp.route('/generate', methods=['POST'])
def generate_document():
    """
    Generate a DOCX or PDF document.

    Expected JSON body:
    {
        "format": "docx" or "pdf",
        "case_number": "1:24-cv-00123-ABC",
        "plaintiff": "John Doe",
        "defendant": "Jane Smith",
        "judge_initials": "ABC",
        "judge_name": "Judge Name",
        "document_type": "motion_to_dismiss",
        "custom_title": "Optional custom title",
        "motion_type": "For oppositions/replies, the motion being responded to",
        "party_name": "Party filing the document",
        "party_represented": "Plaintiff or Defendant",
        "attorney": {
            "name": "Attorney Name",
            "firm": "Firm Name",
            "address": "123 Main St",
            "city_state_zip": "Washington, DC 20001",
            "phone": "(202) 555-1234",
            "email": "attorney@firm.com",
            "dc_bar_number": "123456"
        },
        "sections": {
            "introduction": "Intro text...",
            "facts": "Factual background...",
            "legal_standard": "Legal standard...",
            "argument": "Main argument...",
            "conclusion": "Conclusion...",
            "additional_arguments": [
                {"heading": "First Point", "content": "..."},
                {"heading": "Second Point", "content": "..."}
            ]
        },
        "include_certificate_of_service": true,
        "date": "January 15, 2025"
    }
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Validate required fields (case_number is now optional)
        required_fields = ["plaintiff", "defendant", "document_type"]
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

        # Validate document type
        doc_type = data.get("document_type")
        if doc_type not in DOCUMENT_TYPES:
            return jsonify({
                "error": f"Invalid document type: {doc_type}",
                "valid_types": list(DOCUMENT_TYPES.keys())
            }), 400

        # Get format
        output_format = data.get("format", "docx").lower()
        if output_format not in ["docx", "pdf"]:
            return jsonify({"error": "Format must be 'docx' or 'pdf'"}), 400

        # Set default date if not provided
        if not data.get("date"):
            data["date"] = datetime.now().strftime("%B %d, %Y")

        # Generate document
        generator = DocumentGenerator(str(OUTPUT_DIR))
        filename, file_bytes = generator.generate(data, output_format)

        # Return the file
        mimetype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" if output_format == "docx" else "application/pdf"

        return send_file(
            BytesIO(file_bytes),
            mimetype=mimetype,
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        current_app.logger.error(f"Document generation error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@documents_bp.route('/validate', methods=['POST'])
def validate_document():
    """
    Validate document metadata against DC court rules.

    Expected JSON body: Same as /generate endpoint
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        errors = []
        warnings = []
        passed = []

        # Validate case number format (only if provided)
        case_number = data.get("case_number", "")
        import re
        if case_number:
            if not re.match(r"1:\d{2}-cv-\d{5}-[A-Z]{2,4}", case_number):
                errors.append({
                    "check": "case_number_format",
                    "message": f"Case number '{case_number}' invalid. Format: 1:YY-cv-NNNNN-ABC (must include judge initials)",
                    "rule": "LCvR 5.1(b)"
                })
            else:
                passed.append({"check": "case_number_format", "message": "Case number format valid"})
        else:
            warnings.append({
                "check": "case_number_missing",
                "message": "Case number not provided. You can add it later before filing.",
                "rule": "LCvR 5.1(b)"
            })

        # Validate document type and page limits
        doc_type = data.get("document_type")
        if doc_type in DOCUMENT_TYPES:
            doc_config = DOCUMENT_TYPES[doc_type]
            max_pages = doc_config.get("max_pages")
            if max_pages:
                passed.append({
                    "check": "page_limit",
                    "message": f"Document type '{doc_config['name']}' has {max_pages}-page limit",
                    "rule": "LCvR 7(n)(1)"
                })
        else:
            errors.append({
                "check": "document_type",
                "message": f"Unknown document type: {doc_type}",
                "rule": "N/A"
            })

        # Validate attorney information
        attorney = data.get("attorney", {})
        required_attorney_fields = ["name", "address", "phone", "email"]
        missing_attorney = [f for f in required_attorney_fields if not attorney.get(f)]
        if missing_attorney:
            errors.append({
                "check": "signature_block",
                "message": f"Signature block missing: {', '.join(missing_attorney)}",
                "rule": "LCvR 5.1(d)"
            })
        else:
            passed.append({"check": "signature_block", "message": "Signature block complete"})

        # Check DC Bar number
        if not attorney.get("dc_bar_number"):
            warnings.append({
                "check": "dc_bar_number",
                "message": "DC Bar number not provided (required for DC Bar members)",
                "rule": "LCvR 5.1(d)"
            })
        else:
            passed.append({"check": "dc_bar_number", "message": "DC Bar number provided"})

        # Validate required content sections
        sections = data.get("sections", {})
        if not any([sections.get("introduction"), sections.get("argument"), sections.get("conclusion")]):
            warnings.append({
                "check": "content",
                "message": "Document appears to have minimal content",
                "rule": "N/A"
            })

        # Validate parties
        if not data.get("plaintiff"):
            errors.append({"check": "plaintiff", "message": "Plaintiff name required", "rule": "LCvR 5.1(b)"})
        if not data.get("defendant"):
            errors.append({"check": "defendant", "message": "Defendant name required", "rule": "LCvR 5.1(b)"})

        return jsonify({
            "is_valid": len(errors) == 0,
            "total_checks": len(errors) + len(warnings) + len(passed),
            "errors": errors,
            "warnings": warnings,
            "passed": passed
        })

    except Exception as e:
        current_app.logger.error(f"Validation error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@documents_bp.route('/templates', methods=['GET'])
def list_templates():
    """Get list of available document templates."""
    templates = []
    for key, config in DOCUMENT_TYPES.items():
        templates.append({
            "id": key,
            "name": config["name"],
            "title": config["title"],
            "category": config["category"],
            "max_pages": config.get("max_pages")
        })
    return jsonify({"templates": templates})


@documents_bp.route('/judges', methods=['GET'])
def list_judges():
    """Get list of DC District Court judges."""
    return jsonify({"judges": DC_JUDGES})


@documents_bp.route('/rules', methods=['GET'])
def get_rules():
    """Get formatting rules."""
    return jsonify({
        "format_specs": FORMAT_SPECS,
        "page_limits": {
            "motion": 45,
            "opposition": 45,
            "reply": 25
        },
        "rules": [
            {
                "id": "LCvR 5.1(a)",
                "title": "Paper Requirements",
                "description": "8.5 x 11 inch white paper, black text"
            },
            {
                "id": "LCvR 5.1(b)",
                "title": "Caption Requirements",
                "description": "Must include court name, parties, case number with judge initials"
            },
            {
                "id": "LCvR 5.1(d)",
                "title": "Signature Block",
                "description": "Must include attorney name, address, phone, email, DC Bar number"
            },
            {
                "id": "LCvR 7(n)(1)",
                "title": "Page Limits",
                "description": "Motions: 45 pages, Replies: 25 pages"
            },
            {
                "id": "LCvR 7(o)(1)",
                "title": "Format Requirements",
                "description": "Times New Roman 12pt, double-spaced, 1-inch margins, 2 spaces between sentences"
            },
            {
                "id": "LCvR 7(o)(2)",
                "title": "Pin Cites",
                "description": "All citations must include page references"
            },
            {
                "id": "LCvR 5.3",
                "title": "Certificate of Service",
                "description": "Required for all filings except case initiation"
            },
            {
                "id": "LCvR 5.4",
                "title": "ECF Requirements",
                "description": "Text-searchable PDF required for filing"
            }
        ]
    })


@documents_bp.route('/drafts', methods=['POST'])
def save_draft():
    """Save a document draft."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Generate draft ID
        draft_id = datetime.now().strftime("%Y%m%d_%H%M%S")
        case_number = data.get("case_number", "draft").replace(":", "_").replace("-", "_")
        filename = f"draft_{case_number}_{draft_id}.json"

        # Save to output directory
        draft_path = OUTPUT_DIR / filename
        with open(draft_path, 'w') as f:
            json.dump(data, f, indent=2)

        return jsonify({
            "success": True,
            "draft_id": draft_id,
            "filename": filename
        })

    except Exception as e:
        current_app.logger.error(f"Save draft error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@documents_bp.route('/drafts', methods=['GET'])
def list_drafts():
    """List saved drafts."""
    try:
        drafts = []
        for file in OUTPUT_DIR.glob("draft_*.json"):
            with open(file, 'r') as f:
                data = json.load(f)
            drafts.append({
                "filename": file.name,
                "case_number": data.get("case_number", "Unknown"),
                "document_type": data.get("document_type", "Unknown"),
                "modified": datetime.fromtimestamp(file.stat().st_mtime).isoformat()
            })

        # Sort by modified date, newest first
        drafts.sort(key=lambda x: x["modified"], reverse=True)

        return jsonify({"drafts": drafts})

    except Exception as e:
        current_app.logger.error(f"List drafts error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@documents_bp.route('/drafts/<filename>', methods=['GET'])
def load_draft(filename):
    """Load a saved draft."""
    try:
        draft_path = OUTPUT_DIR / filename
        if not draft_path.exists():
            return jsonify({"error": "Draft not found"}), 404

        with open(draft_path, 'r') as f:
            data = json.load(f)

        return jsonify(data)

    except Exception as e:
        current_app.logger.error(f"Load draft error: {str(e)}")
        return jsonify({"error": str(e)}), 500


@documents_bp.route('/drafts/<filename>', methods=['DELETE'])
def delete_draft(filename):
    """Delete a saved draft."""
    try:
        draft_path = OUTPUT_DIR / filename
        if not draft_path.exists():
            return jsonify({"error": "Draft not found"}), 404

        draft_path.unlink()

        return jsonify({"success": True})

    except Exception as e:
        current_app.logger.error(f"Delete draft error: {str(e)}")
        return jsonify({"error": str(e)}), 500
