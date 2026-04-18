-- Allow entrants to select preferred screenings at entry time.
-- Campaigns get a date range controlling which showtimes are shown.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS screening_start_date DATE,
  ADD COLUMN IF NOT EXISTS screening_end_date DATE;

ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS selected_screenings JSONB,
  ADD COLUMN IF NOT EXISTS instagram TEXT;
