"""
Court Research API Endpoints

Provides endpoints for searching court cases via CourtListener API.
"""
import os
import logging
from flask import Blueprint, request, jsonify, current_app

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.courtlistener_client import (
    CourtListenerClient,
    CourtListenerConfig,
    format_docket,
    format_opinion_cluster,
    format_search_result,
    format_docket_entries,
    format_parties,
    DC_COURT_IDS
)
from config import Config

research_bp = Blueprint('research', __name__, url_prefix='/api/research')
logger = logging.getLogger(__name__)


class APIConfigError(Exception):
    """Raised when API is not properly configured."""
    pass


class APIRequestError(Exception):
    """Raised when API request fails."""
    pass


def get_client():
    """Get CourtListener client instance."""
    token = Config.COURTLISTENER_API_TOKEN
    if not token:
        raise APIConfigError("CourtListener API token not configured. Please set COURTLISTENER_API_TOKEN in your .env file.")

    config = CourtListenerConfig(api_token=token)
    return CourtListenerClient(config)


def handle_api_error(e, operation="API request"):
    """Handle API errors and return appropriate response."""
    error_msg = str(e)
    logger.error(f"{operation} error: {error_msg}")

    # Determine appropriate status code
    if "not configured" in error_msg.lower() or "token" in error_msg.lower():
        return jsonify({"error": error_msg}), 401
    elif "timed out" in error_msg.lower():
        return jsonify({"error": "Request timed out. Please try again."}), 504
    elif "connection" in error_msg.lower():
        return jsonify({"error": "Could not connect to CourtListener. Please check your internet connection."}), 503
    elif "not found" in error_msg.lower():
        return jsonify({"error": error_msg}), 404
    else:
        return jsonify({"error": error_msg}), 500


@research_bp.route('/status', methods=['GET'])
def api_status():
    """Check if CourtListener API is configured."""
    token = Config.COURTLISTENER_API_TOKEN
    return jsonify({
        "configured": bool(token),
        "message": "API token configured" if token else "Set COURTLISTENER_API_TOKEN in .env file"
    })


@research_bp.route('/cases', methods=['GET'])
def search_cases():
    """
    Search DC District Court cases.

    Query parameters:
        q: Search query (required)
        type: Search type - "o" (opinions), "r" (recap), "d" (dockets) (default: "o")
        filed_after: Filter by filed date (YYYY-MM-DD)
        filed_before: Filter by filed date (YYYY-MM-DD)
        judge: Filter by judge name
        page: Page number (default: 1)
    """
    try:
        client = get_client()

        query = request.args.get('q', '')
        if not query:
            return jsonify({"error": "Search query 'q' is required"}), 400

        search_type = request.args.get('type', 'o')
        filed_after = request.args.get('filed_after')
        filed_before = request.args.get('filed_before')
        judge = request.args.get('judge')
        page = request.args.get('page', 1, type=int)

        results = client.search_dc_cases(
            query=query,
            type=search_type,
            filed_after=filed_after,
            filed_before=filed_before,
            judge=judge
        )

        # Format results for display
        formatted_results = []
        for result in results.get('results', []):
            formatted_results.append({
                "id": result.get('id'),
                "case_name": result.get('caseName'),
                "case_name_short": result.get('caseNameShort'),
                "court": result.get('court'),
                "court_id": result.get('court_id'),
                "date_filed": result.get('dateFiled'),
                "judge": result.get('judge'),
                "citations": result.get('citation', []),
                "cite_count": result.get('citeCount', 0),
                "snippet": result.get('snippet', '').replace('<em>', '').replace('</em>', ''),
                "url": f"https://www.courtlistener.com{result.get('absolute_url', '')}",
                "docket_id": result.get('docket_id'),
                "formatted": format_search_result(result)
            })

        return jsonify({
            "count": results.get('count', 0),
            "next": results.get('next'),
            "previous": results.get('previous'),
            "results": formatted_results
        })

    except APIConfigError as e:
        return jsonify({"error": str(e)}), 401
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return handle_api_error(e, "Search cases")


