# OHB Film Website - Claude Code Documentation

This is the official website for "Our Hero, Balthazar" film, deployed on Vercel at ourherobalthazar.com.

## Project Overview

A Next.js 15 application that combines:
1. **Static Film Website** - Main promotional site served at `/` (from `public/index.html`)
2. **Giveaway Platform** - Entry form at `/freetickets` with Supabase, Resend, Google Sheets, hCaptcha
3. **Admin Portal** - Campaign management at `/admin`
4. **Showtimes Scraper** - Unified dashboard for scraping theater showtimes

## Directory Structure

```
OHB_Film_Website/
├── src/                        # Next.js app source
│   ├── app/
│   │   ├── freetickets/       # Giveaway entry form
│   │   ├── admin/             # Admin portal (password protected)
│   │   └── api/               # API routes (entry, campaigns, etc.)
│   └── lib/                   # Utilities (supabase, email, sheets)
├── public/                    # Static assets served at root
│   ├── index.html             # Main OHB website (served at /)
│   ├── showtimes.csv          # Current showtimes data
│   ├── assets/                # Images, fonts, theater logos
│   ├── robots.txt
│   └── sitemap.xml
├── scraper-dashboard/         # SHOWTIMES SCRAPER (standalone)
│   ├── updatescreenings       # CLI to launch dashboard
│   ├── server.py              # Python/Flask backend
│   ├── index.html             # Web dashboard UI
│   ├── scrapers/              # Playwright scrapers
│   │   ├── regal.py
│   │   ├── amc.py
│   │   ├── fandango.py
│   │   └── alamo.py
│   └── requirements.txt
├── supabase/                  # Database migrations
├── _archive/                  # Old files (gitignored)
│   └── pre-giveaway-merge/    # Original static site files
├── .env.local                 # Environment variables (not committed)
├── next.config.ts             # Rewrites / as public/index.html
└── package.json               # Next.js dependencies
```

## URLs

| Path | Description |
|------|-------------|
| `/` | Static OHB film website (from public/index.html) |
| `/freetickets` | Giveaway entry form |
| `/freetickets/rules` | Giveaway rules page |
| `/admin` | Admin portal (password: `ADMIN_PASSWORD` env var) |

## Giveaway Platform

### Working Integrations
| Service | Status | Notes |
|---------|--------|-------|
| Supabase | Active | Database for campaigns/entries |
| Resend | Active | Confirmation emails, domain verified |
| Google Sheets | Active | Auto-creates tabs per campaign |
| hCaptcha | Active | Bot protection |

### Environment Variables
See `.env.example` for required variables. Copy to `.env.local` and fill in values.

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` - hCaptcha site key
- `HCAPTCHA_SECRET_KEY` - hCaptcha secret key
- `RESEND_API_KEY` - Resend API key for emails
- `GOOGLE_SHEETS_CLIENT_EMAIL` - Google service account email
- `GOOGLE_SHEETS_PRIVATE_KEY` - Google service account private key
- `GOOGLE_SHEETS_SPREADSHEET_ID` - Target Google Sheets ID
- `NEXT_PUBLIC_APP_URL` - Production URL (https://ourherobalthazar.com)
- `ADMIN_PASSWORD` - Admin portal password

### Database Schema (Supabase)
- `campaigns` - slug, name, starts_at, ends_at (nullable), eligible_cities, google_sheet_id, google_sheet_tab, is_active
- `entries` - campaign_id, name, email, phone, city, age_confirmed, synced_to_sheet_at
- `task_completions` - (unused, for future engagement campaigns)

### Admin Portal Features
- Password-protected login
- List all campaigns with entry counts
- Create new campaigns (slug, name, dates, cities, etc.)
- Activate/deactivate campaigns (only one active at a time)
- View entries per campaign
- Delete campaigns

## Showtimes Scraper Dashboard

**Location:** `/scraper-dashboard/`

### Quick Start
```bash
./scraper-dashboard/updatescreenings
# Auto-installs deps, starts server at http://localhost:5050, opens browser
```

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

### Sync Feature
The dashboard syncs CSV to:
1. `/public/showtimes.csv` (this repo)
2. `/Users/rommelnunez/Desktop/wg-website/public/data/showtimes.csv` (WG site)

## Showtimes Data

### Storage
Showtimes are stored in TWO places:
1. **`public/index.html`** - `SHOWTIMES_DATA` JavaScript array (what the live site displays)
2. **`public/showtimes.csv`** - Backup/reference file

### Data Format
```javascript
// SHOWTIMES_DATA entry format
{
    theater: "Theater Name",
    date: "YYYY-MM-DD",
    time: "H:MM PM",
    eventType: "General Admission",
    ticketLink: "https://..."
}
```

### CRITICAL: Scraper Rules
**ALL SCRAPERS MUST ONLY RETURN SHOWTIMES FOR "OUR HERO, BALTHAZAR"**

Hardcoded movie identifiers per chain:
- AMC: `movie_slug = "our-hero-balthazar-83057"`, `movie_id = "83057"`
- Regal: `ho_code = "HO00020753"`
- Fandango: `movie_id = "244581"`
- Alamo: `film_slug = "our-hero-balthazar"`
- Reading/Angelika: Filter by `filmName` containing "Our Hero" or "Balthazar"

## Development

### Local Dev
```bash
npm run dev          # Next.js at http://localhost:3000
./scraper-dashboard/updatescreenings  # Scraper at http://localhost:5050
```

### Build
```bash
npm run build
```

### Deploy
Push to main branch - Vercel auto-deploys.

## Related Projects

### WG Website (Distribution Company)
Location: `/Users/rommelnunez/Desktop/wg-website`
- Next.js app with its own `public/data/showtimes.csv`
- Uses same CSV format as this site

## Key Files

### Giveaway
- `src/app/freetickets/page.tsx` - Entry form
- `src/app/admin/page.tsx` - Admin portal
- `src/app/api/entry/route.ts` - Entry submission API
- `src/app/api/campaigns/active/route.ts` - Get active campaign
- `src/app/api/admin/campaigns/route.ts` - Admin CRUD for campaigns
- `src/lib/email.ts` - Resend email sending
- `src/lib/sheets.ts` - Google Sheets sync
- `src/lib/supabase.ts` - Supabase client

### Static Site
- `public/index.html` - Main website with SHOWTIMES_DATA
- `public/showtimes.csv` - Showtimes backup
- `public/assets/` - Images, fonts, logos

### Scraper
- `scraper-dashboard/server.py` - Flask backend
- `scraper-dashboard/index.html` - Dashboard UI
- `scraper-dashboard/scrapers/` - Python scrapers
