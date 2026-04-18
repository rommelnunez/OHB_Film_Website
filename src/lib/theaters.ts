import { promises as fs } from 'fs';
import path from 'path';

// Mirror of public/index.html THEATER_CITIES. Keep in sync when adding venues.
export const THEATER_CITIES: Record<string, string> = {
  'Regal Union Square': 'New York',
  'AMC The Americana at Brand 18': 'Los Angeles',
  'AMC Burbank Town Center 8': 'Los Angeles',
  'Alamo Drafthouse DTLA': 'Los Angeles',
  "Alamo Drafthouse Sloan's Lake": 'Denver',
  'Alamo Drafthouse Wrigleyville': 'Chicago',
  'Los Feliz 3': 'Los Angeles',
  'HQ LO2': 'New Haven',
  'Angelika Village East': 'New York',
  'Village East by Angelika': 'New York',
  'Village East by Angelika (NYC)': 'New York',
  'Angelika New York (SoHo)': 'New York',
  'Angelika Mosaic (Fairfax, VA)': 'Washington DC',
  'Angelika Pop-Up at Union Market (DC)': 'Washington DC',
  'Angelika Film Center - Dallas': 'Dallas',
  'Cedar Lee Theatre': 'Cleveland',
  'Playhouse Square Campus': 'Cleveland',
  'Phoenix Film Foundation': 'Phoenix',
  'Cinema 3 - Piers Handling Cinema': 'Toronto',
  'Reading Cinemas Manville (NJ)': 'New Jersey',
  'Angelika Carmel Mountain (San Diego)': 'San Diego',
};

export interface Showtime {
  theater: string;
  date: string;
  time: string;
  eventType: string;
  ticketLink: string;
  city: string;
  soldOut: boolean;
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

async function readShowtimesCsv(): Promise<Showtime[]> {
  const csvPath = path.join(process.cwd(), 'public', 'showtimes.csv');
  const raw = await fs.readFile(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  const rows = lines.slice(1);

  return rows.map((line) => {
    const [theater, date, time, eventType, ticketLink] = splitCsvLine(line);
    const soldOut = (eventType || '').toLowerCase().includes('sold out');
    return {
      theater,
      date,
      time,
      eventType,
      ticketLink,
      city: THEATER_CITIES[theater] || 'Unknown',
      soldOut,
    };
  });
}

export async function getShowtimesForCity(
  city: string,
  opts?: { startDate?: string; endDate?: string }
): Promise<Showtime[]> {
  const all = await readShowtimesCsv();
  const today = new Date().toISOString().slice(0, 10);
  const start = opts?.startDate && opts.startDate >= today ? opts.startDate : today;
  const end = opts?.endDate;
  return all
    .filter((s) => s.city === city && s.date >= start && (!end || s.date <= end))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export async function findShowtime(
  city: string,
  theater: string,
  date: string,
  time: string
): Promise<Showtime | null> {
  const rows = await getShowtimesForCity(city);
  return (
    rows.find(
      (s) => s.theater === theater && s.date === date && s.time === time
    ) || null
  );
}
