"""
Perplexity AI Client for Court Research Fallback

Used when CourtListener API times out or is unavailable.
"""
import requests
from typing import Optional
from config import Config


class PerplexityClient:
    """Client for Perplexity AI search API."""

    def __init__(self):
        self.api_key = Config.PERPLEXITY_API_KEY
        self.base_url = "https://api.perplexity.ai/chat/completions"

    def is_configured(self) -> bool:
        """Check if Perplexity API is configured."""
        return bool(self.api_key)

    def search_cases(self, query: str, search_type: str = "opinions") -> dict:
        """
        Search for court cases using Perplexity AI.

        Args:
            query: The search query
            search_type: Type of search (opinions, dockets, recap)

        Returns:
            Dict with 'results' (AI response) and 'sources' (citations)
        """
        if not self.api_key:
            return {"error": "Perplexity API not configured"}

        # Build a focused legal search prompt
        type_context = {
            "o": "court opinions and case law",
            "d": "court dockets and case filings",
            "r": "PACER/RECAP court documents"
        }.get(search_type, "court cases")

        system_prompt = """You are a legal research assistant specializing in U.S. federal court cases,
particularly the U.S. District Court for the District of Columbia.
Provide accurate, well-sourced information about court cases.
Always include case names, docket numbers, judges, and filing dates when available.
Format your response with clear sections for each case found."""

        user_prompt = f"""Search for {type_context} related to: {query}

Focus on DC District Court (U.S. District Court for the District of Columbia) cases when possible.
For each relevant case found, provide:
- Case name (e.g., Smith v. Jones)
- Docket number if available
- Judge name
- Filing date or decision date
- Brief summary of what the case is about

Search sources like CourtListener, Justia, and official court records."""

        try:
            response = requests.post(
                self.base_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "sonar",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    "max_tokens": 1500,
                    "temperature": 0.1,
                    "return_citations": True
                },
                timeout=30
            )

            if response.status_code == 401:
                return {"error": "Perplexity API authentication failed. Check API key."}

            if not response.ok:
                return {"error": f"Perplexity API error: {response.status_code}"}

            data = response.json()

            # Extract the response content and citations
            content = ""
            citations = []

            if "choices" in data and len(data["choices"]) > 0:
                message = data["choices"][0].get("message", {})
                content = message.get("content", "")

            if "citations" in data:
                citations = data["citations"]

            return {
                "content": content,
                "citations": citations,
                "model": data.get("model", "sonar"),
                "source": "perplexity"
            }

        except requests.exceptions.Timeout:
            return {"error": "Perplexity search timed out. Please try again."}
        except requests.exceptions.RequestException as e:
            return {"error": f"Network error: {str(e)}"}
        except Exception as e:
            return {"error": f"Unexpected error: {str(e)}"}
