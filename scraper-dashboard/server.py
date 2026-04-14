#!/usr/bin/env python3
"""
Unified Scraper Dashboard Server

A Flask server that:
1. Serves the dashboard HTML
2. Provides API endpoints for Playwright-based scrapers (Regal, AMC, Fandango)
3. Syncs CSV files to both OHB and WG websites

Run with: python server.py
Then open: http://localhost:5000
"""

import json
import os
import shutil
import sys
from datetime import datetime, timedelta
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

# Add parent directory to path for scraper imports
sys.path.insert(0, str(Path(__file__).parent.parent / 'automatedshowtimescalendar' / 'sync'))

app = Flask(__name__, static_folder='.')
CORS(app)

# Configuration
OHB_CSV_PATH = Path(__file__).parent.parent / 'showtimes.csv'
WG_CSV_PATH = Path('/Users/rommelnunez/Desktop/wg-website/public/data/showtimes.csv')

# Theater configurations for Playwright scrapers
REGAL_CONFIG = {
    'ho_code': 'HO00020753',
    'theaters': [
        {'code': '1320', 'name': 'Regal Union Square'},
        {'code': '0137', 'name': 'Regal E-Walk'},
        {'code': '1522', 'name': 'Regal Essex Crossing'},
    ]
}

AMC_CONFIG = {
    'movie_id': '83057',
    'movie_slug': 'our-hero-balthazar-83057',
    'theaters': [
        {'slug': 'amc-burbank-town-center-8', 'city': 'los-angeles', 'name': 'AMC Burbank Town Center 8'},
        {'slug': 'amc-century-city-15', 'city': 'los-angeles', 'name': 'AMC Century City 15'},
        {'slug': 'amc-the-americana-at-brand-18', 'city': 'los-angeles', 'name': 'AMC The Americana at Brand 18'},
    ]
}

FANDANGO_CONFIG = {
    'movie_id': '244581',
    'theaters': [
        {'tid': 'AACOO', 'slug': 'los-feliz-3-aacoo', 'name': 'Los Feliz 3'},
    ]
}


# ============================================
# ROUTES
# ============================================

@app.route('/')
def index():
    """Serve the dashboard HTML"""
    return send_from_directory('.', 'index.html')


@app.route('/api/status')
def status():
    """Check server status and Playwright availability"""
    playwright_available = False
    try:
        from playwright.sync_api import sync_playwright
        playwright_available = True
    except ImportError:
        pass

    return jsonify({
        'status': 'running',
        'playwright_available': playwright_available,
        'ohb_csv_exists': OHB_CSV_PATH.exists(),
        'wg_csv_exists': WG_CSV_PATH.exists(),
    })