@research_bp.route('/docket/<int:docket_id>', methods=['GET'])
def get_docket(docket_id):
    """Get full docket information."""
    try:
        client = get_client()
        docket = client.get_docket(docket_id)

        return jsonify({
            "docket": docket,
            "formatted": format_docket(docket),
            "export_data": {
                "case_number": docket.get('docket_number', ''),
                "plaintiff": "",  # Would need to parse from case_name
                "defendant": "",
                "judge_name": docket.get('assigned_to_str', ''),
                "date_filed": docket.get('date_filed')
            }
        })

    except APIConfigError as e:
        return jsonify({"error": str(e)}), 401
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return handle_api_error(e, "Get docket")


@research_bp.route('/docket/<int:docket_id>/entries', methods=['GET'])
def get_docket_entries(docket_id):
    """Get docket entries."""
    try:
        client = get_client()
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 20, type=int)

        entries = client.get_docket_entries(docket_id, page=page, page_size=page_size)

        return jsonify({
            "count": entries.get('count', 0),
            "next": entries.get('next'),
            "previous": entries.get('previous'),
            "entries": entries.get('results', []),
            "formatted": format_docket_entries(entries.get('results', []))
        })

    except APIConfigError as e:
        return jsonify({"error": str(e)}), 401
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return handle_api_error(e, "Get docket entries")


@research_bp.route('/parties/<int:docket_id>', methods=['GET'])
def get_parties(docket_id):
    """Get parties and attorneys for a docket."""
    try:
        client = get_client()
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 50, type=int)

        parties = client.get_parties(docket_id, page=page, page_size=page_size)

        # Extract useful data for document generation
        plaintiffs = []
        defendants = []
        attorneys_list = []

        for party in parties.get('results', []):
            party_type = party.get('type_name', '').lower()
            if 'plaintiff' in party_type:
                plaintiffs.append(party.get('name'))
            elif 'defendant' in party_type:
                defendants.append(party.get('name'))

            for atty in party.get('attorneys', []):
                attorneys_list.append({
                    "name": atty.get('name'),
                    "email": atty.get('email'),
                    "phone": atty.get('phone'),
                    "contact_raw": atty.get('contact_raw'),
                    "represents": party.get('name'),
                    "party_type": party.get('type_name')
                })

        return jsonify({
            "count": parties.get('count', 0),
            "parties": parties.get('results', []),
            "formatted": format_parties(parties.get('results', [])),
            "extracted": {
                "plaintiffs": plaintiffs,
                "defendants": defendants,
                "attorneys": attorneys_list
            }
        })

    except APIConfigError as e:
        return jsonify({"error": str(e)}), 401
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return handle_api_error(e, "Get parties")


@research_bp.route('/opinions', methods=['GET'])
def search_opinions():
    """
    Search opinions.

    Query parameters:
        case_name: Case name search
        judge: Judge name
        date_filed_gte: Filed after (YYYY-MM-DD)
        date_filed_lte: Filed before
        citation_count_gte: Minimum citation count
        status: "Published" or "Unpublished"
        court: Court ID (default: "dcd")
        page: Page number
        page_size: Results per page
    """
    try:
        client = get_client()

        params = {
            "court": request.args.get('court', DC_COURT_IDS['district']),
            "case_name__icontains": request.args.get('case_name'),
            "judge": request.args.get('judge'),
            "date_filed__gte": request.args.get('date_filed_gte'),
            "date_filed__lte": request.args.get('date_filed_lte'),
            "citation_count__gte": request.args.get('citation_count_gte', type=int),
            "precedential_status": request.args.get('status'),
            "page": request.args.get('page', 1, type=int),
            "page_size": request.args.get('page_size', 20, type=int),
        }

        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}

        results = client.search_opinions(**params)

        formatted_results = []
        for cluster in results.get('results', []):
            formatted_results.append({
                "id": cluster.get('id'),
                "case_name": cluster.get('case_name'),
                "case_name_short": cluster.get('case_name_short'),
                "date_filed": cluster.get('date_filed'),
                "judges": cluster.get('judges'),
                "citation_count": cluster.get('citation_count', 0),
                "precedential_status": cluster.get('precedential_status'),
                "summary": cluster.get('summary', '')[:500] if cluster.get('summary') else '',
                "citations": cluster.get('citations', []),
                "formatted": format_opinion_cluster(cluster)
            })

        return jsonify({
            "count": results.get('count', 0),
            "next": results.get('next'),
            "previous": results.get('previous'),
            "results": formatted_results
        })

    except APIConfigError as e:
        return jsonify({"error": str(e)}), 401
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return handle_api_error(e, "Search opinions")


