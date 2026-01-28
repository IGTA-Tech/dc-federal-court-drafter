/**
 * CourtListener API Client
 *
 * Provides access to CourtListener's REST API for searching case law,
 * dockets, and legal opinions from the DC District Court and DC Circuit.
 *
 * API Documentation: https://www.courtlistener.com/help/api/rest/
 */

// ============================================================================
// Configuration & Constants
// ============================================================================

export interface CourtListenerConfig {
  apiToken: string;
  baseUrl?: string;
}

const DEFAULT_BASE_URL = "https://www.courtlistener.com/api/rest/v4";

// DC Court identifiers
export const DC_COURT_IDS = {
  district: "dcd",      // DC District Court
  circuit: "cadc",      // DC Circuit Court of Appeals
} as const;

// Immigration-related Nature of Suit codes
export const IMMIGRATION_NOS_CODES = [
  "462",  // Naturalization Application
  "463",  // Habeas Corpus - Alien Detainee
  "465",  // Other Immigration Actions
];

// Common DC District Court judges (for filtering)
export const DC_JUDGES = [
  "Kollar-Kotelly",
  "Contreras",
  "Cooper",
  "Jackson",
  "Boasberg",
  "Howell",
  "Walton",
  "Mehta",
  "Chutkan",
  "Bates",
  "Lamberth",
  "Moss",
  "McFadden",
  "Friedrich",
  "Kelly",
  "Nichols",
];

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Docket {
  id: number;
  resource_uri: string;
  court: string;
  court_id: string;
  pacer_case_id: string | null;
  docket_number: string;
  docket_number_core: string;
  case_name: string;
  case_name_short: string;
  slug: string;
  date_filed: string | null;
  date_terminated: string | null;
  date_last_filing: string | null;
  cause: string | null;
  nature_of_suit: string | null;
  jury_demand: string | null;
  jurisdiction_type: string | null;
  assigned_to: number | null;
  assigned_to_str: string | null;
  referred_to: number | null;
  referred_to_str: string | null;
  date_created: string;
  date_modified: string;
  source: number;
  appeal_from: string | null;
  appeal_from_str: string | null;
  filepath_local: string | null;
  filepath_ia: string | null;
  filepath_ia_json: string | null;
  ia_upload_failure_count: number | null;
  ia_needs_upload: boolean | null;
  ia_date_first_changed: string | null;
  view_count: number;
  date_blocked: string | null;
  blocked: boolean;
  appellate_fee_status: string | null;
  appellate_case_type_information: string | null;
  mdl_status: string | null;
  filepath_local_size: number | null;
  originating_court_information: string | null;
  idb_data: string | null;
}

export interface DocketEntry {
  id: number;
  resource_uri: string;
  docket: string;
  date_filed: string | null;
  date_created: string;
  date_modified: string;
  entry_number: number | null;
  recap_sequence_number: string | null;
  pacer_sequence_number: number | null;
  description: string;
  tags: string[];
  recap_documents: RecapDocument[];
}

export interface RecapDocument {
  id: number;
  resource_uri: string;
  docket_entry: string;
  document_number: string;
  attachment_number: number | null;
  pacer_doc_id: string;
  is_available: boolean;
  is_free_on_pacer: boolean | null;
  is_sealed: boolean | null;
  sha1: string | null;
  page_count: number | null;
  filepath_local: string | null;
  filepath_ia: string | null;
  ia_upload_failure_count: number | null;
  description: string;
  plain_text: string;
  ocr_status: number | null;
  date_created: string;
  date_modified: string;
  date_upload: string | null;
}

export interface Party {
  id: number;
  resource_uri: string;
  docket: string;
  name: string;
  type: number;
  type_name: string;
  extra_info: string | null;
  date_created: string;
  date_modified: string;
  attorneys: Attorney[];
}

export interface Attorney {
  id: number;
  resource_uri: string;
  name: string;
  contact_raw: string;
  phone: string | null;
  fax: string | null;
  email: string | null;
  date_created: string;
  date_modified: string;
  roles: string[];
}