@app.route('/api/scrape/regal', methods=['POST'])
def scrape_regal():
    """Run Regal scraper"""
    try:
        from scrapers.regal import fetch_regal_showtimes
    except ImportError as e:
        return jsonify({'error': f'Regal scraper not available: {e}'}), 500

    data = request.json or {}
    days_ahead = data.get('days_ahead', 14)

    try:
        results = fetch_regal_showtimes(
            ho_code=REGAL_CONFIG['ho_code'],
            theaters=REGAL_CONFIG['theaters'],
            days_ahead=days_ahead,
            verbose=True
        )

        # Convert to dashboard format
        formatted = [{
            'chain': 'regal',
            'theater': r['theater'],
            'date': r['date'],
            'time': r['time'],
            'eventType': r['eventType'],
            'ticketLink': r['ticketLink']
        } for r in results]

        return jsonify({
            'success': True,
            'count': len(formatted),
            'results': formatted
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/scrape/amc', methods=['POST'])
def scrape_amc():
    """Run AMC scraper"""
    try:
        from scrapers.amc import fetch_amc_showtimes
    except ImportError as e:
        return jsonify({'error': f'AMC scraper not available: {e}'}), 500

    data = request.json or {}
    days_ahead = data.get('days_ahead', 14)

    try:
        results = fetch_amc_showtimes(
            movie_id=AMC_CONFIG['movie_id'],
            movie_slug=AMC_CONFIG['movie_slug'],
            theaters=AMC_CONFIG['theaters'],
            days_ahead=days_ahead,
            verbose=True
        )

        formatted = [{
            'chain': 'amc',
            'theater': r['theater'],
            'date': r['date'],
            'time': r['time'],
            'eventType': r['eventType'],
            'ticketLink': r['ticketLink']
        } for r in results]

        return jsonify({
            'success': True,
            'count': len(formatted),
            'results': formatted
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/scrape/fandango', methods=['POST'])
def scrape_fandango():
    """Run Fandango scraper"""
    try:
        from scrapers.fandango import fetch_fandango_showtimes
    except ImportError as e:
        return jsonify({'error': f'Fandango scraper not available: {e}'}), 500

    data = request.json or {}
    days_ahead = data.get('days_ahead', 14)

    try:
        results = fetch_fandango_showtimes(
            movie_id=FANDANGO_CONFIG['movie_id'],
            theaters=FANDANGO_CONFIG['theaters'],
            days_ahead=days_ahead,
            verbose=True
        )

        formatted = [{
            'chain': 'fandango',
            'theater': r['theater'],
            'date': r['date'],
            'time': r['time'],
            'eventType': r['eventType'],
            'ticketLink': r['ticketLink']
        } for r in results]

        return jsonify({
            'success': True,
            'count': len(formatted),
            'results': formatted
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def parse_csv_to_set(csv_content):
    """Parse CSV content and return a dict keyed by theater+date+time"""
    entries = {}
    lines = csv_content.strip().split('\n')
    for i, line in enumerate(lines):
        if i == 0:  # Skip header
            continue
        if not line.strip():
            continue
        parts = line.split(',')
        if len(parts) >= 5:
            theater = parts[0]
            date = parts[1]
            time = parts[2]
            event_type = parts[3]
            ticket_link = ','.join(parts[4:])  # URL might have commas
            key = f"{theater}|{date}|{time}"
            entries[key] = {
                'theater': theater,
                'date': date,
                'time': time,
                'eventType': event_type,
                'ticketLink': ticket_link
            }
    return entries


def merge_showtimes(existing_csv, new_csv):
    """Merge new showtimes with existing ones, deduplicating by theater+date+time"""
    existing = parse_csv_to_set(existing_csv)
    new = parse_csv_to_set(new_csv)

    # Merge: new entries override existing ones with same key
    merged = {**existing, **new}

    # Sort by date, then time
    sorted_entries = sorted(merged.values(), key=lambda x: (x['date'], x['time']))

    # Generate CSV
    lines = ['Theater,Date,Time,Event Type,Ticket Link']
    for entry in sorted_entries:
        lines.append(f"{entry['theater']},{entry['date']},{entry['time']},{entry['eventType']},{entry['ticketLink']}")

    stats = {
        'total': len(sorted_entries),
        'added': len(new),
        'kept': len(existing) - len(set(existing.keys()) & set(new.keys()))
    }

    return '\n'.join(lines), stats


@app.route('/api/sync', methods=['POST'])
def sync_csv():
    """
    Save CSV to OHB website and sync to WG website.
    Expects JSON body with:
      - 'csv': CSV content
      - 'mode': 'merge' (default) or 'replace'
    """
    data = request.json or {}
    csv_content = data.get('csv', '')
    mode = data.get('mode', 'merge')

    if not csv_content:
        return jsonify({'error': 'No CSV content provided'}), 400

    results = {
        'ohb': {'success': False, 'path': str(OHB_CSV_PATH)},
        'wg': {'success': False, 'path': str(WG_CSV_PATH)}
    }
    stats = None

    # Handle merge mode
    if mode == 'merge' and OHB_CSV_PATH.exists():
        try:
            with open(OHB_CSV_PATH, 'r') as f:
                existing_csv = f.read()
            csv_content, stats = merge_showtimes(existing_csv, csv_content)
        except Exception as e:
            print(f"Error merging: {e}, falling back to replace mode")

    # Save to OHB
    try:
        with open(OHB_CSV_PATH, 'w') as f:
            f.write(csv_content)
        results['ohb']['success'] = True
    except Exception as e:
        results['ohb']['error'] = str(e)

    # Sync to WG
    try:
        # Ensure directory exists
        WG_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(WG_CSV_PATH, 'w') as f:
            f.write(csv_content)
        results['wg']['success'] = True
    except Exception as e:
        results['wg']['error'] = str(e)

    all_success = results['ohb']['success'] and results['wg']['success']

    response = {
        'success': all_success,
        'results': results,
        'timestamp': datetime.now().isoformat()
    }

    if stats:
        response['stats'] = stats

    return jsonify(response)


@app.route('/api/csv/current')
def get_current_csv():
    """Read and return the current OHB showtimes.csv"""
    try:
        if not OHB_CSV_PATH.exists():
            return jsonify({'error': 'showtimes.csv not found'}), 404

        with open(OHB_CSV_PATH, 'r') as f:
            content = f.read()

        # Parse CSV to count entries
        lines = content.strip().split('\n')
        count = len(lines) - 1 if lines else 0  # Subtract header

        return jsonify({
            'success': True,
            'content': content,
            'count': count,
            'path': str(OHB_CSV_PATH)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/config')
def get_config():
    """Return scraper configurations for display in dashboard"""
    return jsonify({
        'regal': REGAL_CONFIG,
        'amc': AMC_CONFIG,
        'fandango': FANDANGO_CONFIG
    })


# ============================================
# MAIN
# ============================================

if __name__ == '__main__':
    print("=" * 60)
    print("OHB Showtimes Scraper Dashboard")
    print("=" * 60)
    print(f"\nStarting server at http://localhost:5050")
    print(f"\nOHB CSV: {OHB_CSV_PATH}")
    print(f"WG CSV:  {WG_CSV_PATH}")

    # Check Playwright
    try:
        from playwright.sync_api import sync_playwright
        print("\n✓ Playwright available - Regal/AMC/Fandango scrapers enabled")
    except ImportError:
        print("\n⚠ Playwright not installed - Regal/AMC/Fandango scrapers disabled")
        print("  Install with: pip install playwright && playwright install chromium")

    print("\n" + "=" * 60)

    app.run(host='0.0.0.0', port=5050, debug=True)
