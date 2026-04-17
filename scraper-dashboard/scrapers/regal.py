"""
Regal scraper using Playwright to bypass Cloudflare and call internal API.
"""

from datetime import datetime, timedelta
from typing import Optional


def fetch_regal_showtimes(
    ho_code: str = "HO00020753",
    theaters: list[dict] = None,
    days_ahead: int = 7,
    verbose: bool = False
) -> list[dict]:
    """
    Fetch showtimes from Regal using Playwright browser automation.
    Must establish browser session first, then call internal API.

    Args:
        ho_code: Regal's HO code for the movie
        theaters: List of theater dicts with 'code' and 'name' keys
        days_ahead: Number of days to look ahead
        verbose: Print progress info

    Returns:
        List of showtime dicts with: theater, date, time, eventType, ticketLink
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        if verbose:
            print("  Regal: Playwright not installed, skipping")
        return []

    if theaters is None:
        theaters = [
            {"code": "1320", "name": "Regal Union Square"}
        ]

    showtimes = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) '
                       'Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()

        if verbose:
            print("  Establishing Regal session...")

        # First, load a page to establish session (bypass Cloudflare)
        try:
            page.goto("https://www.regmovies.com/theatres",
                      wait_until='domcontentloaded', timeout=60000)
            page.wait_for_timeout(3000)
        except Exception as e:
            if verbose:
                print(f"  Regal: Failed to establish session: {e}")
            browser.close()
            return []

        # Build theater codes string
        theater_codes = ','.join(t['code'] for t in theaters)
        theater_map = {t['code']: t['name'] for t in theaters}

        start_date = datetime.now()

        for day_offset in range(days_ahead):
            current_date = start_date + timedelta(days=day_offset)
            # Regal uses MM-DD-YYYY format
            date_str_api = current_date.strftime('%m-%d-%Y')
            date_str_iso = current_date.strftime('%Y-%m-%d')

            if verbose:
                print(f"  Fetching Regal {date_str_iso}...")

            api_url = (
                f"https://www.regmovies.com/api/getShowtimes"
                f"?theatres={theater_codes}"
                f"&date={date_str_api}"
                f"&hoCode={ho_code}"
                f"&ignoreCache=false&moviesOnly=false"
            )

            try:
                # Call API from within page context
                response = page.evaluate(f'''
                    async () => {{
                        try {{
                            const resp = await fetch("{api_url}");
                            return await resp.json();
                        }} catch (e) {{
                            return {{ error: e.message }};
                        }}
                    }}
                ''')

                if not response or response.get('error'):
                    if verbose:
                        print(f"    API error: {response.get('error', 'Unknown')}")
                    continue

                shows = response.get('shows', [])

                for show in shows:
                    theater_code = show.get('TheatreCode', '')
                    theater_name = theater_map.get(theater_code, f"Regal {theater_code}")

                    for film in show.get('Film', []):
                        master_code = film.get('MasterMovieCode', '').upper()
                        if ho_code.upper() not in master_code:
                            continue

                        for perf in film.get('Performances', []):
                            showtime_str = perf.get('CalendarShowTime', '')
                            perf_id = perf.get('PerformanceId', '')

                            if not showtime_str:
                                continue

                            # Parse showtime
                            try:
                                showtime_dt = datetime.fromisoformat(
                                    showtime_str.replace('Z', '+00:00')
                                )
                                if showtime_dt.tzinfo:
                                    showtime_dt = showtime_dt.replace(tzinfo=None)
                            except ValueError:
                                continue

                            time_str = showtime_dt.strftime('%-I:%M %p')

                            # Build ticket URL
                            ticket_url = (
                                f"https://www.regmovies.com/movies/"
                                f"our-hero-balthazar-{ho_code.lower()}"
                                f"?id={perf_id}&site={theater_code}&date={date_str_api}"
                            )

                            # Determine event type
                            stop_sales = perf.get('StopSales', False)
                            if stop_sales:
                                event_type = "General Admission (Sold Out)"
                            else:
                                event_type = "General Admission"

                            showtimes.append({
                                'theater': theater_name,
                                'date': date_str_iso,
                                'time': time_str,
                                'eventType': event_type,
                                'ticketLink': ticket_url,
                                '_source': 'regal',
                                '_performanceId': perf_id
                            })

            except Exception as e:
                if verbose:
                    print(f"    Error on {date_str_iso}: {e}")
                continue

        browser.close()

    if verbose:
        print(f"  Regal: {len(showtimes)} showtimes found")

    return showtimes


if __name__ == "__main__":
    # Test the scraper
    print("Testing Regal scraper...")
    results = fetch_regal_showtimes(verbose=True)
    print(f"\nFound {len(results)} showtimes:")
    for r in results[:5]:
        print(f"  {r['date']} {r['time']} - {r['theater']}")
