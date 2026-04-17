"""
Fandango scraper using Playwright to fetch showtimes.
Required for theaters like Los Feliz 3 that only list on Fandango.
"""

import re
from datetime import datetime, timedelta
from urllib.parse import unquote


def fetch_fandango_showtimes(
    movie_id: str = "244581",
    theaters: list[dict] = None,
    days_ahead: int = 7,
    verbose: bool = False
) -> list[dict]:
    """
    Fetch showtimes from Fandango using Playwright browser automation.

    Args:
        movie_id: Fandango's movie ID (mid parameter)
        theaters: List of theater dicts with 'tid' (theater code) and 'name' keys
        days_ahead: Number of days to look ahead
        verbose: Print progress info

    Returns:
        List of showtime dicts with: theater, date, time, eventType, ticketLink
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        if verbose:
            print("  Fandango: Playwright not installed, skipping")
        return []

    if theaters is None:
        theaters = [
            {"tid": "AACOO", "slug": "los-feliz-3-aacoo", "name": "Los Feliz 3"}
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

        start_date = datetime.now()

        for theater in theaters:
            theater_slug = theater['slug']
            theater_name = theater['name']
            theater_tid = theater['tid']

            if verbose:
                print(f"  Fetching Fandango {theater_name}...")

            for day_offset in range(days_ahead):
                current_date = start_date + timedelta(days=day_offset)
                date_str = current_date.strftime('%Y-%m-%d')

                url = f"https://www.fandango.com/{theater_slug}/theater-page?format=all&date={date_str}"

                try:
                    page.goto(url, wait_until='domcontentloaded', timeout=30000)
                    page.wait_for_timeout(3000)  # Wait for JS rendering

                    # Look for Our Hero, Balthazar section
                    # Find all showtime links that contain our movie ID
                    links = page.query_selector_all(f'a[href*="mid={movie_id}"]')

                    if not links and verbose:
                        # Try to find by movie name
                        content = page.content()
                        if 'balthazar' not in content.lower():
                            continue

                    for link in links:
                        href = link.get_attribute('href') or ''

                        # Always extract time from URL's sdate parameter (has 24h format)
                        sdate_match = re.search(r'sdate=([^&]+)', href)
                        if not sdate_match:
                            continue

                        sdate = unquote(sdate_match.group(1))
                        # Format: 2026-04-10+13:30 or 2026-04-10 13:30
                        time_part = sdate.split('+')[-1] if '+' in sdate else sdate.split(' ')[-1]

                        if ':' not in time_part:
                            continue

                        hour, minute = map(int, time_part.split(':'))
                        period = 'AM' if hour < 12 else 'PM'
                        display_hour = hour
                        if hour > 12:
                            display_hour = hour - 12
                        elif hour == 0:
                            display_hour = 12
                        time_str = f"{display_hour}:{minute:02d} {period}"

                        # Build ticket URL (use the href as-is if it's complete)
                        if href.startswith('http'):
                            ticket_url = href
                        else:
                            ticket_url = f"https://www.fandango.com{href}"

                        showtimes.append({
                            'theater': theater_name,
                            'date': date_str,
                            'time': time_str,
                            'eventType': "General Admission",
                            'ticketLink': ticket_url,
                            '_source': 'fandango'
                        })

                except Exception as e:
                    if verbose:
                        print(f"    Error on {date_str}: {e}")
                    continue

        browser.close()

    # Deduplicate by ticket URL
    seen = set()
    unique_showtimes = []
    for s in showtimes:
        if s['ticketLink'] not in seen:
            seen.add(s['ticketLink'])
            unique_showtimes.append(s)

    if verbose:
        print(f"  Fandango: {len(unique_showtimes)} showtimes found")

    return unique_showtimes


def normalize_fandango_time(raw_time: str, hour_24: int = None) -> str:
    """
    Normalize Fandango time format to "H:MM AM/PM".
    If hour_24 is provided, use it to determine AM/PM.
    """
    raw_time = raw_time.strip().lower()

    match = re.match(r'(\d{1,2}):(\d{2})\s*(am|pm)?', raw_time)
    if not match:
        return raw_time

    hour = int(match.group(1))
    minute = match.group(2)
    period = match.group(3) or ''

    # If no period provided and we have 24-hour info, calculate it
    if not period and hour_24 is not None:
        period = 'am' if hour_24 < 12 else 'pm'
        # Also adjust display hour from 24h format
        if hour_24 > 12:
            hour = hour_24 - 12
        elif hour_24 == 0:
            hour = 12

    # If still no period, infer from typical movie times (afternoon/evening)
    # Times 1-11 without AM/PM in movie context are typically PM
    if not period:
        if 1 <= hour <= 11:
            period = 'pm'
        else:
            period = 'pm'  # noon and midnight edge cases

    return f"{hour}:{minute} {period.upper()}"


if __name__ == "__main__":
    print("Testing Fandango scraper...")
    results = fetch_fandango_showtimes(verbose=True)
    print(f"\nFound {len(results)} showtimes:")
    for r in results[:10]:
        print(f"  {r['date']} {r['time']} - {r['theater']}")
