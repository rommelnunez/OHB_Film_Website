# OHB Film Website - Claude Code Documentation

This is the official website for "Our Hero, Balthazar" film, hosted on GitHub Pages at ourbalthazar.com.

## Directory Structure

```
OHB_Film_Website/
├── index.html              # Main website (single-page app)
├── showtimes.csv           # Backup/reference of all showtimes
├── assets/                 # Images, fonts, styles
│   └── images/
│       └── theaters/       # Theater chain logos (SVG/PNG)
├── scraper-dashboard/      # UNIFIED SCRAPER UI (run this!)
│   ├── updatescreenings    # CLI shortcut to launch dashboard
│   ├── index.html          # Web dashboard UI
│   ├── server.py           # Python backend for Playwright scrapers
│   └── requirements.txt    # Python dependencies
├── automatedshowtimescalendar/
│   └── sync/               # Python CLI scrapers (Playwright-based)
├── alamo-showtimes/        # Individual Alamo scraper (for testing/debugging)
├── angelika-showtimes/     # Individual Angelika scraper (for testing/debugging)
├── reading-showtimes/      # Individual Reading scraper (for testing/debugging)
├── docs/                   # Technical documentation
├── shopifytest/            # Merch integration test pages
├── ALR_website/            # Separate project (ALR website)
└── _archive/               # Old/unused files (gitignored)
```

## How Showtimes Work

### Data Storage
Showtimes are stored in TWO places that must stay in sync:

1. **`index.html`** - The `SHOWTIMES_DATA` JavaScript array (lines ~234-525)
   - This is what the live site actually displays
   - Must be updated manually or via the scraper dashboard

2. **`showtimes.csv`** - Backup/reference file
   - Format: `Theater,Date,Time,Event Type,Ticket Link`
   - Used for record-keeping and importing to other sites

### Updating Showtimes

**Recommended: Use the Unified Scraper Dashboard**

```bash
# Quick start (auto-installs deps, opens browser)
./scraper-dashboard/updatescreenings

# Or manually:
cd scraper-dashboard
pip install -r requirements.txt
playwright install chromium
python server.py
# Opens at http://localhost:5050
```

The dashboard provides:
- **One-click scraping** for all 6 theater chains
- **Merge or Replace modes** - merge adds new showtimes while keeping existing ones
- **Automatic sync** to both OHB and WG websites
- **Load Existing** button to view current showtimes before syncing
- **Server status indicator** shows if Playwright scrapers are available

### Theater Configuration

**SHOWTIMES_DATA entry format:**
```javascript
{
    theater: "Theater Name",
    date: "YYYY-MM-DD",
    time: "H:MM PM",
    eventType: "General Admission",
    ticketLink: "https://..."
}
```

**THEATER_CITIES mapping** (line ~507 in index.html):
```javascript
const THEATER_CITIES = {
    "Regal Union Square": "New York",
    "AMC The Americana at Brand 18": "Los Angeles",
    "Alamo Drafthouse Sloan's Lake": "Denver",
    "Reading Cinemas Manville (NJ)": "New Jersey",
    // ... etc
};
```

**THEATER_LOGOS mapping** (line ~525 in index.html):
```javascript
const THEATER_LOGOS = {
    "Regal": "assets/images/theaters/regal.svg",
    "AMC": "assets/images/theaters/amc.svg",
    "Alamo": "assets/images/theaters/alamo.svg",
    "Reading": "assets/images/theaters/reading.svg",
    // ... etc
};
```

**getTheaterBrand function** (line ~544 in index.html):
- Maps theater names to logo keys
- Add new chains here when needed

## Scraper Dashboard

