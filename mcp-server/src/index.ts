#!/usr/bin/env node

/**
 * DC Federal Court Document Drafter MCP Server
 *
 * Provides tools for drafting and validating court documents
 * following DC District Court Local Civil Rules (LCvR).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  CourtListenerClient,
  DC_COURT_IDS,
  DC_JUDGES,
  IMMIGRATION_NOS_CODES,
  formatDocket,
  formatDocketEntries,
  formatOpinionCluster,
  formatParties,
  formatSearchResult,
} from "./courtlistener.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to knowledge base
const KNOWLEDGE_PATH = path.join(__dirname, "..", "..", "knowledge");
const RULES_PATH = path.join(KNOWLEDGE_PATH, "rules");
const TEMPLATES_PATH = path.join(__dirname, "..", "..", "templates");
const SCHEMAS_PATH = path.join(__dirname, "..", "..", "schemas");

// Load rules into memory
interface RuleChunk {
  id: string;
  section: string;
  title: string;
  content: string;
  requirements?: Record<string, unknown>;
  keywords?: string[];
}

interface RuleFile {
  rule_number: string;
  title: string;
  chunks: RuleChunk[];
}

let rulesCache: Map<string, RuleFile> = new Map();
let allChunks: RuleChunk[] = [];

// CourtListener client (initialized if token available)
let courtListenerClient: CourtListenerClient | null = null;

function loadRules(): void {
  try {
    const ruleFiles = fs.readdirSync(RULES_PATH).filter(f => f.endsWith(".json"));

    for (const file of ruleFiles) {
      const filePath = path.join(RULES_PATH, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const rule: RuleFile = JSON.parse(content);
      rulesCache.set(rule.rule_number, rule);
      allChunks.push(...rule.chunks);
    }

    console.error(`Loaded ${rulesCache.size} rule files with ${allChunks.length} chunks`);
  } catch (error) {
    console.error("Error loading rules:", error);
  }
}

// Load environment variables from .env file
function loadEnvFile(): void {
  try {
    const envPath = path.join(__dirname, "..", ".env");
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eqIndex = trimmed.indexOf("=");
          if (eqIndex > 0) {
            const key = trimmed.substring(0, eqIndex).trim();
            const value = trimmed.substring(eqIndex + 1).trim();
            process.env[key] = value;
          }
        }
      }
      console.error("Loaded environment from .env file");
    }
  } catch (error) {
    console.error("Error loading .env file:", error);
  }
}

// Initialize CourtListener client if token available
function initCourtListener(): void {
  const token = process.env.COURTLISTENER_API_TOKEN;
  if (token) {
    courtListenerClient = new CourtListenerClient({ apiToken: token });
    console.error("CourtListener API client initialized");
  } else {
    console.error("COURTLISTENER_API_TOKEN not set - CourtListener tools will be unavailable");
  }
}

// Formatting requirements
const FORMAT_REQUIREMENTS = {
  font: { name: "Times New Roman", size: 12 },
  spacing: { lines: "double", sentences: 2 },
  margins: { minimum_inches: 1.0 },
  page_limits: { motion: 45, opposition: 45, reply: 25 },
  file_format: { type: "PDF", searchable: true },
  case_number_pattern: /^1:\d{2}-cv-\d{5}-[A-Z]{2,4}$/,
};

// Create MCP server
const server = new Server(
  {
    name: "dc-court-drafter",
    version: "2.0.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// List available resources (rules, templates, etc.)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const resources = [];

  // Add rule resources
  for (const [ruleNumber, rule] of rulesCache) {
    resources.push({
      uri: `dcourt://rules/${ruleNumber.replace(/\s+/g, "_")}`,
      name: `${ruleNumber}: ${rule.title}`,
      description: `DC District Court ${ruleNumber}`,
      mimeType: "application/json",
    });
  }

  // Add formatting requirements
  resources.push({
    uri: "dcourt://formatting",
    name: "Formatting Requirements",
    description: "DC District Court document formatting requirements (LCvR 5.1, 7)",
    mimeType: "application/json",
  });

  // Add templates
  resources.push({
    uri: "dcourt://templates/motion",
    name: "Motion Template",
    description: "Template for drafting motions",
    mimeType: "text/markdown",
  });

  return { resources };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;

  if (uri === "dcourt://formatting") {
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(FORMAT_REQUIREMENTS, null, 2),
        },
      ],
    };
  }

  if (uri.startsWith("dcourt://rules/")) {
    const ruleId = uri.replace("dcourt://rules/", "").replace(/_/g, " ");
    const rule = rulesCache.get(ruleId);
    if (rule) {
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(rule, null, 2),
          },
        ],
      };
    }
  }

  if (uri === "dcourt://templates/motion") {
    try {
      const templatePath = path.join(TEMPLATES_PATH, "motion.md");
      const content = fs.readFileSync(templatePath, "utf-8");
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: content,
          },
        ],
      };
    } catch {
      throw new Error("Template not found");
    }
  }

  throw new Error(`Resource not found: ${uri}`);
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "validate_document",
        description: "Validate a document against DC District Court formatting requirements (LCvR 5.1, 7). Checks font, spacing, margins, page limits, caption, case number format, signature block, and citations.",
        inputSchema: {
          type: "object",
          properties: {
            document_type: {
              type: "string",
              enum: ["motion", "opposition", "reply", "complaint", "answer", "brief"],
              description: "Type of document being validated",
            },
            page_count: {
              type: "number",
              description: "Number of pages in the document",
            },
            case_number: {
              type: "string",
              description: "Case number (format: 1:YY-cv-NNNNN-ABC)",
            },
            has_caption: {
              type: "boolean",
              description: "Whether document has proper caption",
            },
            has_signature_block: {
              type: "boolean",
              description: "Whether document has complete signature block",
            },
            has_certificate_of_service: {
              type: "boolean",
              description: "Whether document has certificate of service",
            },
            font: {
              type: "string",
              description: "Font used in document",
            },
            font_size: {
              type: "number",
              description: "Font size in points",
            },
          },
          required: ["document_type"],
        },
      },
      {
        name: "get_rule",
        description: "Get the full text and requirements for a specific DC District Court Local Civil Rule",
        inputSchema: {
          type: "object",
          properties: {
            rule_number: {
              type: "string",
              description: "Rule number (e.g., 'LCvR 5.1', 'LCvR 7', 'LCvR 7(n)')",
            },
          },
          required: ["rule_number"],
        },
      },
      {
        name: "search_rules",
        description: "Search DC District Court rules by keyword or topic",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (e.g., 'page limits', 'font requirements', 'caption')",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_formatting_requirements",
        description: "Get all document formatting requirements for DC District Court filings",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "generate_caption",
        description: "Generate a properly formatted caption for a DC District Court document",
        inputSchema: {
          type: "object",
          properties: {
            plaintiff: {
              type: "string",
              description: "Plaintiff name(s)",
            },
            defendant: {
              type: "string",
              description: "Defendant name(s)",
            },
            case_number: {
              type: "string",
              description: "Case number with judge initials (e.g., 1:24-cv-00123-ABC)",
            },
            document_title: {
              type: "string",
              description: "Title of the document (e.g., MOTION TO DISMISS)",
            },
          },
          required: ["plaintiff", "defendant", "case_number", "document_title"],
        },
      },
      {
        name: "generate_signature_block",
        description: "Generate a properly formatted signature block for a DC District Court document",
        inputSchema: {
          type: "object",
          properties: {
            attorney_name: {
              type: "string",
              description: "Attorney's full name",
            },
            firm_name: {
              type: "string",
              description: "Law firm name (optional)",
            },
            address: {
              type: "string",
              description: "Office address",
            },
            phone: {
              type: "string",
              description: "Phone number",
            },
            email: {
              type: "string",
              description: "Email address",
            },
            dc_bar_number: {
              type: "string",
              description: "DC Bar number",
            },
            party_represented: {
              type: "string",
              description: "Party the attorney represents (e.g., 'Plaintiff', 'Defendant')",
            },
          },
          required: ["attorney_name", "address", "phone", "email", "dc_bar_number", "party_represented"],
        },
      },
      {
        name: "generate_certificate_of_service",
        description: "Generate a certificate of service for electronic filing",
        inputSchema: {
          type: "object",
          properties: {
            document_name: {
              type: "string",
              description: "Name of the document being served",
            },
            attorney_name: {
              type: "string",
              description: "Attorney's name for signature",
            },
            date: {
              type: "string",
              description: "Date of service (optional, defaults to today)",
            },
          },
          required: ["document_name", "attorney_name"],
        },
      },
      {
        name: "get_form_url",
        description: "Get the URL for a specific DC District Court form",
        inputSchema: {
          type: "object",
          properties: {
            form_name: {
              type: "string",
              description: "Name of the form (e.g., 'civil cover sheet', 'summons', 'notice of appeal')",
            },
          },
          required: ["form_name"],
        },
      },
      {
        name: "get_deadlines",
        description: "Get filing deadlines for motions practice",
        inputSchema: {
          type: "object",
          properties: {
            motion_type: {
              type: "string",
              description: "Type of motion or filing",
            },
          },
          required: ["motion_type"],
        },
      },
      // CourtListener API Tools
      {
        name: "search_dc_cases",
        description: "Search DC District Court cases by party name, keyword, judge, or date range using CourtListener. Returns dockets with case information.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (party name, keyword, or phrase)",
            },
            judge: {
              type: "string",
              description: "Filter by judge name (e.g., 'Kollar-Kotelly', 'Contreras')",
            },
            date_filed_after: {
              type: "string",
              description: "Filter cases filed after this date (YYYY-MM-DD)",
            },
            date_filed_before: {
              type: "string",
              description: "Filter cases filed before this date (YYYY-MM-DD)",
            },
            nature_of_suit: {
              type: "string",
              description: "Nature of suit code (e.g., '462' for naturalization, '463' for habeas)",
            },
            open_cases_only: {
              type: "boolean",
              description: "Only return cases that have not been terminated",
            },
            max_results: {
              type: "number",
              description: "Maximum number of results (default: 10, max: 50)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_case_docket",
        description: "Get the full docket for a specific case by docket ID, including all entries and filings.",
        inputSchema: {
          type: "object",
          properties: {
            docket_id: {
              type: "number",
              description: "CourtListener docket ID",
            },
            include_entries: {
              type: "boolean",
              description: "Include docket entries (default: true)",
            },
            max_entries: {
              type: "number",
              description: "Maximum number of docket entries to return (default: 50)",
            },
          },
          required: ["docket_id"],
        },
      },
      {
        name: "get_document_content",
        description: "Get the content/text of a specific court document by its RECAP document ID.",
        inputSchema: {
          type: "object",
          properties: {
            document_id: {
              type: "number",
              description: "CourtListener RECAP document ID",
            },
          },
          required: ["document_id"],
        },
      },
      {
        name: "get_case_parties",
        description: "Get all parties and their attorneys for a specific case.",
        inputSchema: {
          type: "object",
          properties: {
            docket_id: {
              type: "number",
              description: "CourtListener docket ID",
            },
          },
          required: ["docket_id"],
        },
      },
      {
        name: "search_opinions",
        description: "Search case law and judicial opinions from DC courts. Returns published decisions with citations.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query (legal issue, statute, or phrase)",
            },
            court: {
              type: "string",
              enum: ["dcd", "cadc", "both"],
              description: "Court: dcd (DC District), cadc (DC Circuit), or both",
            },
            date_filed_after: {
              type: "string",
              description: "Filter opinions after this date (YYYY-MM-DD)",
            },
            date_filed_before: {
              type: "string",
              description: "Filter opinions before this date (YYYY-MM-DD)",
            },
            cited_more_than: {
              type: "number",
              description: "Only return opinions cited more than N times",
            },
            max_results: {
              type: "number",
              description: "Maximum number of results (default: 10, max: 50)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_citing_cases",
        description: "Find all cases that cite a given opinion. Useful for checking if a case is still good law.",
        inputSchema: {
          type: "object",
          properties: {
            cluster_id: {
              type: "number",
              description: "CourtListener opinion cluster ID",
            },
            max_results: {
              type: "number",
              description: "Maximum number of citing cases to return (default: 20)",
            },
          },
          required: ["cluster_id"],
        },
      },
      {
        name: "lookup_citation",
        description: "Look up a case by its citation (e.g., '550 U.S. 544' for Twombly, '556 U.S. 662' for Iqbal).",
        inputSchema: {
          type: "object",
          properties: {
            citation: {
              type: "string",
              description: "Citation in standard format (e.g., '550 U.S. 544', '123 F.3d 456')",
            },
          },
          required: ["citation"],
        },
      },
      {
        name: "search_similar_filings",
        description: "Search for similar motions or filings in DC District Court cases. Useful for finding examples of specific document types.",
        inputSchema: {
          type: "object",
          properties: {
            filing_type: {
              type: "string",
              description: "Type of filing to search for (e.g., 'motion to dismiss', 'summary judgment', 'mandamus')",
            },
            topic: {
              type: "string",
              description: "Topic or subject matter (e.g., 'visa delay', 'FOIA', 'APA')",
            },
            date_filed_after: {
              type: "string",
              description: "Filter filings after this date (YYYY-MM-DD)",
            },
            max_results: {
              type: "number",
              description: "Maximum number of results (default: 10)",
            },
          },
          required: ["filing_type"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "validate_document": {
      const issues: string[] = [];
      const warnings: string[] = [];

      // Check page limits
      if (args?.page_count) {
        const pageCount = args.page_count as number;
        const docType = (args.document_type as string) || "motion";

        let maxPages = FORMAT_REQUIREMENTS.page_limits.motion;
        if (docType === "reply") {
          maxPages = FORMAT_REQUIREMENTS.page_limits.reply;
        }

        if (pageCount > maxPages) {
          issues.push(`Page count (${pageCount}) exceeds ${maxPages}-page limit for ${docType}. Per LCvR 7(n)(1), you must file a motion for leave to exceed page limits.`);
        }
      }

      // Check case number format
      if (args?.case_number) {
        const caseNum = args.case_number as string;
        if (!FORMAT_REQUIREMENTS.case_number_pattern.test(caseNum)) {
          issues.push(`Case number "${caseNum}" does not match required format 1:YY-cv-NNNNN-ABC. Per LCvR 5.1(c)(1), case number must include judge initials.`);
        }
      }

      // Check font
      if (args?.font) {
        const font = args.font as string;
        if (!font.toLowerCase().includes("times")) {
          issues.push(`Font "${font}" does not comply. Per LCvR 7(o)(1), documents must use 12-point Times New Roman.`);
        }
      }

      // Check font size
      if (args?.font_size) {
        const size = args.font_size as number;
        if (size !== 12) {
          issues.push(`Font size ${size}pt does not comply. Per LCvR 7(o)(1), documents must use 12-point font.`);
        }
      }

      // Check caption
      if (args?.has_caption === false) {
        issues.push("Document missing caption. Per LCvR 5.1(b), every paper must contain a caption with court name, case title, file number, and document description.");
      }

      // Check signature block
      if (args?.has_signature_block === false) {
        issues.push("Document missing signature block. Per LCvR 5.1(d), documents must include attorney name, address, telephone, and DC Bar number.");
      }

      // Check certificate of service
      if (args?.has_certificate_of_service === false && args?.document_type !== "complaint") {
        warnings.push("Document may need certificate of service. Per LCvR 5.3, all documents after case initiation must include certificate of service.");
      }

      const isValid = issues.length === 0;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              valid: isValid,
              issues,
              warnings,
              formatting_requirements: {
                font: "Times New Roman, 12pt",
                spacing: "Double-spaced, 2 spaces between sentences",
                margins: "Minimum 1 inch all sides",
                page_numbers: "Required",
                file_format: "Text-searchable PDF",
              },
            }, null, 2),
          },
        ],
      };
    }

    case "get_rule": {
      const ruleNumber = (args?.rule_number as string) || "";

      // Try exact match first
      let rule = rulesCache.get(ruleNumber);

      // Try partial match
      if (!rule) {
        for (const [key, value] of rulesCache) {
          if (key.toLowerCase().includes(ruleNumber.toLowerCase()) ||
              ruleNumber.toLowerCase().includes(key.toLowerCase())) {
            rule = value;
            break;
          }
        }
      }

      // Search chunks for subsection
      if (!rule) {
        const matchingChunks = allChunks.filter(chunk =>
          chunk.section.toLowerCase().includes(ruleNumber.toLowerCase()) ||
          chunk.id.toLowerCase().includes(ruleNumber.toLowerCase().replace(/\s+/g, "_"))
        );

        if (matchingChunks.length > 0) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  query: ruleNumber,
                  results: matchingChunks,
                }, null, 2),
              },
            ],
          };
        }
      }

      if (rule) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(rule, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Rule "${ruleNumber}" not found. Available rules: ${Array.from(rulesCache.keys()).join(", ")}`,
          },
        ],
      };
    }

    case "search_rules": {
      const query = ((args?.query as string) || "").toLowerCase();

      const results = allChunks.filter(chunk => {
        const searchText = `${chunk.title} ${chunk.content} ${chunk.keywords?.join(" ") || ""}`.toLowerCase();
        return searchText.includes(query);
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              query,
              result_count: results.length,
              results: results.map(r => ({
                section: r.section,
                title: r.title,
                content: r.content,
                requirements: r.requirements,
              })),
            }, null, 2),
          },
        ],
      };
    }

    case "get_formatting_requirements": {
      const schemaPath = path.join(SCHEMAS_PATH, "document-format.json");
      let schema = {};

      try {
        schema = JSON.parse(fs.readFileSync(schemaPath, "utf-8"));
      } catch {
        schema = FORMAT_REQUIREMENTS;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              summary: {
                font: "Times New Roman, 12 point",
                line_spacing: "Double-spaced",
                sentence_spacing: "Two spaces between sentences",
                margins: "Minimum 1 inch on all sides",
                page_numbers: "Required on all pages",
                page_limits: {
                  motion_memorandum: "45 pages maximum",
                  opposition_memorandum: "45 pages maximum",
                  reply_memorandum: "25 pages maximum",
                },
                file_format: "Text-searchable PDF",
                citations: "Pin cites (exact page references) required",
                case_number: "Must include judge initials (format: 1:YY-cv-NNNNN-ABC)",
                signature_block: "Name, address, phone, email, DC Bar number",
              },
              rule_references: {
                formatting: "LCvR 7(o)(1)",
                page_limits: "LCvR 7(n)(1)",
                citations: "LCvR 7(o)(2)",
                caption: "LCvR 5.1(b)(c)",
                signature: "LCvR 5.1(d)",
                electronic_filing: "LCvR 5.4",
              },
              full_schema: schema,
            }, null, 2),
          },
        ],
      };
    }

    case "generate_caption": {
      const plaintiff = args?.plaintiff || "[PLAINTIFF NAME]";
      const defendant = args?.defendant || "[DEFENDANT NAME]";
      const caseNumber = args?.case_number || "1:XX-cv-XXXXX-XXX";
      const docTitle = args?.document_title || "[DOCUMENT TITLE]";

      const caption = `                    UNITED STATES DISTRICT COURT
                    FOR THE DISTRICT OF COLUMBIA

________________________________________
                                        )
${String(plaintiff).toUpperCase().padEnd(40, " ")})
                                        )
               Plaintiff,               )    Case No. ${caseNumber}
                                        )
          v.                            )
                                        )
${String(defendant).toUpperCase().padEnd(40, " ")})
                                        )
               Defendant.               )
________________________________________)

               ${String(docTitle).toUpperCase()}
`;

      return {
        content: [
          {
            type: "text",
            text: caption,
          },
        ],
      };
    }

    case "generate_signature_block": {
      const today = new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      const block = `Dated: ${today}                    Respectfully submitted,

                                   /s/ ${args?.attorney_name}
                                   ${args?.attorney_name}
${args?.firm_name ? `                                   ${args.firm_name}\n` : ""}                                   ${args?.address}
                                   Tel: ${args?.phone}
                                   Email: ${args?.email}
                                   DC Bar No. ${args?.dc_bar_number}

                                   Counsel for ${args?.party_represented}`;

      return {
        content: [
          {
            type: "text",
            text: block,
          },
        ],
      };
    }

    case "generate_certificate_of_service": {
      const date = args?.date || new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      const cert = `                         CERTIFICATE OF SERVICE

     I hereby certify that on ${date}, a copy of the foregoing
${args?.document_name} was served via the Court's CM/ECF system on all
counsel of record.


                                   /s/ ${args?.attorney_name}
                                   ${args?.attorney_name}`;

      return {
        content: [
          {
            type: "text",
            text: cert,
          },
        ],
      };
    }

    case "get_form_url": {
      const formName = ((args?.form_name as string) || "").toLowerCase();

      const forms: Record<string, { name: string; url: string }> = {
        "civil cover sheet": {
          name: "Civil Cover Sheet (JS-44)",
          url: "https://www.dcd.uscourts.gov/sites/dcd/files/CivilCoverSheetJS44_Nov_2020FILL.pdf",
        },
        "js-44": {
          name: "Civil Cover Sheet (JS-44)",
          url: "https://www.dcd.uscourts.gov/sites/dcd/files/CivilCoverSheetJS44_Nov_2020FILL.pdf",
        },
        "corporate disclosure": {
          name: "Certificate Under LCvR 26.1",
          url: "https://www.dcd.uscourts.gov/sites/dcd/files/CO386-online.pdf",
        },
        "lcvr 26.1": {
          name: "Certificate Under LCvR 26.1",
          url: "https://www.dcd.uscourts.gov/sites/dcd/files/CO386-online.pdf",
        },
        "related cases": {
          name: "Notice of Designation of Related Cases",
          url: "https://www.dcd.uscourts.gov/sites/dcd/files/RelatedCaseCO932.pdf",
        },
        "summons": {
          name: "Summons in Civil Action (21/60-day)",
          url: "https://www.dcd.uscourts.gov/sites/dcd/files/CivilSummonsAO440_2015FILL.pdf",
        },
        "foia summons": {
          name: "Summons - FOIA (30-day)",
          url: "https://www.dcd.uscourts.gov/sites/dcd/files/Summons-FOIA_2013_FILL.pdf",
        },
        "notice of appeal": {
          name: "Notice of Appeal in Civil Case",
          url: "https://www.dcd.uscourts.gov/sites/dcd/files/NoticeofAppeal_Aug2017.pdf",
        },
        "subpoena": {
          name: "Subpoena to Testify at Hearing/Trial",
          url: "http://www.uscourts.gov/uscourts/FormsAndFees/Forms/AO088.pdf",
        },
        "bill of costs": {
          name: "Bill of Costs (AO 133)",
          url: "http://www.uscourts.gov/uscourts/FormsAndFees/Forms/AO133.pdf",
        },
      };

      // Find matching form
      let match = forms[formName];
      if (!match) {
        for (const [key, value] of Object.entries(forms)) {
          if (key.includes(formName) || formName.includes(key)) {
            match = value;
            break;
          }
        }
      }

      if (match) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                form: match.name,
                url: match.url,
                note: "Form hosted on official DC District Court website",
              }, null, 2),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: `Form "${args?.form_name}" not found`,
              available_forms: Object.entries(forms).map(([k, v]) => `${k}: ${v.name}`),
              forms_index: "https://www.dcd.uscourts.gov/new-case-forms",
            }, null, 2),
          },
        ],
      };
    }

    case "get_deadlines": {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              motions_practice: {
                opposition: {
                  deadline: "14 days from service",
                  rule: "LCvR 7(c)",
                  consequence: "Motion may be treated as conceded if not filed",
                },
                reply: {
                  deadline: "7 days after opposition",
                  rule: "LCvR 7(d)",
                  note: "Reply is optional",
                },
              },
              filing_deadline: {
                daily: "11:59 PM Eastern Time",
                rule: "LCvR 5.4(d)",
                note: "Must complete filing before midnight to be timely",
              },
              nonconforming_documents: {
                correction_deadline: "End of next business day",
                rule: "LCvR 5.1(e)",
                consequence: "May be stricken if not corrected",
              },
            }, null, 2),
          },
        ],
      };
    }

    // ========================================================================
    // CourtListener API Tools
    // ========================================================================

    case "search_dc_cases": {
      if (!courtListenerClient) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "CourtListener API not configured",
                message: "Set COURTLISTENER_API_TOKEN environment variable to enable case search.",
              }, null, 2),
            },
          ],
        };
      }

      const query = args?.query as string;
      const maxResults = Math.min((args?.max_results as number) || 10, 50);

      try {
        // Use full-text search for dockets
        const searchParams: Record<string, string | number | boolean | undefined> = {
          q: query,
          type: "r" as const, // RECAP (docket) search
          court: DC_COURT_IDS.district,
          page_size: maxResults,
        };

        if (args?.date_filed_after) {
          searchParams.filed_after = args.date_filed_after as string;
        }
        if (args?.date_filed_before) {
          searchParams.filed_before = args.date_filed_before as string;
        }
        if (args?.judge) {
          searchParams.q = `${query} judge:"${args.judge}"`;
        }

        const results = await courtListenerClient.fullTextSearch(searchParams as any);

        const formattedResults = results.results.map(r => ({
          case_name: r.caseName,
          docket_id: r.docket_id,
          court: r.court,
          date_filed: r.dateFiled,
          judge: r.judge,
          nature_of_suit: r.suitNature,
          snippet: r.snippet?.replace(/<[^>]+>/g, ""),
          url: `https://www.courtlistener.com${r.docket_absolute_url}`,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                query,
                total_results: results.count,
                showing: formattedResults.length,
                results: formattedResults,
                dc_judges: DC_JUDGES,
                immigration_nos_codes: IMMIGRATION_NOS_CODES,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Search failed",
                message: error instanceof Error ? error.message : String(error),
              }, null, 2),
            },
          ],
        };
      }
    }

    case "get_case_docket": {
      if (!courtListenerClient) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "CourtListener API not configured",
              }, null, 2),
            },
          ],
        };
      }

      const docketId = args?.docket_id as number;
      const includeEntries = args?.include_entries !== false;
      const maxEntries = (args?.max_entries as number) || 50;

      try {
        const docket = await courtListenerClient.getDocket(docketId);
        const result: Record<string, unknown> = {
          docket: {
            id: docket.id,
            case_name: docket.case_name,
            docket_number: docket.docket_number,
            court: docket.court_id,
            date_filed: docket.date_filed,
            date_terminated: docket.date_terminated,
            judge: docket.assigned_to_str,
            nature_of_suit: docket.nature_of_suit,
            cause: docket.cause,
            url: `https://www.courtlistener.com/docket/${docket.id}/${docket.slug}/`,
          },
        };

        if (includeEntries) {
          const entriesResponse = await courtListenerClient.getDocketEntries(docketId, {
            page_size: maxEntries,
          });
          result.entries = entriesResponse.results.map(e => ({
            entry_number: e.entry_number,
            date_filed: e.date_filed,
            description: e.description,
            documents: e.recap_documents?.map(d => ({
              id: d.id,
              document_number: d.document_number,
              description: d.description,
              page_count: d.page_count,
              is_available: d.is_available,
            })),
          }));
          result.total_entries = entriesResponse.count;
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to get docket",
                message: error instanceof Error ? error.message : String(error),
              }, null, 2),
            },
          ],
        };
      }
    }

    case "get_document_content": {
      if (!courtListenerClient) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "CourtListener API not configured",
              }, null, 2),
            },
          ],
        };
      }

      const documentId = args?.document_id as number;

      try {
        const doc = await courtListenerClient.getDocument(documentId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                id: doc.id,
                document_number: doc.document_number,
                description: doc.description,
                page_count: doc.page_count,
                is_available: doc.is_available,
                plain_text: doc.plain_text || "(Text not available - document may need OCR processing)",
                date_created: doc.date_created,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to get document",
                message: error instanceof Error ? error.message : String(error),
              }, null, 2),
            },
          ],
        };
      }
    }

    case "get_case_parties": {
      if (!courtListenerClient) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "CourtListener API not configured",
              }, null, 2),
            },
          ],
        };
      }

      const docketId = args?.docket_id as number;

      try {
        const partiesResponse = await courtListenerClient.getParties(docketId, {
          page_size: 100,
        });

        const formattedParties = partiesResponse.results.map(p => ({
          name: p.name,
          type: p.type_name,
          attorneys: p.attorneys?.map(a => ({
            name: a.name,
            email: a.email,
            phone: a.phone,
            roles: a.roles,
          })),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                docket_id: docketId,
                total_parties: partiesResponse.count,
                parties: formattedParties,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to get parties",
                message: error instanceof Error ? error.message : String(error),
              }, null, 2),
            },
          ],
        };
      }
    }

    case "search_opinions": {
      if (!courtListenerClient) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "CourtListener API not configured",
              }, null, 2),
            },
          ],
        };
      }

      const query = args?.query as string;
      const court = args?.court as string || "dcd";
      const maxResults = Math.min((args?.max_results as number) || 10, 50);

      try {
        const searchParams: Record<string, string | number | boolean | undefined> = {
          q: query,
          type: "o" as const, // Opinion search
          page_size: maxResults,
        };

        if (court === "both") {
          searchParams.court = `${DC_COURT_IDS.district},${DC_COURT_IDS.circuit}`;
        } else if (court === "cadc") {
          searchParams.court = DC_COURT_IDS.circuit;
        } else {
          searchParams.court = DC_COURT_IDS.district;
        }

        if (args?.date_filed_after) {
          searchParams.filed_after = args.date_filed_after as string;
        }
        if (args?.date_filed_before) {
          searchParams.filed_before = args.date_filed_before as string;
        }
        if (args?.cited_more_than) {
          searchParams.cited_gt = args.cited_more_than as number;
        }

        const results = await courtListenerClient.fullTextSearch(searchParams as any);

        const formattedResults = results.results.map(r => ({
          case_name: r.caseName,
          cluster_id: r.id,
          court: r.court,
          date_filed: r.dateFiled,
          citations: r.citation,
          judge: r.judge,
          citation_count: r.citeCount,
          status: r.status,
          snippet: r.snippet?.replace(/<[^>]+>/g, ""),
          url: `https://www.courtlistener.com${r.absolute_url}`,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                query,
                court: court === "both" ? "DC District & Circuit" : court === "cadc" ? "DC Circuit" : "DC District",
                total_results: results.count,
                showing: formattedResults.length,
                results: formattedResults,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Search failed",
                message: error instanceof Error ? error.message : String(error),
              }, null, 2),
            },
          ],
        };
      }
    }

    case "get_citing_cases": {
      if (!courtListenerClient) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "CourtListener API not configured",
              }, null, 2),
            },
          ],
        };
      }

      const clusterId = args?.cluster_id as number;
      const maxResults = (args?.max_results as number) || 20;

      try {
        // First get the original opinion info
        const originalCluster = await courtListenerClient.getOpinionCluster(clusterId);

        // Then get citing cases
        const citingResponse = await courtListenerClient.getCitingOpinions(clusterId, {
          page_size: maxResults,
        });

        const citingCases = citingResponse.results.map(c => ({
          case_name: c.case_name,
          cluster_id: c.id,
          date_filed: c.date_filed,
          citations: c.citations?.map(cit => `${cit.volume} ${cit.reporter} ${cit.page}`),
          court: c.docket ? "See docket" : "Unknown",
          citation_count: c.citation_count,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                original_case: {
                  case_name: originalCluster.case_name,
                  citations: originalCluster.citations?.map(c => `${c.volume} ${c.reporter} ${c.page}`),
                  date_filed: originalCluster.date_filed,
                  total_citation_count: originalCluster.citation_count,
                },
                citing_cases: {
                  total: citingResponse.count,
                  showing: citingCases.length,
                  cases: citingCases,
                },
                note: originalCluster.citation_count > 0
                  ? "This case is still being cited - check recent citations for any negative treatment"
                  : "No citations found in CourtListener database",
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to get citing cases",
                message: error instanceof Error ? error.message : String(error),
              }, null, 2),
            },
          ],
        };
      }
    }

    case "lookup_citation": {
      if (!courtListenerClient) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "CourtListener API not configured",
              }, null, 2),
            },
          ],
        };
      }

      const citation = args?.citation as string;

      try {
        // Try searching for the citation
        const searchResult = await courtListenerClient.fullTextSearch({
          q: `"${citation}"`,
          type: "o",
        });

        if (searchResult.count > 0) {
          const result = searchResult.results[0];
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  citation_searched: citation,
                  found: true,
                  case: {
                    case_name: result.caseName,
                    cluster_id: result.id,
                    court: result.court,
                    date_filed: result.dateFiled,
                    all_citations: result.citation,
                    judge: result.judge,
                    citation_count: result.citeCount,
                    url: `https://www.courtlistener.com${result.absolute_url}`,
                  },
                  snippet: result.snippet?.replace(/<[^>]+>/g, ""),
                }, null, 2),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                citation_searched: citation,
                found: false,
                message: "Citation not found in CourtListener database. Try searching by case name instead.",
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Citation lookup failed",
                message: error instanceof Error ? error.message : String(error),
              }, null, 2),
            },
          ],
        };
      }
    }

    case "search_similar_filings": {
      if (!courtListenerClient) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "CourtListener API not configured",
              }, null, 2),
            },
          ],
        };
      }

      const filingType = args?.filing_type as string;
      const topic = args?.topic as string;
      const maxResults = Math.min((args?.max_results as number) || 10, 50);

      try {
        let query = filingType;
        if (topic) {
          query = `${filingType} ${topic}`;
        }

        const searchParams: Record<string, string | number | boolean | undefined> = {
          q: query,
          type: "r" as const, // RECAP search
          court: DC_COURT_IDS.district,
          page_size: maxResults,
        };

        if (args?.date_filed_after) {
          searchParams.filed_after = args.date_filed_after as string;
        }

        const results = await courtListenerClient.fullTextSearch(searchParams as any);

        const formattedResults = results.results.map(r => ({
          case_name: r.caseName,
          docket_id: r.docket_id,
          court: r.court,
          date_filed: r.dateFiled,
          judge: r.judge,
          snippet: r.snippet?.replace(/<[^>]+>/g, ""),
          docket_url: `https://www.courtlistener.com${r.docket_absolute_url}`,
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                search_query: query,
                filing_type: filingType,
                topic: topic || null,
                total_results: results.count,
                showing: formattedResults.length,
                results: formattedResults,
                tip: "Use get_case_docket with a docket_id to see all filings in a case",
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Search failed",
                message: error instanceof Error ? error.message : String(error),
              }, null, 2),
            },
          ],
        };
      }
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Main entry point
async function main() {
  // Load environment variables
  loadEnvFile();

  // Load rules on startup
  loadRules();

  // Initialize CourtListener client
  initCourtListener();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DC Court Drafter MCP server running on stdio");
}

main().catch(console.error);
