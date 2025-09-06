-- Ensure twitter_id and twitter_username columns exist in user_identities table
ALTER TABLE user_identities 
ADD COLUMN IF NOT EXISTS twitter_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(255);

-- Create unique index on wallet_address if it doesn't exist
CREATE UNIQUE INDEX IF NOT EXISTS user_identities_wallet_unique ON user_identities (wallet_address);
