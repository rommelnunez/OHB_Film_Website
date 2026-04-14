"""
AMC scraper using Playwright to scrape from theater-specific pages.
Visits each theater's showtimes page to get correct showtime IDs per theater.
"""

import re
from datetime import datetime, timedelta


# Theater configurations - each has a unique slug and city
AMC_THEATERS = [
    {'slug': 'amc-burbank-town-center-8', 'city': 'los-angeles', 'name': 'AMC Burbank Town Center 8'},
    {'slug': 'amc-century-city-15', 'city': 'los-angeles', 'name': 'AMC Century City 15'},
    {'slug': 'amc-the-americana-at-brand-18', 'city': 'los-angeles', 'name': 'AMC The Americana at Brand 18'},
]


def fetch_amc_showtimes(
    movie_id: str = "83057",
    movie_slug: str = "our-hero-balthazar-83057",
    theaters: list[dict] = None,
    days_ahead: int = 14,
    verbose: bool = False
) -> list[dict]:
    """
    Fetch showtimes from AMC by scraping each theater's dedicated page.

    Args:
        movie_id: AMC's internal movie ID
        movie_slug: URL slug for the movie
        theaters: List of theater dicts with 'slug', 'city', and 'name'
        days_ahead: Number of days to look ahead
        verbose: Print progress info

    Returns:
        List of showtime dicts with: theater, date, time, eventType, ticketLink
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        if verbose:
            print("  AMC: Playwright not installed, skipping")
        return []

    if theaters is None:
        theaters = AMC_THEATERS

    if verbose:
        print(f"  Fetching AMC showtimes for {len(theaters)} theaters...")

    showtimes = []
    today = datetime.now()
    end_date = today + timedelta(days=days_ahead)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) '
                       'Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()

        for theater in theaters:
            theater_name = theater['name']
            theater_slug = theater['slug']
            theater_city = theater.get('city', 'los-angeles')

            if verbose:
                print(f"  Fetching {theater_name}...")

            try:
                # Visit the theater's showtimes page
                url = f"https://www.amctheatres.com/movie-theatres/{theater_city}/{theater_slug}/showtimes"
                page.goto(url, wait_until='domcontentloaded', timeout=30000)
                page.wait_for_timeout(2500)

                # Check if movie is playing
                html = page.content()
                if "Our Hero" not in html and "our-hero" not in html.lower():
                    if verbose:
                        print(f"    Movie not found at {theater_name}")
                    continue

                # Get all showtime links on the page
                links = page.query_selector_all('a[href*="/showtimes/"]')

                for link in links:
                    href = link.get_attribute('href') or ''
                    text = link.inner_text().strip()

                    # Extract showtime ID
                    showtime_match = re.search(r'/showtimes/(\d+)', href)
                    if not showtime_match:
                        continue

                    showtime_id = showtime_match.group(1)

                    # Parse time from text (e.g., "1:30pm", "10:15am")
                    time_match = re.match(
                        r'^(\d{1,2}:\d{2}\s*(?:am|pm)?)',
                        text.replace(' ', '').lower()
                    )

                    if not time_match:
                        continue

                    raw_time = time_match.group(1)
                    time_str = normalize_time(raw_time)

                    # Build ticket URL
                    if href.startswith('/'):
                        ticket_url = f"https://www.amctheatres.com{href}"
                    else:
                        ticket_url = href

                    if not ticket_url.endswith('/seats'):
                        ticket_url = ticket_url.rstrip('/') + '/seats'

                    # Determine event type
                    event_type = "General Admission"
                    if 'sold out' in text.lower():
                        event_type = "General Admission (Sold Out)"

                    # Use today's date (the default page shows today's showtimes)
                    date_str = today.strftime('%Y-%m-%d')

                    showtimes.append({
                        'theater': theater_name,
                        'date': date_str,
                        'time': time_str,
                        'eventType': event_type,
                        'ticketLink': ticket_url,
                        '_source': 'amc'
                    })

                if verbose:
                    theater_count = len([s for s in showtimes if s['theater'] == theater_name])
                    print(f"    Found {theater_count} showtimes")

            except Exception as e:
                if verbose:
                    print(f"    Error: {e}")
                continue

        # Also scrape future dates if needed
        if days_ahead > 1:
            for day_offset in range(1, min(days_ahead, 8)):  # Limit to a week ahead
                future_date = today + timedelta(days=day_offset)
                date_str = future_date.strftime('%Y-%m-%d')

                for theater in theaters:
                    theater_name = theater['name']
                    theater_slug = theater['slug']
                    theater_city = theater.get('city', 'los-angeles')

                    try:
                        url = f"https://www.amctheatres.com/movie-theatres/{theater_city}/{theater_slug}/showtimes?date={date_str}"
                        page.goto(url, wait_until='domcontentloaded', timeout=30000)
                        page.wait_for_timeout(2000)

                        html = page.content()
                        if "Our Hero" not in html and "our-hero" not in html.lower():
                            continue

                        links = page.query_selector_all('a[href*="/showtimes/"]')

                        for link in links:
                            href = link.get_attribute('href') or ''
                            text = link.inner_text().strip()

                            showtime_match = re.search(r'/showtimes/(\d+)', href)
                            if not showtime_match:
                                continue

                            showtime_id = showtime_match.group(1)

                            time_match = re.match(
                                r'^(\d{1,2}:\d{2}\s*(?:am|pm)?)',
                                text.replace(' ', '').lower()
                            )

                            if not time_match:
                                continue

                            raw_time = time_match.group(1)
                            time_str = normalize_time(raw_time)

                            if href.startswith('/'):
                                ticket_url = f"https://www.amctheatres.com{href}"
                            else:
                                ticket_url = href

                            if not ticket_url.endswith('/seats'):
                                ticket_url = ticket_url.rstrip('/') + '/seats'

                            event_type = "General Admission"
                            if 'sold out' in text.lower():
                                event_type = "General Admission (Sold Out)"

                            # Check for duplicates
                            key = f"{theater_name}-{date_str}-{showtime_id}"
                            existing = [s for s in showtimes if f"{s['theater']}-{s['date']}-{s['ticketLink']}" == f"{theater_name}-{date_str}-{ticket_url}"]
                            if not existing:
                                showtimes.append({
                                    'theater': theater_name,
                                    'date': date_str,
                                    'time': time_str,
                                    'eventType': event_type,
                                    'ticketLink': ticket_url,
                                    '_source': 'amc'
                                })

                    except Exception:
                        continue

        browser.close()

    if verbose:
        print(f"  AMC: {len(showtimes)} total showtimes found")

    # Sort by date and time
    showtimes.sort(key=lambda x: (x['date'], x['time']))

    return showtimes


def normalize_time(raw_time: str) -> str:
    """Normalize AMC time format to 'H:MM AM/PM'."""
    raw_time = raw_time.strip().lower()
    match = re.match(r'(\d{1,2}):(\d{2})\s*(am|pm)?', raw_time)
    if not match:
        return raw_time

    hour = int(match.group(1))
    minute = match.group(2)
    period = match.group(3) or ''

    return f"{hour}:{minute} {period.upper()}".strip()


if __name__ == "__main__":
    print("Testing AMC scraper...")
    results = fetch_amc_showtimes(days_ahead=3, verbose=True)
    print(f"\nFound {len(results)} showtimes:")

    from collections import defaultdict
    by_theater = defaultdict(list)
    for r in results:
        by_theater[r['theater']].append(r)

    for theater, shows in by_theater.items():
        print(f"\n{theater}:")
        for s in shows[:5]:
            print(f"  {s['date']} {s['time']} -> ...{s['ticketLink'][-20:]}")
