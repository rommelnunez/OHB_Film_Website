# Reading Cinemas Showtimes Finder

A web app to search for showtimes at Reading Cinemas US locations.

## Supported Theaters (US - countryId=5)

| Cinema ID | Theater Name | City | State |
|-----------|--------------|------|-------|
| 20 | Cal Oaks with Titan Luxe | Murrieta | CA |
| 19 | Grossmont with Titan XC | La Mesa | CA |
| 17 | Valley Plaza with IMAX & Titan Luxe | Bakersfield | CA |
| 0000000003 | Manville with Titan Luxe | Manville | NJ |

## How to Run

1. Start a local server:
   ```bash
   cd reading-showtimes
   python3 -m http.server 8003
   ```

2. Open http://localhost:8003 in your browser

## Authentication

This API requires a Bearer token from AWS Cognito. To get a token:

1. Go to https://readingcinemas.com
2. Open browser DevTools (F12) > Network tab
3. Navigate to any movie showtimes page
4. Look for requests to `production-api.readingcinemas.com`
5. Copy the `Authorization: Bearer ...` header value

**Note:** Tokens expire after approximately 1 hour.

## API Details

### Base URL
```
https://production-api.readingcinemas.com
```

### Get Cinemas
```
GET /getcinemas?countryId=5
```

### Get Session Data (Showtimes)
```
GET /films?countryId=5&cinemaId={cinemaId}&sessionId={sessionId}&sort=true&status=getSessionData
```

### Required Headers
```
Authorization: Bearer {token}
Origin: https://readingcinemas.com
Referer: https://readingcinemas.com/
Accept: application/json
```

### Response Structure (Session Data)
```json
{
  "movieName": "OUR HERO, BALTHAZAR",
  "movieId": "HO00008244",
  "movieSlug": "our-hero-balthazar",
  "sessionId": "150342",
  "cinemaId": "0000000003",
  "cinemaName": "MANVILLE WITH TITAN LUXE",
  "showDateTime": "2026-04-17T17:30:00-04",
  "availableSeats": "79",
  "totalNumberOfSeats": "82",
  "screenName": "Screen 11"
}
```

### Ticket URL Format
```
https://readingcinemas.com/{cinema-slug}/buy-tickets/{movie-slug}?sessionId={sessionId}&visession={sessionId}
```

## CSV Export

The app exports showtimes in a format compatible with the main ticket calendar:
```
Theater,Date,Time,Event Type,Ticket Link
```

## Notes

- Country ID 5 = United States
- Country ID 6 = Angelika Film Center (separate brand, same API)
- Tokens are AWS Cognito JWT tokens, expire in ~1 hour
- The API returns session-level data (one entry per showtime)
