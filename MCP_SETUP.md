# MCP Server Setup for Claude Code

This guide explains how to set up the DC Court Drafter MCP server with Claude Code.

## Prerequisites

- Node.js 18+ installed
- Claude Code CLI installed
- npm or pnpm

## Installation

### 1. Install Dependencies

```bash
cd dc-federal-court-drafter/mcp-server
npm install
```

### 2. Build the Server

```bash
npm run build
```

### 3. Configure Claude Code

Add the server to your Claude Code MCP configuration.

#### Windows

Create or edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dc-court-drafter": {
      "command": "node",
      "args": ["C:\\Users\\IGTA\\dc-federal-court-drafter\\mcp-server\\dist\\index.js"]
    }
  }
}
```

#### macOS/Linux

Create or edit `~/.config/claude-code/settings.json` or use the Claude Code settings:

```json
{
  "mcpServers": {
    "dc-court-drafter": {
      "command": "node",
      "args": ["/path/to/dc-federal-court-drafter/mcp-server/dist/index.js"]
    }
  }
}
```

### 4. Restart Claude Code

After adding the configuration, restart Claude Code to load the MCP server.

## Available Tools

Once configured, you'll have access to these tools in Claude Code:

### Document Validation

```
validate_document
```
Validates documents against LCvR formatting requirements. Checks:
- Page limits (45 pages for motions, 25 for replies)
- Case number format (must include judge initials)
- Font (Times New Roman 12pt)
- Caption presence
- Signature block completeness
- Certificate of service

**Example usage in Claude Code:**
> "Validate my motion - it's 50 pages, case number 1:24-cv-00123-ABC"

### Rule Lookup

```
get_rule
```
Get the full text of any DC District Court Local Civil Rule.

**Example:**
> "What does LCvR 7(n) say about page limits?"

### Rule Search

```
search_rules
```
Search rules by keyword.

**Example:**
> "Search DC court rules for 'citation' requirements"

### Formatting Requirements

```
get_formatting_requirements
```
Get complete formatting requirements.

**Example:**
> "What are the DC court formatting requirements?"

### Caption Generator

```
generate_caption
```
Generate a properly formatted caption.

**Example:**
> "Generate a caption for John Doe v. Jane Smith, case 1:24-cv-00123-ABC, Motion to Dismiss"

### Signature Block Generator

```
generate_signature_block
```
Generate a signature block with all required fields.

**Example:**
> "Generate a signature block for attorney Jane Attorney, DC Bar 123456"

### Certificate of Service Generator

```
generate_certificate_of_service
```
Generate a certificate of service for electronic filing.

### Form URL Lookup

```
get_form_url
```
Get the official URL for DC court forms.

**Example:**
> "Get the URL for the civil cover sheet form"

### Deadline Information

```
get_deadlines
```
Get filing deadlines for motions practice.

## Available Resources

The server also provides resources you can reference:

- `dcourt://formatting` - Formatting requirements
- `dcourt://rules/LCvR_5.1` - Rule 5.1 (Document Form)
- `dcourt://rules/LCvR_7` - Rule 7 (Motions)
- `dcourt://rules/LCvR_5.4` - Rule 5.4 (Electronic Filing)
- `dcourt://templates/motion` - Motion template

## Example Workflow

1. **Start drafting:**
   > "I need to draft a motion to dismiss for case 1:24-cv-00123-ABC"

2. **Generate caption:**
   > "Generate the caption for Acme Corp v. Widget Inc, motion to dismiss"

3. **Check formatting:**
   > "What are the formatting requirements?"

4. **Validate before filing:**
   > "Validate my document - 30 pages, has caption, has signature block, Times New Roman 12pt"

5. **Get form:**
   > "I need to file the civil cover sheet - what's the URL?"

## Troubleshooting

### Server not loading

1. Check the path in your config is correct
2. Ensure the server is built (`npm run build`)
3. Check Node.js is installed and in PATH
4. Look for errors in Claude Code logs

### Rules not found

The server loads rules from `knowledge/rules/`. Ensure these JSON files exist.

### Tools not appearing

Restart Claude Code after configuration changes.

## Development

To run in development mode with hot reload:

```bash
npm run dev
```

To watch for changes:

```bash
npm run watch
```
