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
├── automatedshowtimescalendar/
│   └── sync/               # Python CLI scrapers (Playwright-based)
├── alamo-showtimes/        # Individual Alamo scraper (web UI)
├── angelika-showtimes/     # Individual Angelika scraper (web UI)
├── reading-showtimes/      # Individual Reading scraper (web UI)
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

**Recommended: Use the Scraper Dashboard**
```bash
cd scraper-dashboard
python3 -m http.server 8000
# Open http://localhost:8000
```

The dashboard scrapes Alamo, Reading, and Angelika theaters and exports CSV.

**After scraping:**
1. Download the CSV from the dashboard
2. Copy new entries to `showtimes.csv`
3. Add new entries to the `SHOWTIMES_DATA` array in `index.html`
4. Commit and push

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

Location: `/scraper-dashboard/index.html`

### Supported Chains (Web UI)
- **Alamo Drafthouse** - No auth required, uses public API
- **Reading Cinemas** - Requires Bearer token (AWS Cognito)
- **Angelika Film Center** - Same token as Reading (same API)

### Getting Bearer Tokens
1. Go to https://readingcinemas.com or https://angelikafilmcenter.com
2. Open DevTools > Network tab
3. Navigate to any movie's showtimes
4. Find request to `production-api.readingcinemas.com`
5. Copy the `Authorization: Bearer ...` header
6. Tokens expire after ~1 hour

### Chains Requiring Python CLI
These need Playwright (headless browser) due to Cloudflare protection:
- **Regal** - Run: `python sync_showtimes.py --regal-only`
- **AMC** - Run: `python sync_showtimes.py --amc-only`
- **Fandango** - Run: `python sync_showtimes.py --fandango-only`

## Python CLI Scrapers

Location: `/automatedshowtimescalendar/sync/`

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

5. **If chain has API**, add scraper to `scraper-dashboard/index.html`

## Related Projects

### WG Website (Distribution Company)
Location: `/Users/rommelnunez/Desktop/wg-website`
- Next.js app with its own `public/data/showtimes.csv`
- Uses same CSV format as this site
- Rebuilds on push via GitHub Actions

### Sync Strategy
Both sites use the same CSV format. After scraping:
1. Update `OHB_Film_Website/showtimes.csv`
2. Update `OHB_Film_Website/index.html` SHOWTIMES_DATA array
3. Copy CSV to `wg-website/public/data/showtimes.csv`
4. Commit and push both repos

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

## Notes

- Theater logos must have `fill="white"` to be visible on dark background
- Time format: "H:MM AM/PM" (e.g., "7:30 PM", "10:00 AM")
- Date format: "YYYY-MM-DD" (e.g., "2026-04-17")
- The ticket calendar filters out past dates automatically
