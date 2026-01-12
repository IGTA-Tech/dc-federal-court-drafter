# DC Federal Court Document Drafter

RAG-powered tool for drafting court-compliant documents for the U.S. District Court for the District of Columbia.

## What This Does

- **Validates** documents against DC Local Civil Rules (LCvR)
- **Drafts** motions, briefs, and filings with correct formatting
- **Checks** page limits, font, spacing, margins, citations
- **Generates** required forms with auto-populated fields

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

## Repository Structure

```
dc-federal-court-drafter/
├── knowledge/                  # RAG knowledge base
│   ├── rules/                  # Local rules text & JSON
│   ├── forms/                  # Form templates & metadata
│   ├── standing-orders/        # Judge-specific requirements
│   └── urls.json               # Authoritative source URLs
├── schemas/                    # Validation schemas
│   ├── document-format.json    # Formatting requirements
│   ├── caption.json            # Caption structure
│   └── forms/                  # Per-form schemas
├── templates/                  # Document templates
│   ├── motion.md
│   ├── opposition.md
│   ├── reply.md
│   └── notice-of-appeal.md
├── validators/                 # Validation logic
│   ├── format-checker.py
│   ├── page-counter.py
│   └── citation-validator.py
├── skills/                     # Claude Code skills
│   └── dc-court-drafter.md
└── tools/                      # Utility scripts
    ├── pdf-analyzer.py
    └── form-filler.py
```

## Data Sources

All rules sourced from official court websites:
- https://www.dcd.uscourts.gov/court-info/local-rules-and-orders/local-rules
- https://www.dcd.uscourts.gov/new-case-forms
- https://www.dcd.uscourts.gov/general-civil-forms

## Usage

```bash
# Validate a document
python validators/format-checker.py document.pdf

# Draft a motion
claude-code --skill dc-court-drafter "Draft motion to dismiss for case 1:24-cv-00123-ABC"

# Fill a form
python tools/form-filler.py --form civil-cover-sheet --case-data case.json
```

## License

Internal use - IGTA-Tech
