#!/usr/bin/env python3
"""
Showtime Sync CLI Tool

Fetches new screenings from AMC, Regal, and Alamo Drafthouse,
compares against current site data, and outputs new entries in CSV format.

Usage:
    python sync_showtimes.py [options]

Options:
    --days N        Fetch N days ahead (default: 7)
    --verbose       Show detailed progress
    --alamo-only    Only fetch from Alamo (fast, no Playwright)
    --skip-alamo    Skip Alamo
    --skip-amc      Skip AMC
    --skip-regal    Skip Regal
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from config import MOVIE_CONFIG, THEATER_CITIES
from parsers.site_parser import (
    extract_showtimes_from_html,
    get_existing_showtime_keys,
    create_showtime_key,
    normalize_time
)
from scrapers.alamo import fetch_alamo_showtimes
from scrapers.amc import fetch_amc_showtimes
from scrapers.regal import fetch_regal_showtimes
from scrapers.fandango import fetch_fandango_showtimes


def get_project_root() -> Path:
    """Get the project root directory."""
    return Path(__file__).parent.parent.parent


def fetch_all_showtimes(
    days_ahead: int = 7,
    verbose: bool = False,
    skip_alamo: bool = False,
    skip_amc: bool = False,
    skip_regal: bool = False,
    skip_fandango: bool = False
) -> list[dict]:
    """
    Fetch showtimes from all configured sources.
    """
    all_showtimes = []

    # Alamo (REST API - fast)
    if not skip_alamo:
        alamo_config = MOVIE_CONFIG['alamo']
        alamo_results = fetch_alamo_showtimes(
            film_slug=alamo_config['film_slug'],
            markets=alamo_config['markets'],
            days_ahead=days_ahead,
            verbose=verbose
        )
        all_showtimes.extend(alamo_results)

    # AMC (Playwright)
    if not skip_amc:
        amc_config = MOVIE_CONFIG['amc']
        amc_results = fetch_amc_showtimes(
            movie_id=amc_config['movie_id'],
            movie_slug=amc_config['movie_slug'],
            theaters=amc_config['theaters'],
            days_ahead=days_ahead,
            verbose=verbose
        )
        all_showtimes.extend(amc_results)

    # Regal (Playwright)
    if not skip_regal:
        regal_config = MOVIE_CONFIG['regal']
        regal_results = fetch_regal_showtimes(
            ho_code=regal_config['ho_code'],
            theaters=regal_config['theaters'],
            days_ahead=days_ahead,
            verbose=verbose
        )
        all_showtimes.extend(regal_results)

    # Fandango (Playwright) - for Los Feliz 3, etc.
    if not skip_fandango:
        fandango_config = MOVIE_CONFIG['fandango']
        fandango_results = fetch_fandango_showtimes(
            movie_id=fandango_config['movie_id'],
            theaters=fandango_config['theaters'],
            days_ahead=days_ahead,
            verbose=verbose
        )
        all_showtimes.extend(fandango_results)

    return all_showtimes


def find_new_showtimes(
    fetched: list[dict],
    existing_keys: set[str]
) -> list[dict]:
    """
    Filter fetched showtimes to only those not already on the site.
    Also deduplicates by ticket URL (AMC sometimes returns same showtime for multiple theaters).
    """
    new_showtimes = []
    seen_urls = set()

    for showtime in fetched:
        # Dedupe by ticket URL first
        ticket_url = showtime.get('ticketLink', '')
        if ticket_url in seen_urls:
            continue
        seen_urls.add(ticket_url)

        key = create_showtime_key(
            showtime['theater'],
            showtime['date'],
            showtime['time']
        )
        if key not in existing_keys:
            new_showtimes.append(showtime)

    return new_showtimes


def format_csv_output(showtimes: list[dict]) -> str:
    """
    Format showtimes as CSV for copy-paste into showtimes.csv.
    Format: Theater,Date,Time,Event Type,Ticket Link
    """
    lines = ["Theater,Date,Time,Event Type,Ticket Link"]

    # Sort by date, then theater, then time
    sorted_showtimes = sorted(
        showtimes,
        key=lambda s: (s['date'], s['theater'], normalize_time(s['time']))
    )

    for s in sorted_showtimes:
        # Escape any commas in fields
        theater = s['theater'].replace(',', '')
        event_type = s['eventType'].replace(',', '')
        ticket_link = s['ticketLink']

        lines.append(f"{theater},{s['date']},{s['time']},{event_type},{ticket_link}")

    return '\n'.join(lines)


def print_summary(
    fetched_count: dict,
    existing_count: int,
    new_showtimes: list[dict]
):
    """Print a summary of the sync operation."""
    print("\n" + "=" * 60)
    print("SHOWTIME SYNC SUMMARY")
    print("=" * 60)

    print(f"\nFetched showtimes:")
    for source, count in fetched_count.items():
        print(f"  {source:15} {count:4} showtimes")

    print(f"\nExisting on site: {existing_count} showtimes")
    print(f"New showtimes:    {len(new_showtimes)}")

    if new_showtimes:
        print("\n" + "-" * 60)
        print("NEW SCREENINGS FOUND:")
        print("-" * 60)

        # Group by date
        by_date = {}
        for s in new_showtimes:
            if s['date'] not in by_date:
                by_date[s['date']] = []
            by_date[s['date']].append(s)

        for date in sorted(by_date.keys()):
            print(f"\n{date}:")
            for s in sorted(by_date[date], key=lambda x: x['theater']):
                print(f"  {s['theater']:30} {s['time']:10} {s['eventType']}")


def main():
    parser = argparse.ArgumentParser(
        description='Sync showtimes from theater APIs to site data'
    )
    parser.add_argument(
        '--days', type=int, default=7,
        help='Number of days ahead to fetch (default: 7)'
    )
    parser.add_argument(
        '--verbose', '-v', action='store_true',
        help='Show detailed progress'
    )
    parser.add_argument(
        '--alamo-only', action='store_true',
        help='Only fetch from Alamo (fast, no Playwright needed)'
    )
    parser.add_argument(
        '--skip-alamo', action='store_true',
        help='Skip Alamo Drafthouse'
    )
    parser.add_argument(
        '--skip-amc', action='store_true',
        help='Skip AMC'
    )
    parser.add_argument(
        '--skip-regal', action='store_true',
        help='Skip Regal'
    )
    parser.add_argument(
        '--skip-fandango', action='store_true',
        help='Skip Fandango (Los Feliz 3, etc.)'
    )
    parser.add_argument(
        '--no-csv', action='store_true',
        help='Skip CSV output (summary only)'
    )

    args = parser.parse_args()

    # Handle --alamo-only flag
    skip_amc = args.skip_amc or args.alamo_only
    skip_regal = args.skip_regal or args.alamo_only
    skip_fandango = args.skip_fandango or args.alamo_only

    print(f"Fetching showtimes for the next {args.days} days...")
    print()

    # Get project root and index.html path
    project_root = get_project_root()
    index_path = project_root / "index.html"

    if not index_path.exists():
        print(f"Error: index.html not found at {index_path}")
        sys.exit(1)

    # Extract existing showtimes
    if args.verbose:
        print("Parsing existing showtimes from index.html...")

    try:
        existing_showtimes = extract_showtimes_from_html(str(index_path))
        existing_keys = {
            create_showtime_key(s['theater'], s['date'], s['time'])
            for s in existing_showtimes
        }
    except Exception as e:
        print(f"Error parsing index.html: {e}")
        sys.exit(1)

    if args.verbose:
        print(f"Found {len(existing_showtimes)} existing showtimes\n")

    # Fetch new showtimes
    fetched = fetch_all_showtimes(
        days_ahead=args.days,
        verbose=args.verbose,
        skip_alamo=args.skip_alamo,
        skip_amc=skip_amc,
        skip_regal=skip_regal,
        skip_fandango=skip_fandango
    )

    # Count by source
    fetched_count = {}
    for s in fetched:
        source = s.get('_source', 'unknown')
        fetched_count[source] = fetched_count.get(source, 0) + 1

    # Find new showtimes
    new_showtimes = find_new_showtimes(fetched, existing_keys)

    # Print summary
    print_summary(fetched_count, len(existing_showtimes), new_showtimes)

    # Output CSV if there are new showtimes
    if new_showtimes and not args.no_csv:
        print("\n" + "=" * 60)
        print("CSV OUTPUT (copy below this line):")
        print("=" * 60 + "\n")
        print(format_csv_output(new_showtimes))
        print("\n" + "=" * 60)

    if not new_showtimes:
        print("\nNo new showtimes to add.")

    return 0 if new_showtimes else 1


if __name__ == "__main__":
    sys.exit(main())
