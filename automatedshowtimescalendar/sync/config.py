"""
Configuration for showtime sync app.
Contains movie identifiers and theater configurations for each chain.
"""

MOVIE_CONFIG = {
    "alamo": {
        "film_slug": "our-hero-balthazar",
        "markets": ["los-angeles"]
    },
    "amc": {
        "movie_id": "83057",
        "movie_slug": "our-hero-balthazar-83057",
        "theaters": [
            # Only include theaters actually showing the movie
            # AMC page shows nearby theaters, so we query one and parse all
            {"slug": "amc-burbank-town-center-8", "name": "AMC Burbank Town Center 8"}
        ]
    },
    "regal": {
        "ho_code": "HO00020753",
        "theaters": [
            {"code": "1320", "name": "Regal Union Square"}
        ]
    },
    "fandango": {
        "movie_id": "244581",  # Fandango movie ID for Our Hero, Balthazar
        "theaters": [
            {"tid": "AACOO", "slug": "los-feliz-3-aacoo", "name": "Los Feliz 3"}
        ]
    }
}

# Maps theater names to cities for location filtering on the site
THEATER_CITIES = {
    "Regal Union Square": "New York",
    "AMC The Americana at Brand 18": "Los Angeles",
    "AMC Burbank Town Center 8": "Los Angeles",
    "Alamo Drafthouse DTLA": "Los Angeles",
    "Alamo Drafthouse Los Angeles": "Los Angeles",
    "Los Feliz 3": "Los Angeles",
    "Angelika Village East": "New York",
    "Cedar Lee Theatre": "Cleveland",
    "Playhouse Square Campus": "Cleveland",
    "Phoenix Film Foundation": "Phoenix",
    "Cinema 3 - Piers Handling Cinema": "Toronto"
}

# Path to the main site index.html (relative to project root)
SITE_INDEX_PATH = "index.html"
