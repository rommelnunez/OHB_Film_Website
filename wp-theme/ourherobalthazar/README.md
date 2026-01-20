# Our Hero, Balthazar - WordPress Theme

## Installation Instructions

### 1. Upload Theme to WordPress

**Option A: Via WordPress Admin (Recommended)**
1. Zip the `ourherobalthazar` folder
2. Log into your WordPress admin panel
3. Go to **Appearance → Themes → Add New → Upload Theme**
4. Upload the zip file and click "Install Now"
5. Click "Activate"

**Option B: Via FTP**
1. Upload the `ourherobalthazar` folder to `/wp-content/themes/` on your server
2. Log into WordPress admin
3. Go to **Appearance → Themes**
4. Find "Our Hero, Balthazar" and click "Activate"

### 2. Configure Theme Settings

#### A. Set Hero Image & Trailer
1. Go to **Appearance → Customize**
2. Open **Hero Section**
   - Upload your hero background image (currently using `BalthyREGRADE__1.697.1.jpg`)
3. Open **Trailer**
   - Enter YouTube trailer URL
   - Edit film synopsis text
4. Click "Publish"

#### B. Add Q&A Events
1. Go to **Q&A Events → Add New**
2. Enter event title (e.g., "Opening Night Q&A with Director Oscar Boyson")
3. Fill in:
   - Event Date: `JANUARY 24, 2026`
   - Location: `Angelika Film Center, New York`
   - Time: `7:30 PM Screening + Q&A`
4. Click "Publish"
5. Repeat for all events

#### C. Add Press Quotes
1. Go to **Press Quotes → Add New**
2. Enter quote text in the content editor
3. Fill in Source (e.g., `VARIETY`, `THE HOLLYWOOD REPORTER`)
4. Click "Publish"
5. Drag to reorder in the list view

#### D. Add Cast & Crew
1. Go to **Cast & Crew → Add New**
2. Enter name as title (e.g., "Jaeden Martell")
3. Fill in Role (e.g., "Balthazar", "Director")
4. Enter bio in the content editor (shows on hover)
5. Click "Publish"
6. Drag to reorder in the list view

### 3. Set as Homepage
1. Go to **Settings → Reading**
2. Select "A static page"
3. Choose "Home" as the homepage
4. Click "Save Changes"

## Theme Features

### Custom Post Types
- **Q&A Events**: Manage scheduled screenings and Q&As
- **Press Quotes**: Add and reorder press reviews
- **Cast & Crew**: Manage cast/crew with hover-reveal bios

### Customizer Options
- Hero background image
- YouTube trailer URL
- Film synopsis

### Automatic Features
- Responsive mobile-first design
- Hover effects on cast cards
- Smooth scrolling navigation
- SEO-optimized markup

## Content Management

### To Update Content:
- **Hero Image**: Appearance → Customize → Hero Section
- **Trailer**: Appearance → Customize → Trailer
- **Q&As**: Q&A Events menu
- **Press**: Press Quotes menu
- **Cast**: Cast & Crew menu

### To Update Ticketing Links:
Edit `index.php` lines 72-87 to add real ticketing URLs.

## File Structure
```
ourherobalthazar/
├── style.css          # Theme header
├── functions.php      # Theme functionality
├── header.php         # HTML head
├── footer.php         # Footer scripts
├── index.php          # Main template
└── assets/
    ├── css/
    │   └── styles.css # All styles
    ├── js/
    │   └── main.js    # JavaScript
    └── images/        # Theme images
```

## Support

For questions or issues, contact: davidschneider@gmail.com

## Version
1.0 - January 2026
