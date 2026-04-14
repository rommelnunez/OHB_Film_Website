# Alamo Drafthouse Showtimes Finder

A web app to search for showtimes at Alamo Drafthouse theaters using their public API.

## Supported Theaters

| Market | Cinema ID | Theater Name | Address |
|--------|-----------|--------------|---------|
| Denver | 0402 | Alamo Drafthouse Sloan's Lake | 4255 W Colfax Ave, Denver, CO 80204 |
| Chicago | 1801 | Alamo Drafthouse Wrigleyville | 3519 N Clark St, Chicago, IL 60657 |

## How to Run

1. Start a local server:
   ```bash
   cd alamo-showtimes
   python3 -m http.server 8002
   ```

2. Open http://localhost:8002 in your browser

## API Details

### Endpoint
```
https://drafthouse.com/s/mother/v2/schedule/market/{market}
```

### Markets
- `denver` - Denver Area (Sloan's Lake, Westminster, Littleton)
- `chicago` - Chicago Area (Wrigleyville)

### Response Structure
```javascript
{
  data: {
    sessions: [
      {
        cinemaId: "0402",
        sessionId: "146150",
        presentationSlug: "our-hero-balthazar",
        showTimeClt: "2026-04-22T18:00:00",
        soldOut: false,
        seatsLeft: 50,
        status: "ONSALE"
      }
    ],
    market: [
      {
        cinemas: [
          {
            id: "0402",
            slug: "sloans-lake",
            name: "Sloans Lake"
          }
        ]
      }
    ]
  }
}
```

### Ticket URL Format
```
https://drafthouse.com/{market}/show/{presentationSlug}?date={YYYY-MM-DD}&cinemaId={cinemaId}&sessionId={sessionId}
```

## CSV Export

The app can export showtimes to CSV format compatible with the main ticket calendar:
```
Theater,Date,Time,Event Type,Ticket Link
```

## Notes

- The API is public and requires no authentication
- Sessions include `seatsLeft` count for availability tracking
- `soldOut: true` indicates no tickets available
- `showTimeClt` is in local theater time (CLT = Cinema Local Time)
