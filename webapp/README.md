# DC Federal Court Document Drafter - Web Application

A local web application for generating court documents with proper DC Federal District Court formatting and researching cases via CourtListener API.

## Features

### Document Generator
- Generate DOCX and PDF documents with exact DC court formatting
- Support for all common document types:
  - Motions (Dismiss, Summary Judgment, Compel, etc.)
  - Oppositions
  - Replies
  - Complaints
  - Answers
  - Notice of Appeal
- Automatic formatting per LCvR 5.1 and LCvR 7:
  - Times New Roman 12pt
  - Double-spaced (2.0 line spacing)
  - 1-inch margins
  - Proper caption block with judge initials
  - Signature block with DC Bar number
  - Certificate of service
  - Page numbers (bottom center)
- Save and load drafts
- Real-time validation against court rules

### Court Research
- Search DC District Court cases via CourtListener API
- View docket entries and filings
- Get party and attorney information
- Search opinions and case law
- Look up cases by citation
- Export case details to Document Generator

## Quick Start

### 1. Install Dependencies

```bash
cd C:/Users/IGTA/dc-federal-court-drafter/webapp
C:/Users/IGTA/Python312/python.exe -m pip install -r requirements.txt
```

### 2. Configure Environment (Optional)

For Court Research features, you need a CourtListener API token:

1. Copy `.env.example` to `.env`
2. Get a free API token at https://www.courtlistener.com/help/api/rest/
3. Add your token to `.env`:
   ```
   COURTLISTENER_API_TOKEN=your-token-here
   ```

### 3. Run the Application

```bash
C:/Users/IGTA/Python312/python.exe app.py
```

Open your browser to http://localhost:5000

## Usage

### Document Generator

1. **Select Document Type** - Choose the type of document (motion, opposition, reply, etc.)
2. **Enter Case Information** - Case number, parties, judge
3. **Enter Attorney Information** - Name, firm, contact details, DC Bar number
4. **Add Content** - Introduction, facts, legal standard, argument, conclusion
5. **Generate** - Click "Generate DOCX" or "Generate PDF" to download

### Court Research

1. **Search Cases** - Enter keywords to search DC District Court cases
2. **View Details** - Click a result to see docket information
3. **Load Entries** - View docket entries and parties
4. **Export** - Send case details to the Document Generator

## API Endpoints

### Document Generation
- `POST /api/generate` - Generate DOCX or PDF
- `POST /api/validate` - Validate document metadata
- `GET /api/templates` - List document templates
- `GET /api/judges` - List DC judges
- `GET /api/rules` - Get formatting rules
- `POST /api/drafts` - Save draft
- `GET /api/drafts` - List drafts
- `GET /api/drafts/<filename>` - Load draft
- `DELETE /api/drafts/<filename>` - Delete draft

### Court Research
- `GET /api/research/status` - Check API configuration
- `GET /api/research/cases` - Search DC cases
- `GET /api/research/docket/<id>` - Get docket details
- `GET /api/research/docket/<id>/entries` - Get docket entries
- `GET /api/research/parties/<id>` - Get parties and attorneys
- `GET /api/research/opinions` - Search opinions
- `GET /api/research/opinion/<id>` - Get opinion details
- `GET /api/research/citation/<cite>` - Look up citation
- `GET /api/research/citing/<id>` - Get citing cases
- `GET /api/research/dockets` - Search dockets directly

## Formatting Rules

All generated documents comply with DC District Court Local Rules:

| Rule | Requirement |
|------|-------------|
| LCvR 5.1(a) | 8.5 x 11 inch white paper, black text |
| LCvR 5.1(b) | Caption with court name, parties, case number with judge initials |
| LCvR 5.1(d) | Signature block with attorney name, address, phone, email, DC Bar number |
| LCvR 7(n)(1) | Page limits: Motions 45 pages, Replies 25 pages |
| LCvR 7(o)(1) | Times New Roman 12pt, double-spaced, 1-inch margins |
| LCvR 7(o)(2) | Pin cites required for all citations |
| LCvR 5.3 | Certificate of service required |
| LCvR 5.4 | Text-searchable PDF for ECF filing |

## File Structure

```
webapp/
├── app.py                       # Flask application entry point
├── config.py                    # Configuration and constants
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment variables template
├── services/
│   ├── document_generator.py    # DOCX/PDF generation
│   └── courtlistener_client.py  # CourtListener API client
├── api/
│   ├── documents.py             # Document generation endpoints
│   └── research.py              # Court research endpoints
├── templates/
│   ├── base.html                # Base template
│   ├── generator.html           # Document generator UI
│   └── research.html            # Court research UI
├── static/
│   ├── css/styles.css           # Custom styles
│   └── js/main.js               # Custom JavaScript
└── output/                      # Generated documents and drafts
```

## Keyboard Shortcuts

- `Ctrl/Cmd + S` - Save draft
- `Ctrl/Cmd + G` - Generate DOCX
- `Escape` - Close modals

## Dependencies

- Flask 3.0+
- Flask-CORS
- python-docx
- reportlab
- requests
- python-dotenv