export interface Opinion {
  id: number;
  resource_uri: string;
  cluster: string;
  cluster_id: number;
  author: string | null;
  author_str: string | null;
  per_curiam: boolean;
  joined_by: string[];
  type: string;
  sha1: string;
  page_count: number | null;
  download_url: string | null;
  local_path: string | null;
  plain_text: string;
  html: string | null;
  html_lawbox: string | null;
  html_columbia: string | null;
  html_with_citations: string | null;
  extracted_by_ocr: boolean;
  opinions_cited: string[];
  date_created: string;
  date_modified: string;
}

export interface OpinionCluster {
  id: number;
  resource_uri: string;
  docket: string;
  docket_id: number;
  panel: string[];
  non_participating_judges: string[];
  judges: string;
  per_curiam: boolean;
  date_filed: string;
  date_filed_is_approximate: boolean;
  slug: string;
  citation_count: number;
  precedential_status: string;
  date_blocked: string | null;
  blocked: boolean;
  filepath_json_harvard: string | null;
  arguments: string | null;
  headnotes: string | null;
  summary: string | null;
  disposition: string | null;
  history: string | null;
  other_dates: string | null;
  cross_reference: string | null;
  correction: string | null;
  case_name: string;
  case_name_short: string;
  case_name_full: string;
  attorneys: string | null;
  nature_of_suit: string | null;
  posture: string | null;
  syllabus: string | null;
  headmatter: string | null;
  procedural_history: string | null;
  citations: Citation[];
  sub_opinions: Opinion[];
}

export interface Citation {
  id: number;
  volume: number;
  reporter: string;
  page: string;
  type: number;
  cluster_id: number;
}

export interface CitationLookupResult {
  count: number;
  results: OpinionCluster[];
}

// ============================================================================
// Search Parameter Types
// ============================================================================

export interface DocketSearchParams {
  court?: string;              // Court ID (e.g., "dcd")
  court__in?: string;          // Multiple courts (comma-separated)
  case_name?: string;          // Case name search
  case_name__icontains?: string;
  docket_number?: string;      // Exact docket number
  docket_number__icontains?: string;
  nature_of_suit?: string;     // NOS code
  date_filed__gte?: string;    // Filed after (YYYY-MM-DD)
  date_filed__lte?: string;    // Filed before
  date_terminated__isnull?: boolean;  // Open cases only
  assigned_to_str__icontains?: string;  // Judge name
  page?: number;
  page_size?: number;
  order_by?: string;
}

export interface OpinionSearchParams {
  court?: string;
  court__in?: string;
  case_name?: string;
  case_name__icontains?: string;
  judge?: string;
  date_filed__gte?: string;
  date_filed__lte?: string;
  citation_count__gte?: number;
  precedential_status?: string;  // "Published", "Unpublished"
  page?: number;
  page_size?: number;
  order_by?: string;
}

export interface FullTextSearchParams {
  q: string;                    // Search query
  type: "o" | "r" | "d" | "p";  // opinions, recap, dockets, people
  court?: string;
  filed_after?: string;
  filed_before?: string;
  cited_gt?: number;
  cited_lt?: number;
  order_by?: string;
  stat_Precedential?: "on";
  stat_Non_Precedential?: "on";
  page?: number;
}

export interface SearchResult {
  absolute_url: string;
  caseName: string;
  caseNameShort: string;
  citation: string[];
  citeCount: number;
  court: string;
  court_citation_string: string;
  court_exact: string;
  court_id: string;
  dateFiled: string;
  dateArgued: string | null;
  docket_absolute_url: string;
  docket_id: number;
  id: number;
  judge: string;
  lexisCite: string;
  neutralCite: string;
  sibling_ids: number[];
  snippet: string;
  status: string;
  suitNature: string;
}

export interface SearchResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SearchResult[];
}

// ============================================================================
// CourtListener Client Class
// ============================================================================

export class CourtListenerClient {
  private apiToken: string;
  private baseUrl: string;

  constructor(config: CourtListenerConfig) {
    this.apiToken = config.apiToken;
    this.baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  }

