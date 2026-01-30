"""
CourtListener API Client

Python port of the TypeScript CourtListener client.
Provides access to CourtListener's REST API for searching case law,
dockets, and legal opinions from the DC District Court and DC Circuit.

API Documentation: https://www.courtlistener.com/help/api/rest/
"""
import os
import requests
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from enum import Enum


# DC Court identifiers
DC_COURT_IDS = {
    "district": "dcd",      # DC District Court
    "circuit": "cadc",      # DC Circuit Court of Appeals
}

# Immigration-related Nature of Suit codes
IMMIGRATION_NOS_CODES = ["462", "463", "465"]

# Common DC District Court judges
DC_JUDGES = [
    "Kollar-Kotelly", "Contreras", "Cooper", "Jackson", "Boasberg",
    "Howell", "Walton", "Mehta", "Chutkan", "Bates", "Lamberth",
    "Moss", "McFadden", "Friedrich", "Kelly", "Nichols"
]


@dataclass
class CourtListenerConfig:
    api_token: str
    base_url: str = "https://www.courtlistener.com/api/rest/v4"


class CourtListenerClient:
    """Client for CourtListener REST API."""

    def __init__(self, config: CourtListenerConfig):
        self.api_token = config.api_token
        self.base_url = config.base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Token {self.api_token}",
            "Accept": "application/json"
        })

    def _request(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make an API request."""
        url = f"{self.base_url}{endpoint}"

        # Filter out None values from params
        if params:
            params = {k: v for k, v in params.items() if v is not None}

        try:
            response = self.session.get(url, params=params, timeout=30)
        except requests.exceptions.Timeout:
            raise Exception("Request timed out. The CourtListener API may be slow or unavailable.")
        except requests.exceptions.ConnectionError:
            raise Exception("Connection error. Please check your internet connection.")
        except requests.exceptions.RequestException as e:
            raise Exception(f"Network error: {str(e)}")

        # Check content type before parsing as JSON
        content_type = response.headers.get('Content-Type', '')
        if 'application/json' not in content_type:
            # API returned non-JSON (likely HTML error page)
            if response.status_code == 401:
                raise Exception("Authentication failed. Please check your COURTLISTENER_API_TOKEN.")
            elif response.status_code == 403:
                raise Exception("Access forbidden. Your API token may not have permission for this resource.")
            elif response.status_code == 404:
                raise Exception("Resource not found.")
            elif response.status_code >= 500:
                raise Exception("CourtListener server error. Please try again later.")
            else:
                raise Exception(f"API returned non-JSON response (status {response.status_code}). The service may be temporarily unavailable.")

        if not response.ok:
            # Try to extract error message from JSON response
            try:
                error_data = response.json()
                error_msg = error_data.get('detail', error_data.get('error', str(error_data)))
                raise Exception(f"CourtListener API error ({response.status_code}): {error_msg}")
            except (ValueError, KeyError):
                raise Exception(f"CourtListener API error ({response.status_code}): {response.text[:200]}")

        try:
            return response.json()
        except ValueError as e:
            raise Exception(f"Invalid JSON response from API: {str(e)}")

    # Docket Methods
    def search_dockets(self, **params) -> Dict[str, Any]:
        """
        Search for dockets (PACER case records).

        Parameters:
            court: Court ID (e.g., "dcd")
            court__in: Multiple courts (comma-separated)
            case_name: Case name search
            case_name__icontains: Case name contains
            docket_number: Exact docket number
            docket_number__icontains: Docket number contains
            nature_of_suit: NOS code
            date_filed__gte: Filed after (YYYY-MM-DD)
            date_filed__lte: Filed before
            date_terminated__isnull: Open cases only (True)
            assigned_to_str__icontains: Judge name
            page: Page number
            page_size: Results per page
            order_by: Sort order
        """
        return self._request("/dockets/", params)

    def get_docket(self, docket_id: int) -> Dict[str, Any]:
        """Get a specific docket by ID."""
        return self._request(f"/dockets/{docket_id}/")

    def get_docket_entries(self, docket_id: int, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """Get docket entries for a specific docket."""
        return self._request("/docket-entries/", {
            "docket": docket_id,
            "page": page,
            "page_size": page_size
        })

    # Document Methods
    def get_document(self, document_id: int) -> Dict[str, Any]:
        """Get a specific RECAP document."""
        return self._request(f"/recap-documents/{document_id}/")

    # Party & Attorney Methods
    def get_parties(self, docket_id: int, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """Get parties for a docket."""
        return self._request("/parties/", {
            "docket": docket_id,
            "page": page,
            "page_size": page_size
        })

    def get_attorneys(self, docket_id: int, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """Get attorneys for a docket."""
        return self._request("/attorneys/", {
            "docket": docket_id,
            "page": page,
            "page_size": page_size
        })

    # Opinion Methods
    def search_opinions(self, **params) -> Dict[str, Any]:
        """
        Search opinion clusters.

        Parameters:
            court: Court ID
            court__in: Multiple courts
            case_name: Case name search
            case_name__icontains: Case name contains
            judge: Judge name
            date_filed__gte: Filed after
            date_filed__lte: Filed before
            citation_count__gte: Minimum citation count
            precedential_status: "Published" or "Unpublished"
            page: Page number
            page_size: Results per page
            order_by: Sort order
        """
        return self._request("/clusters/", params)

    def get_opinion_cluster(self, cluster_id: int) -> Dict[str, Any]:
        """Get a specific opinion cluster."""
        return self._request(f"/clusters/{cluster_id}/")

    def get_citing_opinions(self, cluster_id: int, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """Get cases that cite a given opinion cluster."""
        return self._request("/clusters/", {
            "cites": cluster_id,
            "page": page,
            "page_size": page_size
        })

    def lookup_citation(self, citation: str) -> Dict[str, Any]:
        """
        Look up a citation (e.g., "550 U.S. 544").
        Parses common citation formats and searches.
        """
        import re

        # Try to parse citation format: "550 U.S. 544" -> volume=550, reporter=U.S., page=544
        match = re.match(r'^(\d+)\s+([A-Za-z0-9.\s]+?)\s+(\d+)$', citation.strip())

        if match:
            volume, reporter, page = match.groups()
            return self._request("/citations/", {
                "volume": int(volume),
                "reporter": reporter.strip(),
                "page": page
            })

        # Fall back to full-text search
        return self.full_text_search(q=f'"{citation}"', type="o")

    # Full-Text Search
    def full_text_search(self, q: str, type: str = "o", **params) -> Dict[str, Any]:
        """
        Perform full-text search across opinions or RECAP documents.

        Parameters:
            q: Search query
            type: "o" (opinions), "r" (recap), "d" (dockets), "p" (people)
            court: Court ID
            filed_after: Filed after date
            filed_before: Filed before date
            cited_gt: Cited more than N times
            cited_lt: Cited less than N times
            order_by: Sort order
            stat_Precedential: Set to "on" for precedential only
            stat_Non_Precedential: Set to "on" for non-precedential only
            page: Page number
        """
        search_params = {"q": q, "type": type, **params}
        return self._request("/search/", search_params)

    def search_dc_cases(self, query: str, type: str = "o",
                        filed_after: Optional[str] = None,
                        filed_before: Optional[str] = None,
                        judge: Optional[str] = None) -> Dict[str, Any]:
        """Search DC District Court cases."""
        search_query = query
        if judge:
            search_query = f"{query} judge:{judge}"

        return self.full_text_search(
            q=search_query,
            type=type,
            court=DC_COURT_IDS["district"],
            filed_after=filed_after,
            filed_before=filed_before
        )


# Helper Functions for Formatting Results
def format_docket(docket: Dict[str, Any]) -> str:
    """Format a docket for display."""
    lines = [
        f"**{docket.get('case_name', 'Unknown')}**",
        f"Case No: {docket.get('docket_number', 'N/A')}",
        f"Court: {docket.get('court_id', 'N/A').upper()}",
    ]

    if docket.get('date_filed'):
        lines.append(f"Filed: {docket['date_filed']}")
    if docket.get('date_terminated'):
        lines.append(f"Terminated: {docket['date_terminated']}")
    if docket.get('assigned_to_str'):
        lines.append(f"Judge: {docket['assigned_to_str']}")
    if docket.get('nature_of_suit'):
        lines.append(f"Nature of Suit: {docket['nature_of_suit']}")
    if docket.get('cause'):
        lines.append(f"Cause: {docket['cause']}")

    return "\n".join(lines)


def format_opinion_cluster(cluster: Dict[str, Any]) -> str:
    """Format an opinion cluster for display."""
    lines = [
        f"**{cluster.get('case_name', 'Unknown')}**",
        f"Date: {cluster.get('date_filed', 'N/A')}",
    ]

    citations = cluster.get('citations', [])
    if citations:
        cite_strs = [f"{c['volume']} {c['reporter']} {c['page']}" for c in citations]
        lines.append(f"Citation: {', '.join(cite_strs)}")

    if cluster.get('judges'):
        lines.append(f"Judges: {cluster['judges']}")

    lines.append(f"Citation Count: {cluster.get('citation_count', 0)}")
    lines.append(f"Status: {cluster.get('precedential_status', 'N/A')}")

    if cluster.get('summary'):
        summary = cluster['summary']
        if len(summary) > 500:
            summary = summary[:500] + "..."
        lines.extend(["", "Summary:", summary])

    return "\n".join(lines)


def format_search_result(result: Dict[str, Any]) -> str:
    """Format a search result for display."""
    lines = [
        f"**{result.get('caseName', 'Unknown')}**",
        f"Court: {result.get('court', 'N/A')}",
        f"Date Filed: {result.get('dateFiled', 'N/A')}",
    ]

    citations = result.get('citation', [])
    if citations:
        lines.append(f"Citations: {', '.join(citations)}")

    if result.get('judge'):
        lines.append(f"Judge: {result['judge']}")

    cite_count = result.get('citeCount', 0)
    if cite_count > 0:
        lines.append(f"Cited {cite_count} times")

    if result.get('snippet'):
        # Remove HTML tags from snippet
        import re
        snippet = re.sub(r'<[^>]+>', '', result['snippet'])
        lines.extend(["", "Snippet:", snippet])

    lines.append(f"URL: https://www.courtlistener.com{result.get('absolute_url', '')}")

    return "\n".join(lines)


def format_docket_entries(entries: List[Dict[str, Any]]) -> str:
    """Format docket entries for display."""
    formatted = []
    for entry in entries:
        doc_count = len(entry.get('recap_documents', []))
        date_str = entry.get('date_filed', 'No date')
        num_str = f"#{entry['entry_number']}" if entry.get('entry_number') else ""
        formatted.append(f"{num_str} {date_str}: {entry.get('description', 'N/A')} ({doc_count} doc{'s' if doc_count != 1 else ''})")
    return "\n".join(formatted)


def format_parties(parties: List[Dict[str, Any]]) -> str:
    """Format parties for display."""
    grouped: Dict[str, List] = {}

    for party in parties:
        party_type = party.get('type_name', 'Unknown')
        if party_type not in grouped:
            grouped[party_type] = []
        grouped[party_type].append(party)

    lines = []
    for party_type, type_parties in grouped.items():
        lines.append(f"**{party_type}:**")
        for party in type_parties:
            lines.append(f"  - {party.get('name', 'Unknown')}")
            for atty in party.get('attorneys', []):
                lines.append(f"    Attorney: {atty.get('name', 'Unknown')}")
                if atty.get('email'):
                    lines.append(f"    Email: {atty['email']}")

    return "\n".join(lines)
