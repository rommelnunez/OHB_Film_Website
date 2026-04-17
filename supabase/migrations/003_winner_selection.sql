-- Winner selection & fulfillment workflow.
-- Adds fulfillment_email override to campaigns and status/reply columns to entries.

ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS fulfillment_email TEXT,
  ADD COLUMN IF NOT EXISTS fulfillment_cc_emails TEXT;

ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS selected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reply_token UUID,
  ADD COLUMN IF NOT EXISTS requested_tickets INTEGER,
  ADD COLUMN IF NOT EXISTS requested_showtimes JSONB,
  ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS booked_showtime JSONB,
  ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_entries_reply_token ON entries(reply_token) WHERE reply_token IS NOT NULL;