  /**
   * Make authenticated API request
   */
  private async fetchApi<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Token ${this.apiToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`CourtListener API error (${response.status}): ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  // ==========================================================================
  // Docket Methods
  // ==========================================================================

  /**
   * Search for dockets (PACER case records)
   */
  async searchDockets(params: DocketSearchParams): Promise<PaginatedResponse<Docket>> {
    return this.fetchApi<PaginatedResponse<Docket>>("/dockets/", params as Record<string, string | number | boolean | undefined>);
  }

  /**
   * Get a specific docket by ID
   */
  async getDocket(docketId: number): Promise<Docket> {
    return this.fetchApi<Docket>(`/dockets/${docketId}/`);
  }

  /**
   * Get docket entries for a specific docket
   */
  async getDocketEntries(
    docketId: number,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<DocketEntry>> {
    return this.fetchApi<PaginatedResponse<DocketEntry>>("/docket-entries/", {
      docket: docketId,
      ...params,
    });
  }

  // ==========================================================================
  // Document Methods
  // ==========================================================================

  /**
   * Get a specific RECAP document
   */
  async getDocument(documentId: number): Promise<RecapDocument> {
    return this.fetchApi<RecapDocument>(`/recap-documents/${documentId}/`);
  }

  // ==========================================================================
  // Party & Attorney Methods
  // ==========================================================================

  /**
   * Get parties for a docket
   */
  async getParties(
    docketId: number,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<Party>> {
    return this.fetchApi<PaginatedResponse<Party>>("/parties/", {
      docket: docketId,
      ...params,
    });
  }

  /**
   * Get attorneys for a docket
   */
  async getAttorneys(
    docketId: number,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<Attorney>> {
    return this.fetchApi<PaginatedResponse<Attorney>>("/attorneys/", {
      docket: docketId,
      ...params,
    });
  }

  // ==========================================================================
  // Opinion Methods (Case Law)
  // ==========================================================================

  /**
   * Search opinion clusters
   */
  async searchOpinions(params: OpinionSearchParams): Promise<PaginatedResponse<OpinionCluster>> {
    return this.fetchApi<PaginatedResponse<OpinionCluster>>("/clusters/", params as Record<string, string | number | boolean | undefined>);
  }

  /**
   * Get a specific opinion cluster
   */
  async getOpinionCluster(clusterId: number): Promise<OpinionCluster> {
    return this.fetchApi<OpinionCluster>(`/clusters/${clusterId}/`);
  }

  /**
   * Get cases that cite a given opinion cluster
   */
  async getCitingOpinions(
    clusterId: number,
    params?: { page?: number; page_size?: number }
  ): Promise<PaginatedResponse<OpinionCluster>> {
    return this.fetchApi<PaginatedResponse<OpinionCluster>>("/clusters/", {
      cites: clusterId,
      ...params,
    });
  }

  /**
   * Look up a citation (e.g., "550 U.S. 544")
   */
  async lookupCitation(citation: string): Promise<CitationLookupResult> {
    // Parse citation format: "550 U.S. 544" -> volume=550, reporter=U.S., page=544
    const match = citation.match(/^(\d+)\s+([A-Za-z0-9.\s]+?)\s+(\d+)$/);

    if (match) {
      const [, volume, reporter, page] = match;
      return this.fetchApi<CitationLookupResult>("/citations/", {
        volume: parseInt(volume),
        reporter: reporter.trim(),
        page: page,
      });
    }

    // Fall back to search if format doesn't match
    const searchResult = await this.fullTextSearch({
      q: `"${citation}"`,
      type: "o",
    });

    return {
      count: searchResult.count,
      results: [], // Would need to fetch full clusters
    };
  }

  // ==========================================================================
  // Full-Text Search
  // ==========================================================================

  /**
   * Perform full-text search across opinions or RECAP documents
   */
  async fullTextSearch(params: FullTextSearchParams): Promise<SearchResponse> {
    return this.fetchApi<SearchResponse>("/search/", params as unknown as Record<string, string | number | boolean | undefined>);
  }

  /**
   * Search DC District Court cases
   */
  async searchDCCases(query: string, options?: {
    type?: "o" | "r" | "d";
    filed_after?: string;
    filed_before?: string;
    judge?: string;
  }): Promise<SearchResponse> {
    const params: FullTextSearchParams = {
      q: query,
      type: options?.type || "o",
      court: DC_COURT_IDS.district,
      filed_after: options?.filed_after,
      filed_before: options?.filed_before,
    };

    // Add judge filter if specified
    if (options?.judge) {
      params.q = `${query} judge:${options.judge}`;
    }

    return this.fullTextSearch(params);
  }
}

// ============================================================================
// Helper Functions for Formatting Results
// ============================================================================

/**
 * Format a docket for display
 */
export function formatDocket(docket: Docket): string {
  const lines = [
    `**${docket.case_name}**`,
    `Case No: ${docket.docket_number}`,
    `Court: ${docket.court_id.toUpperCase()}`,
  ];

  if (docket.date_filed) {
    lines.push(`Filed: ${docket.date_filed}`);
  }
  if (docket.date_terminated) {
    lines.push(`Terminated: ${docket.date_terminated}`);
  }
  if (docket.assigned_to_str) {
    lines.push(`Judge: ${docket.assigned_to_str}`);
  }
  if (docket.nature_of_suit) {
    lines.push(`Nature of Suit: ${docket.nature_of_suit}`);
  }
  if (docket.cause) {
    lines.push(`Cause: ${docket.cause}`);
  }

  return lines.join("\n");
}

/**
 * Format an opinion cluster for display
 */
export function formatOpinionCluster(cluster: OpinionCluster): string {
  const lines = [
    `**${cluster.case_name}**`,
    `Date: ${cluster.date_filed}`,
  ];

  if (cluster.citations && cluster.citations.length > 0) {
    const citationStr = cluster.citations
      .map(c => `${c.volume} ${c.reporter} ${c.page}`)
      .join(", ");
    lines.push(`Citation: ${citationStr}`);
  }

  if (cluster.judges) {
    lines.push(`Judges: ${cluster.judges}`);
  }

  lines.push(`Citation Count: ${cluster.citation_count}`);
  lines.push(`Status: ${cluster.precedential_status}`);

  if (cluster.summary) {
    lines.push("", "Summary:", cluster.summary.substring(0, 500) + (cluster.summary.length > 500 ? "..." : ""));
  }

  return lines.join("\n");
}

/**
 * Format a search result for display
 */
export function formatSearchResult(result: SearchResult): string {
  const lines = [
    `**${result.caseName}**`,
    `Court: ${result.court}`,
    `Date Filed: ${result.dateFiled}`,
  ];

  if (result.citation && result.citation.length > 0) {
    lines.push(`Citations: ${result.citation.join(", ")}`);
  }

  if (result.judge) {
    lines.push(`Judge: ${result.judge}`);
  }

  if (result.citeCount > 0) {
    lines.push(`Cited ${result.citeCount} times`);
  }

  if (result.snippet) {
    lines.push("", "Snippet:", result.snippet.replace(/<[^>]+>/g, ""));
  }

  lines.push(`URL: https://www.courtlistener.com${result.absolute_url}`);

  return lines.join("\n");
}

/**
 * Format docket entries for display
 */
export function formatDocketEntries(entries: DocketEntry[]): string {
  return entries.map(entry => {
    const docCount = entry.recap_documents?.length || 0;
    const dateStr = entry.date_filed || "No date";
    const numStr = entry.entry_number ? `#${entry.entry_number}` : "";
    return `${numStr} ${dateStr}: ${entry.description} (${docCount} doc${docCount !== 1 ? "s" : ""})`;
  }).join("\n");
}

/**
 * Format parties for display
 */
export function formatParties(parties: Party[]): string {
  const grouped: Record<string, Party[]> = {};

  for (const party of parties) {
    const type = party.type_name || "Unknown";
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(party);
  }

  const lines: string[] = [];
  for (const [type, typeParties] of Object.entries(grouped)) {
    lines.push(`**${type}:**`);
    for (const party of typeParties) {
      lines.push(`  - ${party.name}`);
      if (party.attorneys && party.attorneys.length > 0) {
        for (const atty of party.attorneys) {
          lines.push(`    Attorney: ${atty.name}`);
          if (atty.email) {
            lines.push(`    Email: ${atty.email}`);
          }
        }
      }
    }
  }

  return lines.join("\n");
}
