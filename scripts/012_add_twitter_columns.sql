-- Add Twitter columns to user_identities table
ALTER TABLE user_identities 
  ADD COLUMN IF NOT EXISTS twitter_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(255);

-- Ensure unique constraint on wallet_address
CREATE UNIQUE INDEX IF NOT EXISTS user_identities_wallet_unique ON user_identities (wallet_address);
