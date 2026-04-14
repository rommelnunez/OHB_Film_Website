"""
Parser to extract existing SHOWTIMES_DATA from index.html.
"""

import re
import json
from pathlib import Path


def extract_showtimes_from_html(html_path: str) -> list[dict]:
    """
    Extract the SHOWTIMES_DATA JavaScript array from index.html.

    Returns a list of dicts with keys: theater, date, time, eventType, ticketLink
    """
    html_content = Path(html_path).read_text(encoding='utf-8')

    # Find the SHOWTIMES_DATA array in the JavaScript
    # Pattern matches: const SHOWTIMES_DATA = [...];
    pattern = r'const\s+SHOWTIMES_DATA\s*=\s*\[(.*?)\];'
    match = re.search(pattern, html_content, re.DOTALL)

    if not match:
        raise ValueError("Could not find SHOWTIMES_DATA in the HTML file")

    array_content = match.group(1)

    # Parse the JavaScript object literals into Python dicts
    # Each entry looks like: { theater: "...", date: "...", time: "...", eventType: "...", ticketLink: "..." }
    showtimes = []

    # Match each object in the array
    obj_pattern = r'\{\s*theater:\s*"([^"]+)",\s*date:\s*"([^"]+)",\s*time:\s*"([^"]+)",\s*eventType:\s*"([^"]+)",\s*ticketLink:\s*"([^"]+)"\s*\}'

    for obj_match in re.finditer(obj_pattern, array_content):
        showtimes.append({
            'theater': obj_match.group(1),
            'date': obj_match.group(2),
            'time': obj_match.group(3),
            'eventType': obj_match.group(4),
            'ticketLink': obj_match.group(5)
        })

    return showtimes


def normalize_time(time_str: str) -> str:
    """
    Normalize time format for comparison.
    Converts various formats to "H:MM AM/PM" format.
    e.g., "7:00PM" -> "7:00 PM", "07:00 PM" -> "7:00 PM"
    """
    # Remove extra spaces
    time_str = time_str.strip()

    # Add space before AM/PM if missing
    time_str = re.sub(r'(\d)(AM|PM)', r'\1 \2', time_str, flags=re.IGNORECASE)

    # Normalize AM/PM to uppercase
    time_str = re.sub(r'\s*(am|pm)\s*$', lambda m: ' ' + m.group(1).upper(), time_str, flags=re.IGNORECASE)

    # Remove leading zeros from hour
    time_str = re.sub(r'^0(\d:)', r'\1', time_str)

    return time_str


def create_showtime_key(theater: str, date: str, time: str) -> str:
    """
    Create a unique key for a showtime for comparison purposes.
    """
    normalized_time = normalize_time(time)
    return f"{theater}|{date}|{normalized_time}"


def get_existing_showtime_keys(html_path: str) -> set[str]:
    """
    Get a set of unique keys for all existing showtimes.
    """
    showtimes = extract_showtimes_from_html(html_path)
    return {
        create_showtime_key(s['theater'], s['date'], s['time'])
        for s in showtimes
    }


if __name__ == "__main__":
    # Test the parser
    import sys
    from pathlib import Path

    # Find index.html relative to this script
    script_dir = Path(__file__).parent.parent.parent.parent
    index_path = script_dir / "index.html"

    if index_path.exists():
        showtimes = extract_showtimes_from_html(str(index_path))
        print(f"Found {len(showtimes)} showtimes in index.html")
        print("\nFirst 3 entries:")
        for s in showtimes[:3]:
            print(f"  {s['theater']} | {s['date']} | {s['time']}")
    else:
        print(f"index.html not found at {index_path}")
