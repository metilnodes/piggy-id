-- Add tips_wallet_address column to user_identities table
ALTER TABLE user_identities 
ADD COLUMN IF NOT EXISTS tips_wallet_address VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_identities_tips_wallet ON user_identities(tips_wallet_address);

-- Add unique constraint to ensure one tips wallet per discord_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_identities_discord_tips_wallet 
ON user_identities(discord_id) 
WHERE discord_id IS NOT NULL AND tips_wallet_address IS NOT NULL;