@research_bp.route('/opinion/<int:cluster_id>', methods=['GET'])
def get_opinion(cluster_id):
    """Get a specific opinion cluster."""
    try:
        client = get_client()
        cluster = client.get_opinion_cluster(cluster_id)

        return jsonify({
            "opinion": cluster,
            "formatted": format_opinion_cluster(cluster)
        })

    except APIConfigError as e:
        return jsonify({"error": str(e)}), 401
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return handle_api_error(e, "Get opinion")


@research_bp.route('/citation/<path:cite>', methods=['GET'])
def lookup_citation(cite):
    """
    Look up a case by citation.

    Examples:
        /api/research/citation/550 U.S. 544
        /api/research/citation/123 F.3d 456
    """
    try:
        client = get_client()
        results = client.lookup_citation(cite)

        return jsonify({
            "citation": cite,
            "count": results.get('count', 0),
            "results": results.get('results', [])
        })

    except APIConfigError as e:
        return jsonify({"error": str(e)}), 401
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return handle_api_error(e, "Citation lookup")


@research_bp.route('/citing/<int:cluster_id>', methods=['GET'])
def get_citing_cases(cluster_id):
    """
    Get cases that cite a given opinion.
    Useful for checking if a case is "good law".
    """
    try:
        client = get_client()
        page = request.args.get('page', 1, type=int)
        page_size = request.args.get('page_size', 20, type=int)

        results = client.get_citing_opinions(cluster_id, page=page, page_size=page_size)

        formatted_results = []
        for cluster in results.get('results', []):
            formatted_results.append({
                "id": cluster.get('id'),
                "case_name": cluster.get('case_name'),
                "date_filed": cluster.get('date_filed'),
                "citation_count": cluster.get('citation_count', 0),
                "formatted": format_opinion_cluster(cluster)
            })

        return jsonify({
            "cluster_id": cluster_id,
            "count": results.get('count', 0),
            "next": results.get('next'),
            "previous": results.get('previous'),
            "citing_cases": formatted_results
        })

    except APIConfigError as e:
        return jsonify({"error": str(e)}), 401
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return handle_api_error(e, "Get citing cases")


@research_bp.route('/paginate', methods=['GET'])
def paginate():
    """
    Proxy pagination requests to CourtListener API.

    Query parameters:
        url: Full CourtListener API URL for next/previous page
    """
    try:
        client = get_client()

        page_url = request.args.get('url')
        if not page_url:
            return jsonify({"error": "Pagination URL is required"}), 400

        # Validate URL is from CourtListener
        if not page_url.startswith('https://www.courtlistener.com'):
            return jsonify({"error": "Invalid pagination URL"}), 400

        # Make direct request using session
        import requests as req
        response = client.session.get(page_url, timeout=30)

        content_type = response.headers.get('Content-Type', '')
        if 'application/json' not in content_type:
            return jsonify({"error": "Invalid response from CourtListener"}), 502

        data = response.json()

        # Format results based on type (detect from URL)
        formatted_results = []
        if '/dockets/' in page_url or 'type=d' in page_url:
            for docket in data.get('results', []):
                formatted_results.append({
                    "id": docket.get('id'),
                    "case_name": docket.get('case_name') or docket.get('caseName'),
                    "docket_number": docket.get('docket_number') or docket.get('docketNumber'),
                    "date_filed": docket.get('date_filed') or docket.get('dateFiled'),
                    "date_terminated": docket.get('date_terminated'),
                    "judge": docket.get('assigned_to_str') or docket.get('judge'),
                    "nature_of_suit": docket.get('nature_of_suit'),
                    "cause": docket.get('cause'),
                    "court": docket.get('court'),
                    "url": f"https://www.courtlistener.com{docket.get('absolute_url', '')}" if docket.get('absolute_url') else '',
                    "docket_id": docket.get('id')
                })
        else:
            # Assume opinions/search results
            for result in data.get('results', []):
                formatted_results.append({
                    "id": result.get('id'),
                    "case_name": result.get('caseName') or result.get('case_name'),
                    "case_name_short": result.get('caseNameShort') or result.get('case_name_short'),
                    "court": result.get('court'),
                    "court_id": result.get('court_id'),
                    "date_filed": result.get('dateFiled') or result.get('date_filed'),
                    "judge": result.get('judge'),
                    "citations": result.get('citation', []),
                    "cite_count": result.get('citeCount', 0),
                    "snippet": (result.get('snippet', '') or '').replace('<em>', '').replace('</em>', ''),
                    "url": f"https://www.courtlistener.com{result.get('absolute_url', '')}" if result.get('absolute_url') else '',
                    "docket_id": result.get('docket_id')
                })

        return jsonify({
            "count": data.get('count', 0),
            "next": data.get('next'),
            "previous": data.get('previous'),
            "results": formatted_results
        })

    except APIConfigError as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        return handle_api_error(e, "Pagination")


