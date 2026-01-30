"""
Document Upload API Endpoints

Provides endpoints for uploading, extracting, and reformatting documents.
"""
import os
import logging
from io import BytesIO
from datetime import datetime
from flask import Blueprint, request, jsonify, send_file

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.document_processor import DocumentProcessor, process_and_reformat
from config import Config, DOCUMENT_TYPES

upload_bp = Blueprint('upload', __name__, url_prefix='/api/upload')
logger = logging.getLogger(__name__)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'docx'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB


def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@upload_bp.route('', methods=['POST'])
def upload_document():
    """
    Upload a DOCX file and extract its content.

    Expected form data:
        file: The DOCX file to upload

    Returns:
        JSON with extracted content, case info, and detected sections
    """
    try:
        # Check if file was provided
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        if not allowed_file(file.filename):
            return jsonify({
                "error": "Invalid file type. Only DOCX files are supported."
            }), 400

        # Read file bytes
        file_bytes = file.read()

        # Check file size
        if len(file_bytes) > MAX_FILE_SIZE:
            return jsonify({
                "error": f"File too large. Maximum size is {MAX_FILE_SIZE // (1024 * 1024)}MB."
            }), 400

        # Process the document
        processor = DocumentProcessor()
        content = processor.extract_from_docx(file_bytes)

        return jsonify({
            "success": True,
            "filename": file.filename,
            "extracted": {
                "full_text": content["full_text"],
                "paragraphs": content["paragraphs"],
                "case_info": content["case_info"],
                "sections": content["sections"],
                "word_count": content["word_count"],
                "paragraph_count": content["paragraph_count"]
            }
        })

    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({"error": f"Failed to process document: {str(e)}"}), 500


@upload_bp.route('/reformat', methods=['POST'])
def reformat_document():
    """
    Reformat uploaded content to DC District Court standards.

    Expected JSON body:
        sections: Dictionary of document sections
        doc_type: Type of document (motion_to_dismiss, opposition, etc.)
        case_info: Case information (case_number, plaintiff, defendant, judge_name)
        attorney_info: Attorney information for signature block (optional)
        include_certificate: Whether to include certificate of service (default: true)

    Returns:
        DOCX file download
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Extract required fields
        sections = data.get("sections", {})
        doc_type = data.get("doc_type", "motion_to_dismiss")
        case_info = data.get("case_info", {})
        attorney_info = data.get("attorney_info")
        include_certificate = data.get("include_certificate", True)

        # Validate doc_type
        if doc_type not in DOCUMENT_TYPES:
            return jsonify({
                "error": f"Invalid document type. Valid types: {', '.join(DOCUMENT_TYPES.keys())}"
            }), 400

        # Build content dict
        content = {"sections": sections}

        # Process and reformat
        processor = DocumentProcessor()
        reformatted_bytes = processor.reformat_to_dc_standards(
            content=content,
            doc_type=doc_type,
            case_info=case_info,
            attorney_info=attorney_info,
            include_certificate=include_certificate
        )

        # Generate filename
        case_number = case_info.get("case_number", "")
        case_clean = case_number.replace(":", "-").replace(" ", "_") if case_number else "draft"
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{case_clean}_{doc_type}_reformatted_{timestamp}.docx"

        # Return as download
        return send_file(
            BytesIO(reformatted_bytes),
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        logger.error(f"Reformat error: {str(e)}")
        return jsonify({"error": f"Failed to reformat document: {str(e)}"}), 500


@upload_bp.route('/preview', methods=['POST'])
def preview_document():
    """
    Generate a preview of the reformatted document.

    Same input as /reformat, but returns JSON with preview data instead of file.
    """
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "No data provided"}), 400

        sections = data.get("sections", {})
        doc_type = data.get("doc_type", "motion_to_dismiss")
        case_info = data.get("case_info", {})
        attorney_info = data.get("attorney_info")

        # Get document type config
        doc_config = DOCUMENT_TYPES.get(doc_type, DOCUMENT_TYPES.get("motion_to_dismiss"))

        # Build preview
        preview_parts = []

        # Caption preview
        plaintiff = case_info.get("plaintiff", "PLAINTIFF NAME").upper()
        defendant = case_info.get("defendant", "DEFENDANT NAME").upper()
        case_number = case_info.get("case_number", "[Case No. TBD]")
        judge_name = case_info.get("judge_name", "")

        caption_preview = f"""UNITED STATES DISTRICT COURT
FOR THE DISTRICT OF COLUMBIA

{plaintiff},
        Plaintiff,

    v.                              Case No. {case_number}
                                    {f'Judge: {judge_name}' if judge_name else ''}
{defendant},
        Defendant."""

        preview_parts.append({
            "type": "caption",
            "content": caption_preview
        })

        # Title preview
        title = case_info.get("custom_title", doc_config["title"]) if doc_config else "MOTION"
        preview_parts.append({
            "type": "title",
            "content": title
        })

        # Sections preview
        section_names = {
            "introduction": "INTRODUCTION",
            "facts": "FACTUAL BACKGROUND",
            "legal_standard": "LEGAL STANDARD",
            "argument": "ARGUMENT",
            "conclusion": "CONCLUSION"
        }

        for section_key, section_title in section_names.items():
            if sections.get(section_key):
                content = sections[section_key]
                # Truncate for preview
                if len(content) > 500:
                    content = content[:500] + "..."

                preview_parts.append({
                    "type": "section",
                    "title": section_title,
                    "content": content
                })

        # Signature block preview
        if attorney_info:
            sig_preview = f"""Respectfully submitted,

/s/ {attorney_info.get('name', 'Attorney Name')}
{attorney_info.get('name', 'Attorney Name')}"""

            if attorney_info.get('firm'):
                sig_preview += f"\n{attorney_info['firm']}"

            preview_parts.append({
                "type": "signature",
                "content": sig_preview
            })

        return jsonify({
            "success": True,
            "preview": preview_parts,
            "format_info": {
                "font": "Times New Roman",
                "font_size": "12pt",
                "line_spacing": "Double-spaced",
                "margins": "1 inch all sides",
                "page_numbers": "Bottom center"
            }
        })

    except Exception as e:
        logger.error(f"Preview error: {str(e)}")
        return jsonify({"error": f"Failed to generate preview: {str(e)}"}), 500


@upload_bp.route('/document-types', methods=['GET'])
def get_document_types():
    """Get list of available document types."""
    types = []
    for key, config in DOCUMENT_TYPES.items():
        types.append({
            "id": key,
            "name": config["name"],
            "title": config["title"],
            "category": config["category"],
            "max_pages": config.get("max_pages")
        })

    return jsonify({
        "document_types": types
    })