Location: `/scraper-dashboard/`

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Web Dashboard (index.html)                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Alamo     │  │   Reading   │  │  Angelika   │  Direct  │
│  │  (fetch)    │  │   (fetch)   │  │   (fetch)   │   API    │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Regal     │  │    AMC      │  │  Fandango   │  Via     │
│  │ (server.py) │  │ (server.py) │  │ (server.py) │  Server  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘          │
└─────────┼────────────────┼────────────────┼─────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────┐
│                  Python Server (server.py)                   │
│         Flask + Playwright (runs headless Chrome)           │
│                                                              │
│  Endpoints:                                                  │
│    POST /api/scrape/regal    → Playwright scraper           │
│    POST /api/scrape/amc      → Playwright scraper           │
│    POST /api/scrape/fandango → Playwright scraper           │
│    POST /api/sync            → Save CSV (merge/replace)     │
│    GET  /api/csv/current     → Load existing showtimes      │
│    GET  /api/status          → Server + Playwright status   │
└─────────────────────────────────────────────────────────────┘
```

### Scraper Types

| Chain | Type | Auth Required | Notes |
|-------|------|---------------|-------|
| Alamo Drafthouse | Direct API | No | Public REST API |
| Reading Cinemas | Direct API | Yes (Bearer) | AWS Cognito token |
| Angelika Film Center | Direct API | Yes (Bearer) | Same token as Reading |
| Regal Cinemas | Playwright | No | Cloudflare protected |
| AMC Theatres | Playwright | No | Cloudflare protected |
| Fandango | Playwright | No | Cloudflare protected |

### Getting Bearer Tokens (Reading/Angelika)
1. Go to https://readingcinemas.com or https://angelikafilmcenter.com
2. Open DevTools > Network tab
3. Navigate to any movie's showtimes
4. Find request to `production-api.readingcinemas.com`
5. Copy the `Authorization: Bearer ...` header
6. Tokens expire after ~1 hour

### Running the Dashboard

**Quickest way (recommended):**
```bash
./scraper-dashboard/updatescreenings
# Auto-installs deps, starts server at http://localhost:5050, opens browser
```

**Full functionality (all 6 chains + sync):**
```bash
cd scraper-dashboard
pip install -r requirements.txt
playwright install chromium
python server.py
# Open http://localhost:5050
```

**Basic mode (API chains only, no sync):**
```bash
cd scraper-dashboard
python3 -m http.server 5050
# Open http://localhost:5050
# Regal/AMC/Fandango will show "Needs Server"
```

### Sync Feature

The "Sync to Both Websites" button automatically writes the CSV to:
1. `/Users/rommelnunez/Desktop/OHB_Film_Website/showtimes.csv`
2. `/Users/rommelnunez/Desktop/wg-website/public/data/showtimes.csv`

**Sync Modes:**
- **Merge** (default): Adds new showtimes while keeping existing ones. Deduplicates by theater+date+time.
- **Replace**: Completely overwrites existing CSV with new results.

Both sites use the exact same CSV format, so they stay in sync.

## Python CLI Scrapers (Legacy)

Location: `/automatedshowtimescalendar/sync/`

These are still available for command-line use, but the dashboard is preferred.

### Setup
```bash
cd automatedshowtimescalendar/sync
pip install playwright
playwright install chromium
```

### Usage
```bash
python sync_showtimes.py --days 14           # All chains, 14 days ahead
python sync_showtimes.py --alamo-only        # Fast test (no Playwright)
python sync_showtimes.py --skip-regal        # Skip specific chain
python sync_showtimes.py --verbose           # Show progress
```

### Scraper Files
- `scrapers/alamo.py` - REST API, no auth
- `scrapers/regal.py` - Playwright + internal API
- `scrapers/amc.py` - Playwright
- `scrapers/fandango.py` - Playwright
- `config.py` - Theater IDs and configuration

## Adding a New Theater Chain

1. **Create logo file** in `assets/images/theaters/` (SVG with `fill="white"`)

2. **Add to THEATER_LOGOS** in index.html:
   ```javascript
   "NewChain": "assets/images/theaters/newchain.svg"
   ```

3. **Add to getTheaterBrand()** in index.html:
   ```javascript
   if (theaterName.toLowerCase().includes("new chain")) return "NewChain";
   ```

4. **Add theater to THEATER_CITIES**:
   ```javascript
   "New Chain Theater Name": "City Name"
   ```

5. **If chain has API**, add scraper to:
   - `scraper-dashboard/index.html` (JavaScript, for direct API)
   - `scraper-dashboard/server.py` (Python, for Playwright-based)

6. **Add theater config** to `server.py`:
   ```python
   NEWCHAIN_CONFIG = {
       'theaters': [
           {'id': '123', 'name': 'New Chain Theater Name'},
       ]
   }
   ```

## Related Projects

### WG Website (Distribution Company)
Location: `/Users/rommelnunez/Desktop/wg-website`
- Next.js app with its own `public/data/showtimes.csv`
- Uses same CSV format as this site
- Rebuilds on push via GitHub Actions

### Sync Strategy
Both sites use the same CSV format. The dashboard syncs automatically, or manually:
1. Run scraper dashboard
2. Click "Sync to Both Websites"
3. Commit and push both repos

## Common Tasks

### Add new showtimes manually
1. Edit `index.html`, find `SHOWTIMES_DATA` array
2. Add entries in chronological order
3. Add theater to `THEATER_CITIES` if new
4. Update `showtimes.csv` for backup
5. Commit and push

### Mark showtime as sold out
Change `eventType` to include "(Sold Out)":
```javascript
eventType: "General Admission (Sold Out)"
```

### Test locally
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

### Deploy
Just push to main branch - GitHub Pages auto-deploys.

## File Reference

| File | Purpose |
|------|---------|
| `index.html` | Main website, contains SHOWTIMES_DATA |
| `showtimes.csv` | Backup of all showtimes |
| `CNAME` | Custom domain config |
| `robots.txt` | SEO config |
| `sitemap.xml` | SEO sitemap |
| `.nojekyll` | Disable Jekyll processing |
| `scraper-dashboard/server.py` | Unified scraper backend |
| `scraper-dashboard/index.html` | Unified scraper UI |

## Notes

- Theater logos must have `fill="white"` to be visible on dark background
- Time format: "H:MM AM/PM" (e.g., "7:30 PM", "10:00 AM")
- Date format: "YYYY-MM-DD" (e.g., "2026-04-17")
- The ticket calendar filters out past dates automatically
- The scraper dashboard requires Python 3.8+ and Node.js for Playwright

## CRITICAL: Scraper Rules

**ALL SCRAPERS MUST ONLY RETURN SHOWTIMES FOR "OUR HERO, BALTHAZAR"**

This is the film website for "Our Hero, Balthazar" - scrapers should NEVER return showtimes for other movies. When writing or modifying scrapers:

1. **Always filter by movie** - Use movie-specific URLs or filter API responses by film title/ID
2. **Hardcoded movie identifiers per chain:**
   - AMC: `movie_slug = "our-hero-balthazar-83057"`, `movie_id = "83057"`
   - Regal: `ho_code = "HO00020753"`
   - Fandango: `movie_id = "244581"`
   - Alamo: `film_slug = "our-hero-balthazar"`
   - Reading/Angelika: Filter by `filmName` containing "Our Hero" or "Balthazar"

3. **Verify output** - After scraping, confirm results are for the correct film, not all movies at a theater

4. **AMC-specific**: Use the movie-specific URL format:
   ```
   /movies/{movie_slug}/showtimes/{movie_slug}/{date}/{theater_slug}/all
   ```
   NOT the theater showtimes page (which shows all movies)
