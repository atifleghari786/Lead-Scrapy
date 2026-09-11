"""
Google Places API integration.

Deliberately uses Google's official Places API rather than scraping Google
Maps — scraping Maps search results violates Google's Terms of Service and
is unreliable (results are rendered client-side). Text Search finds
candidate places for a query + location, then Place Details fills in the
fields we store as lead data.
"""
import time

import httpx

from app.core.config import settings

TEXT_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json"
DETAIL_FIELDS = "name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,type"

# Text Search returns at most 20 results per page; pulling further pages
# would need next_page_token polling, which isn't worth it for an MVP tool.
MAX_RESULTS = 20

# Spaced out to stay well under Places API's per-second quota when following
# up a search with one Details call per result.
DETAILS_REQUEST_DELAY_SECONDS = 0.1


class PlacesFinderError(Exception):
    pass


def find_places(query: str, location: str, max_results: int = MAX_RESULTS) -> list[dict]:
    if not settings.GOOGLE_PLACES_API_KEY:
        raise PlacesFinderError("Google Places API key not configured")

    max_results = max(0, min(max_results, MAX_RESULTS))
    if max_results == 0:
        return []

    search_query = f"{query} in {location}" if location else query

    with httpx.Client(timeout=15.0) as client:
        try:
            resp = client.get(
                TEXT_SEARCH_URL,
                params={"query": search_query, "key": settings.GOOGLE_PLACES_API_KEY},
            )
            resp.raise_for_status()
        except httpx.HTTPError as e:
            raise PlacesFinderError(f"Could not reach Google Places API: {e}")

        data = resp.json()
        status = data.get("status")
        if status not in ("OK", "ZERO_RESULTS"):
            raise PlacesFinderError(f"Google Places API error: {status} — {data.get('error_message', '')}".strip(" —"))

        places = []
        for item in data.get("results", [])[:max_results]:
            place_id = item.get("place_id")
            if not place_id:
                continue

            time.sleep(DETAILS_REQUEST_DELAY_SECONDS)
            try:
                detail_resp = client.get(
                    DETAILS_URL,
                    params={"place_id": place_id, "fields": DETAIL_FIELDS, "key": settings.GOOGLE_PLACES_API_KEY},
                )
                detail_resp.raise_for_status()
                detail = detail_resp.json().get("result", {})
            except httpx.HTTPError:
                detail = {}

            places.append({
                "place_id": place_id,
                "name": detail.get("name") or item.get("name"),
                "formatted_address": detail.get("formatted_address") or item.get("formatted_address"),
                "formatted_phone_number": detail.get("formatted_phone_number"),
                "website": detail.get("website"),
                "rating": detail.get("rating", item.get("rating")),
                "user_ratings_total": detail.get("user_ratings_total", item.get("user_ratings_total")),
                "types": detail.get("types") or item.get("types") or [],
            })

    return places
