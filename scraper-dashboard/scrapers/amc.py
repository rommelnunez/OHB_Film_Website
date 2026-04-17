"""
AMC scraper using Playwright to scrape theater-specific pages.

IMPORTANT: This scraper is ONLY for "Our Hero, Balthazar" showtimes.

Strategy: Visit each theater's showtimes page, find the movie section by its title link,
and extract only the showtimes from that movie's section (not all movies on the page).
"""

import re
from datetime import datetime, timedelta


# Theater configurations - each has a unique slug and city
AMC_THEATERS = [
    {'slug': 'amc-burbank-town-center-8', 'city': 'los-angeles', 'name': 'AMC Burbank Town Center 8'},
    {'slug': 'amc-century-city-15', 'city': 'los-angeles', 'name': 'AMC Century City 15'},
    {'slug': 'amc-the-americana-at-brand-18', 'city': 'los-angeles', 'name': 'AMC The Americana at Brand 18'},
]

# CRITICAL: This is the movie we're tracking - "Our Hero, Balthazar"
# Do NOT change this unless tracking a different film
MOVIE_SLUG = "our-hero-balthazar-83057"
MOVIE_TITLE = "Our Hero, Balthazar"


def fetch_amc_showtimes(
    movie_id: str = "83057",
    movie_slug: str = MOVIE_SLUG,
    theaters: list[dict] = None,
    days_ahead: int = 14,
    verbose: bool = False
) -> list[dict]:
    """
    Fetch showtimes from AMC for "Our Hero, Balthazar" ONLY.

    Strategy:
    1. Visit each theater's showtimes page
    2. Find the movie section by locating the movie title link
    3. Extract ONLY showtimes from that movie's parent container

    This ensures we only get showtimes for our specific film, not all movies.

    Args:
        movie_id: AMC's internal movie ID (83057 for Our Hero, Balthazar)
        movie_slug: URL slug for the movie (our-hero-balthazar-83057)
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
        print(f"  Movie: {MOVIE_TITLE}")

    showtimes = []
    today = datetime.now()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                       'AppleWebKit/537.36 (KHTML, like Gecko) '
                       'Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()

        # Scrape each date
        for day_offset in range(min(days_ahead, 14)):
            target_date = today + timedelta(days=day_offset)
            date_str = target_date.strftime('%Y-%m-%d')

            for theater in theaters:
                theater_name = theater['name']
                theater_slug = theater['slug']
                theater_city = theater.get('city', 'los-angeles')

                if verbose and day_offset == 0:
                    print(f"  Fetching {theater_name}...")

                try:
                    # Visit the theater's showtimes page with date
                    if day_offset == 0:
                        url = f"https://www.amctheatres.com/movie-theatres/{theater_city}/{theater_slug}/showtimes"
                    else:
                        url = f"https://www.amctheatres.com/movie-theatres/{theater_city}/{theater_slug}/showtimes?date={date_str}"

                    page.goto(url, wait_until='domcontentloaded', timeout=30000)
                    page.wait_for_timeout(2500)

                    # Find the movie title link for "Our Hero, Balthazar"
                    movie_link = page.query_selector(f'a[href*="{movie_slug}"]')

                    if not movie_link:
                        # Try finding by text content
                        all_movie_links = page.query_selector_all('a[href*="/movies/"]')
                        for link in all_movie_links:
                            text = link.inner_text().strip().lower()
                            if 'our hero' in text or 'balthazar' in text:
                                movie_link = link
                                break

                    if not movie_link:
                        if verbose and day_offset == 0:
                            print(f"    Movie not playing at {theater_name} on {date_str}")
                        continue

                    # Find the movie's parent container (section/article/div that contains showtimes)
                    # Walk up the DOM to find the container that includes both the title and showtimes
                    movie_section_html = page.evaluate('''(movieLink) => {
                        let current = movieLink;
                        // Walk up to find a container that has showtime links
                        for (let i = 0; i < 10; i++) {
                            current = current.parentElement;
                            if (!current) break;

                            // Check if this container has showtime links
                            const showtimeLinks = current.querySelectorAll('a[href*="/showtimes/"]');
                            if (showtimeLinks.length > 0) {
                                return current.outerHTML;
                            }
                        }
                        return null;
                    }''', movie_link)

                    if not movie_section_html:
                        if verbose and day_offset == 0:
                            print(f"    Could not find showtime section for movie at {theater_name}")
                        continue

                    # Extract showtime IDs and times from the movie section HTML
                    showtime_matches = re.findall(
                        r'href="([^"]*?/showtimes/(\d+)[^"]*)"[^>]*>([^<]*)',
                        movie_section_html
                    )

                    found_count = 0
                    for href, showtime_id, text in showtime_matches:
                        # Parse time from text
                        time_match = re.match(
                            r'^(\d{1,2}:\d{2}\s*(?:am|pm)?)',
                            text.strip().replace(' ', '').lower()
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

                        # Check for duplicates
                        existing = [s for s in showtimes
                                    if s['theater'] == theater_name
                                    and s['ticketLink'] == ticket_url]
                        if not existing:
                            showtimes.append({
                                'theater': theater_name,
                                'date': date_str,
                                'time': time_str,
                                'eventType': event_type,
                                'ticketLink': ticket_url,
                                '_source': 'amc'
                            })
                            found_count += 1

                    if verbose and day_offset == 0:
                        print(f"    Found {found_count} showtimes for {date_str}")

                except Exception as e:
                    if verbose and day_offset == 0:
                        print(f"    Error: {e}")
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