@research_bp.route('/document/<int:doc_id>', methods=['GET'])
def get_document(doc_id):
    """
    Get RECAP document details with download links.
    """
    try:
        client = get_client()
        doc = client.get_document(doc_id)

        # Build document info with links
        doc_info = {
            "id": doc.get('id'),
            "description": doc.get('description'),
            "document_number": doc.get('document_number'),
            "attachment_number": doc.get('attachment_number'),
            "page_count": doc.get('page_count'),
            "is_available": doc.get('is_available', False),
            "filepath_local": doc.get('filepath_local'),
            "filepath_ia": doc.get('filepath_ia'),
            "date_created": doc.get('date_created'),
            "date_modified": doc.get('date_modified'),
        }

        # Add download URLs if available
        if doc.get('filepath_local'):
            doc_info['download_url'] = f"https://storage.courtlistener.com/{doc.get('filepath_local')}"
        if doc.get('filepath_ia'):
            doc_info['archive_url'] = doc.get('filepath_ia')

        return jsonify(doc_info)

    except APIConfigError as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        return handle_api_error(e, "Get document")


@research_bp.route('/dockets', methods=['GET'])
def search_dockets():
    """
    Search dockets directly.

    Query parameters:
        case_name: Case name search
        docket_number: Docket number
        nature_of_suit: NOS code
        date_filed_gte: Filed after
        date_filed_lte: Filed before
        judge: Judge name
        open_only: Only open cases (true/false)
        page: Page number
        page_size: Results per page
    """
    try:
        client = get_client()

        params = {
            "court": request.args.get('court', DC_COURT_IDS['district']),
            "case_name__icontains": request.args.get('case_name'),
            "docket_number__icontains": request.args.get('docket_number'),
            "nature_of_suit": request.args.get('nature_of_suit'),
            "date_filed__gte": request.args.get('date_filed_gte'),
            "date_filed__lte": request.args.get('date_filed_lte'),
            "assigned_to_str__icontains": request.args.get('judge'),
            "page": request.args.get('page', 1, type=int),
            "page_size": request.args.get('page_size', 20, type=int),
        }

        # Handle open_only filter
        if request.args.get('open_only', '').lower() == 'true':
            params['date_terminated__isnull'] = True

        # Remove None values
        params = {k: v for k, v in params.items() if v is not None}

        results = client.search_dockets(**params)

        formatted_results = []
        for docket in results.get('results', []):
            formatted_results.append({
                "id": docket.get('id'),
                "case_name": docket.get('case_name'),
                "docket_number": docket.get('docket_number'),
                "date_filed": docket.get('date_filed'),
                "date_terminated": docket.get('date_terminated'),
                "judge": docket.get('assigned_to_str'),
                "nature_of_suit": docket.get('nature_of_suit'),
                "cause": docket.get('cause'),
                "formatted": format_docket(docket)
            })

        return jsonify({
            "count": results.get('count', 0),
            "next": results.get('next'),
            "previous": results.get('previous'),
            "results": formatted_results
        })

    except APIConfigError as e:
        return jsonify({"error": str(e)}), 401
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return handle_api_error(e, "Search dockets")
