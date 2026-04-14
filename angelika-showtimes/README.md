# Angelika Showtimes Finder

A web app to search for film showtimes across all Angelika Film Center locations and export them to CSV format compatible with `showtimes.csv`.

## Quick Start

1. Start the local server:
   ```bash
   cd /Users/rommelnunez/Desktop/OHB_Film_Website/angelika-showtimes
   python3 -m http.server 8001
   ```

2. Open http://localhost:8001 in your browser

3. Get a fresh Bearer token from the Angelika website (see below)

4. Enter the film title and search

5. Click "Download CSV" to export showtimes

## Getting a Bearer Token

The API requires authentication. Tokens expire after ~1 hour.

1. Go to any Angelika theater page (e.g., https://angelikafilmcenter.com/dallas)
2. Open Developer Tools (F12 or Cmd+Option+I)
3. Go to Network tab
4. Refresh the page or click on showtimes
5. Look for requests to `production-api.readingcinemas.com`
6. Click on any request and find the `Authorization` header
7. Copy the token (everything after "Bearer ")

## API Reference

### Base URL
```
https://production-api.readingcinemas.com
```

### Endpoints

#### Get Films/Showtimes
```
GET /films?brandId=US&countryId=6&cinemaId={cinemaId}&status=getShows&flag=nowshowing&selectedDate={YYYY-MM-DD}
```

**Parameters:**
- `brandId`: `US` (required for Angelika theaters)
- `countryId`: `6` (required)
- `cinemaId`: Theater ID (see below)
- `status`: `getShows`
- `flag`: `nowshowing` (IMPORTANT: use this, not `initial`)
- `selectedDate`: Optional, format `YYYY-MM-DD`

**Headers:**
```
Authorization: Bearer {token}
Accept: application/json
Origin: https://angelikafilmcenter.com
Referer: https://angelikafilmcenter.com/
```

#### Get Cinema Info
```
GET /getcinemas?countryId=6&slug={cinemaId}
```

### Cinema IDs and URL Slugs

| Cinema ID | Theater Name | Website Slug | Location |
|-----------|--------------|--------------|----------|
| `0000000004` | Village East by Angelika | `villageeast` | New York, NY |
| `0000000005` | Angelika New York | `nyc` | New York, NY (SoHo) |
| `0000000006` | Angelika Film Center & Café at Mosaic | `mosaic` | Fairfax, VA |
| `0000000007` | Angelika Pop-Up at Union Market | `dc` | Washington, DC |
| `0000000009` | Angelika Film Center - Dallas | `dallas` | Dallas, TX |

### Ticket URL Format
```
https://angelikafilmcenter.com/{slug}/sessions/{sessionId}/{ScheduledFilmId}
```

Example:
```
https://angelikafilmcenter.com/dallas/sessions/91617/HO00007849
```

## API Response Structure

```json
{
  "nowShowing": {
    "statusCode": 200,
    "data": {
      "movies": [
        {
          "theater": "0000000009",
          "name": "Film Title",
          "movieSlug": "film-title",
          "ratingDescription": "PG-13",
          "length": "120",
          "genre": "Drama",
          "showdates": [
            {
              "date": "2026-04-14",
              "showtypes": [
                {
                  "type": "Standard",
                  "showtimes": [
                    {
                      "id": "91617",
                      "ScheduledFilmId": "HO00007849",
                      "date_time": "2026-04-14T12:00:00-05",
                      "availableSeats": "150",
                      "soldout": false
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      "filter": {
        "session": [
          {"value": "2026-04-14", "text": "Mon, Apr 14"},
          {"value": "2026-04-15", "text": "Tue, Apr 15"}
        ]
      }
    }
  },
  "advanceTicket": {
    "data": {
      "advSessions": []
    }
  }
}
```

## Important Notes

1. **Token Expiration**: Tokens expire after ~1 hour. Get a fresh one if you see "Unauthorized" errors.

2. **API Flag**: Always use `flag=nowshowing` not `flag=initial`. The `initial` flag returns different session IDs that don't work with the ticket URLs.

3. **Date Filtering**: The initial API call only returns the current day's showtimes. To get future dates, you must make separate calls with `selectedDate` parameter for each date.

4. **Timezone**: API returns times like `2026-04-14T12:00:00-05` (note: no colon in timezone offset). The app fixes this for proper Date parsing.

5. **No Plano**: The Angelika Plano location doesn't appear to be in this API system.

## CSV Export Format

The CSV download matches the format of `showtimes.csv`:

```
Theater,Date,Time,Event Type,Ticket Link
Angelika Film Center - Dallas,2026-04-14,12:00 PM,General Admission,https://angelikafilmcenter.com/dallas/sessions/91617/HO00007849
```

## Troubleshooting

### "Unauthorized" Error
- Token has expired. Get a fresh one from the website.

### Links Don't Work
- Make sure you're using `flag=nowshowing` in API calls
- Verify the cinema ID to slug mapping is correct

### Missing Showtimes
- The API only returns dates that have scheduled showtimes
- Check the filter dates in the response to see available dates

### "Invalid Date" Display
- The app handles the non-standard timezone format (`-05` vs `-05:00`)
- If you see this, there may be a different date format in the response
