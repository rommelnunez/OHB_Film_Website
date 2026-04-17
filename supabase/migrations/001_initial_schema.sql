-- ============================================================
-- CAMPAIGNS
-- Each giveaway campaign with its configuration
-- ============================================================
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(20) NOT NULL DEFAULT 'simple',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone VARCHAR(50) DEFAULT 'America/Los_Angeles',
  prize_description TEXT DEFAULT 'Two free tickets to Our Hero Balthazar',
  winner_count INTEGER NOT NULL DEFAULT 10,
  eligible_cities JSONB,
  min_age INTEGER DEFAULT 17,
  google_sheet_id TEXT,
  google_sheet_tab TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ENTRIES
-- Each user's entry in a campaign
-- ============================================================
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  city VARCHAR(100),
  zip VARCHAR(10),
  age_confirmed BOOLEAN NOT NULL DEFAULT false,
  total_entries INTEGER DEFAULT 1,
  synced_to_sheet_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, email)
);

-- ============================================================
-- TASK COMPLETIONS (for engagement campaigns)
-- ============================================================
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID REFERENCES entries(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL,
  task_target VARCHAR(255),
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entry_id, task_type, task_target)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_campaigns_slug ON campaigns(slug);
CREATE INDEX idx_campaigns_active ON campaigns(is_active);
CREATE INDEX idx_entries_campaign ON entries(campaign_id);
CREATE INDEX idx_entries_email ON entries(email);
CREATE INDEX idx_task_completions_entry ON task_completions(entry_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- Public can read active campaigns
CREATE POLICY "Public read active campaigns" ON campaigns
  FOR SELECT USING (is_active = true);

-- Service role manages entries (API routes use service role)
CREATE POLICY "Service role manages entries" ON entries
  FOR ALL USING (auth.role() = 'service_role');

-- Service role manages tasks
CREATE POLICY "Service role manages tasks" ON task_completions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Increment entry count atomically
CREATE OR REPLACE FUNCTION increment_entry_count(entry_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE entries
  SET total_entries = total_entries + 1,
      updated_at = NOW()
  WHERE id = entry_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
