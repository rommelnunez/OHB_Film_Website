"""
Alamo Drafthouse scraper using their open REST API.
No authentication or Playwright required.
"""

import urllib.request
import json
from datetime import datetime, timedelta
from typing import Optional


def fetch_alamo_showtimes(
    film_slug: str = "our-hero-balthazar",
    markets: list[str] = None,
    days_ahead: int = 7,
    verbose: bool = False
) -> list[dict]:
    """
    Fetch showtimes from Alamo Drafthouse API.

    Args:
        film_slug: The movie's slug on Alamo's site
        markets: List of market slugs to check (e.g., ["los-angeles"])
        days_ahead: Number of days to look ahead
        verbose: Print progress info

    Returns:
        List of showtime dicts with: theater, date, time, eventType, ticketLink
    """
    if markets is None:
        markets = ["los-angeles"]

    showtimes = []
    cutoff_date = datetime.now() + timedelta(days=days_ahead)

    for market in markets:
        if verbose:
            print(f"  Fetching Alamo {market}...")

        api_url = f"https://drafthouse.com/s/mother/v2/schedule/market/{market}"

        try:
            req = urllib.request.Request(
                api_url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode('utf-8'))
        except Exception as e:
            if verbose:
                print(f"    Error fetching Alamo {market}: {e}")
            continue

        sessions = data.get('data', {}).get('sessions', [])

        for session in sessions:
            # Filter for our movie - API now uses presentationSlug/legacySlug instead of filmSlug
            presentation_slug = session.get('presentationSlug', '').lower()
            legacy_slug = session.get('legacySlug', '').lower()

            if film_slug not in presentation_slug and film_slug not in legacy_slug:
                continue

            # API now uses showTimeClt instead of sessionDateTime
            session_dt_str = session.get('showTimeClt') or session.get('sessionDateTime', '')
            if not session_dt_str:
                continue

            # Parse datetime
            try:
                session_dt = datetime.fromisoformat(session_dt_str.replace('Z', '+00:00'))
                # Remove timezone for comparison
                if session_dt.tzinfo:
                    session_dt = session_dt.replace(tzinfo=None)
            except ValueError:
                continue

            # Check if within date range
            if session_dt > cutoff_date:
                continue

            # Format date and time
            date_str = session_dt.strftime('%Y-%m-%d')
            time_str = session_dt.strftime('%-I:%M %p')  # e.g., "7:20 PM"

            # Get theater name - cinemaId 1701 is DTLA
            cinema_id = session.get('cinemaId', '')
            if cinema_id == '1701':
                theater_name = "Alamo Drafthouse DTLA"
            else:
                theater_name = f"Alamo Drafthouse {cinema_id}"

            # Build ticket URL
            session_id = session.get('sessionId', '')
            ticket_url = (
                f"https://drafthouse.com/{market}/show/{session.get('presentationSlug', film_slug)}"
                f"?date={date_str}&cinemaId={cinema_id}&sessionId={session_id}"
            )

            # Determine event type from presentation or session info
            session_status = session.get('status', '')

            if 'baby' in presentation_slug:
                event_type = "Baby Day Show"
            elif session.get('soldOut', False):
                event_type = "General Admission (Sold Out)"
            else:
                event_type = "General Admission"

            showtimes.append({
                'theater': theater_name,
                'date': date_str,
                'time': time_str,
                'eventType': event_type,
                'ticketLink': ticket_url,
                '_source': 'alamo',
                '_soldOut': session.get('soldOut', False),
                '_seatsLeft': session.get('seatsLeft')
            })

    if verbose:
        print(f"  Alamo: {len(showtimes)} showtimes found")

    return showtimes


if __name__ == "__main__":
    # Test the scraper
    print("Testing Alamo scraper...")
    results = fetch_alamo_showtimes(verbose=True)
    print(f"\nFound {len(results)} showtimes:")
    for r in results[:5]:
        print(f"  {r['date']} {r['time']} - {r['theater']}")
