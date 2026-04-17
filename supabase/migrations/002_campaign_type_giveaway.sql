-- Switch campaign_type defaults to 'giveaway' (while-supplies-last) vs 'raffle'.
-- Existing rows with 'simple' or NULL are treated as giveaways.

ALTER TABLE campaigns ALTER COLUMN campaign_type SET DEFAULT 'giveaway';

UPDATE campaigns
SET campaign_type = 'giveaway'
WHERE campaign_type IS NULL OR campaign_type NOT IN ('giveaway', 'raffle');
