# DC Federal Court Document Drafter

RAG-powered tool for drafting court-compliant documents for the U.S. District Court for the District of Columbia.

## What This Does

- **Validates** documents against DC Local Civil Rules (LCvR)
- **Drafts** motions, briefs, and filings with correct formatting
- **Checks** page limits, font, spacing, margins, citations
- **Generates** captions, signature blocks, certificates of service
- **Provides** MCP server for Claude Code integration

## Key Rules Enforced

| Rule | Requirement |
|------|-------------|
| Font | 12pt Times New Roman |
| Spacing | Double-spaced, 2 spaces between sentences |
| Margins | Minimum 1 inch |
| Page Limits | Motion/Opposition: 45 pages, Reply: 25 pages |
| Format | Text-searchable PDF |
| Caption | Court name, case title, case number + judge initials |
| Citations | Pin cites required (exact page references) |
| Signature | Name, address, phone, email, DC Bar number |

## Quick Start - MCP Server for Claude Code

### 1. Install and Build

```bash
cd mcp-server
npm install
npm run build
```

### 2. Configure Claude Code

Add to your Claude config (`%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "dc-court-drafter": {
      "command": "node",
      "args": ["C:\\path\\to\\dc-federal-court-drafter\\mcp-server\\dist\\index.js"]
    }
  }
}
```

### 3. Use in Claude Code

```
> "Validate my motion - 50 pages, case 1:24-cv-00123-ABC"
> "Generate a caption for Acme Corp v. Widget Inc"
> "What are the DC court formatting requirements?"
> "Get the URL for the civil cover sheet"
```

See [MCP_SETUP.md](MCP_SETUP.md) for detailed instructions.

## MCP Server Tools

| Tool | Description |
|------|-------------|
| `validate_document` | Check compliance with LCvR formatting rules |
| `get_rule` | Get full text of any DC local rule |
| `search_rules` | Search rules by keyword |
| `get_formatting_requirements` | Get all formatting specs |
| `generate_caption` | Generate properly formatted caption |
| `generate_signature_block` | Generate signature block |
| `generate_certificate_of_service` | Generate certificate of service |
| `get_form_url` | Get URL for official court forms |
| `get_deadlines` | Get motions practice deadlines |

## Repository Structure

```
dc-federal-court-drafter/
├── knowledge/                  # RAG knowledge base
│   ├── rules/                  # Local rules as structured JSON
│   │   ├── lcvr_5_1.json       # Document form requirements
│   │   ├── lcvr_5_3.json       # Certificate of service
│   │   ├── lcvr_5_4.json       # Electronic filing
│   │   ├── lcvr_7.json         # Motions practice
│   │   └── lcvr_26_1.json      # Corporate disclosure
│   └── urls.json               # All official court URLs
├── schemas/                    # Validation schemas
│   ├── document-format.json    # Formatting requirements
│   └── caption.json            # Caption structure
├── templates/                  # Document templates
│   └── motion.md               # Motion template
├── validators/                 # Python validation
│   └── format_checker.py       # Format validation logic
├── tools/                      # Utilities
│   └── pdf_analyzer.py         # PDF metadata extraction
├── skills/                     # Claude Code skills
│   └── dc-court-drafter.md     # Skill definition
├── mcp-server/                 # MCP Server
│   ├── src/index.ts            # Server implementation
│   ├── package.json
│   └── tsconfig.json
├── MCP_SETUP.md                # MCP setup guide
└── requirements.txt            # Python dependencies
```

## Knowledge Base

The `knowledge/rules/` directory contains structured JSON files for each local rule, chunked for RAG retrieval:

- **LCvR 5.1** - Document form and filing requirements
- **LCvR 5.3** - Certificate of service requirements
- **LCvR 5.4** - Electronic filing (CM/ECF)
- **LCvR 7** - Motions practice (page limits, formatting, deadlines)
- **LCvR 26.1** - Corporate disclosure statements

Each rule file contains:
- Rule number and title
- Individual chunks with section IDs
- Requirements extracted as structured data
- Keywords for search
- Source URLs

## Python Validators

```bash
# Install dependencies
pip install -r requirements.txt

# Validate a document
python validators/format_checker.py

# Analyze a PDF
python tools/pdf_analyzer.py document.pdf
```

## Data Sources

All rules sourced from official court websites:
- [Local Rules](https://www.dcd.uscourts.gov/court-info/local-rules-and-orders/local-rules)
- [New Case Forms](https://www.dcd.uscourts.gov/new-case-forms)
- [General Civil Forms](https://www.dcd.uscourts.gov/general-civil-forms)
- [ECF Information](https://www.dcd.uscourts.gov/ecf-forms-instructions-and-other-information)

## Rule References

- **LCvR 5.1** - Form and Filing of Documents
- **LCvR 5.3** - Certificate of Service
- **LCvR 5.4** - Electronic Case Filing
- **LCvR 7** - Motions
- **LCvR 7(n)** - Page Limitations
- **LCvR 7(o)** - Formatting Requirements
- **LCvR 26.1** - Corporate Disclosure Statement

## License

Internal use - IGTA-Tech
