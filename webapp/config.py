"""
Configuration for DC Federal Court Document Drafter Web Application
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base paths
BASE_DIR = Path(__file__).parent.resolve()
PROJECT_DIR = BASE_DIR.parent
OUTPUT_DIR = BASE_DIR / "output"

# Ensure output directory exists
OUTPUT_DIR.mkdir(exist_ok=True)

# Flask configuration
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'

    # CourtListener API
    COURTLISTENER_API_TOKEN = os.environ.get('COURTLISTENER_API_TOKEN', '')
    COURTLISTENER_BASE_URL = 'https://www.courtlistener.com/api/rest/v4'

    # Document settings
    OUTPUT_DIR = str(OUTPUT_DIR)
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload

    # Upload settings
    UPLOAD_ALLOWED_EXTENSIONS = {'docx'}
    UPLOAD_MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

# DC District Court specific constants
DC_COURT_NAME = "UNITED STATES DISTRICT COURT\nFOR THE DISTRICT OF COLUMBIA"
DC_COURT_ID = "dcd"

# Judge initials directory (DC District Court judges)
# Updated January 2025 - Source: dcd.uscourts.gov
DC_JUDGES = [
    # Active District Judges (14 total)
    {"initials": "JEB", "name": "James E. Boasberg (Chief Judge)", "status": "active"},
    {"initials": "RC", "name": "Rudolph Contreras", "status": "active"},
    {"initials": "CRC", "name": "Christopher R. Cooper", "status": "active"},
    {"initials": "TSC", "name": "Tanya S. Chutkan", "status": "active"},
    {"initials": "RDM", "name": "Randolph D. Moss", "status": "active"},
    {"initials": "APM", "name": "Amit P. Mehta", "status": "active"},
    {"initials": "TJK", "name": "Timothy J. Kelly", "status": "active"},
    {"initials": "TNM", "name": "Trevor N. McFadden", "status": "active"},
    {"initials": "DLF", "name": "Dabney L. Friedrich", "status": "active"},
    {"initials": "CJN", "name": "Carl J. Nichols", "status": "active"},
    {"initials": "JMC", "name": "Jia M. Cobb", "status": "active"},
    {"initials": "ACR", "name": "Ana C. Reyes", "status": "active"},
    {"initials": "LLA", "name": "Loren L. AliKhan", "status": "active"},
    {"initials": "AHA", "name": "Amir H. Ali", "status": "active"},
    {"initials": "SLS", "name": "Sparkle L. Sooknanan", "status": "active"},
    # Senior Judges (9 total)
    {"initials": "RCL", "name": "Royce C. Lamberth (Senior)", "status": "senior"},
    {"initials": "PLF", "name": "Paul L. Friedman (Senior)", "status": "senior"},
    {"initials": "EGS", "name": "Emmet G. Sullivan (Senior)", "status": "senior"},
    {"initials": "RBW", "name": "Reggie B. Walton (Senior)", "status": "senior"},
    {"initials": "JDB", "name": "John D. Bates (Senior)", "status": "senior"},
    {"initials": "RJL", "name": "Richard J. Leon (Senior)", "status": "senior"},
    {"initials": "CKK", "name": "Colleen Kollar-Kotelly (Senior)", "status": "senior"},
    {"initials": "ABJ", "name": "Amy Berman Jackson (Senior)", "status": "senior"},
    {"initials": "BAH", "name": "Beryl A. Howell (Senior)", "status": "senior"},
]

# Document types with their configurations
DOCUMENT_TYPES = {
    "motion_to_dismiss": {
        "name": "Motion to Dismiss",
        "title": "MOTION TO DISMISS",
        "max_pages": 45,
        "category": "motion"
    },
    "motion_summary_judgment": {
        "name": "Motion for Summary Judgment",
        "title": "MOTION FOR SUMMARY JUDGMENT",
        "max_pages": 45,
        "category": "motion"
    },
    "motion_to_compel": {
        "name": "Motion to Compel",
        "title": "MOTION TO COMPEL",
        "max_pages": 45,
        "category": "motion"
    },
    "motion_preliminary_injunction": {
        "name": "Motion for Preliminary Injunction",
        "title": "MOTION FOR PRELIMINARY INJUNCTION",
        "max_pages": 45,
        "category": "motion"
    },
    "motion_tro": {
        "name": "Motion for Temporary Restraining Order",
        "title": "MOTION FOR TEMPORARY RESTRAINING ORDER",
        "max_pages": 45,
        "category": "motion"
    },
    "motion_leave_amend": {
        "name": "Motion for Leave to Amend",
        "title": "MOTION FOR LEAVE TO AMEND",
        "max_pages": 45,
        "category": "motion"
    },
    "motion_extend_time": {
        "name": "Motion to Extend Time",
        "title": "MOTION TO EXTEND TIME",
        "max_pages": 45,
        "category": "motion"
    },
    "opposition": {
        "name": "Opposition",
        "title": "OPPOSITION TO {motion_type}",
        "max_pages": 45,
        "category": "opposition"
    },
    "reply": {
        "name": "Reply",
        "title": "REPLY IN SUPPORT OF {motion_type}",
        "max_pages": 25,
        "category": "reply"
    },
    "complaint": {
        "name": "Complaint",
        "title": "COMPLAINT",
        "max_pages": None,  # No page limit
        "category": "pleading"
    },
    "answer": {
        "name": "Answer",
        "title": "ANSWER TO COMPLAINT",
        "max_pages": None,
        "category": "pleading"
    },
    "notice_of_appeal": {
        "name": "Notice of Appeal",
        "title": "NOTICE OF APPEAL",
        "max_pages": None,
        "category": "notice"
    }
}

# Formatting specifications per LCvR 7
FORMAT_SPECS = {
    "font_name": "Times New Roman",
    "font_size": 12,
    "line_spacing": 2.0,  # Double-spaced
    "margin_inches": 1.0,
    "sentence_spacing": 2,  # Two spaces between sentences
    "page_number_position": "bottom_center"
}
