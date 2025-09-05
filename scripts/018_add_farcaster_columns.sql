-- Add Farcaster columns to user_identities table
ALTER TABLE user_identities 
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS platform_user_id TEXT,
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Update existing records to have platform values
UPDATE user_identities 
SET platform = 'discord', platform_user_id = discord_id, username = discord_username
WHERE discord_id IS NOT NULL AND platform IS NULL;

UPDATE user_identities 
SET platform = 'twitter', platform_user_id = twitter_id, username = twitter_username  
WHERE twitter_id IS NOT NULL AND platform IS NULL;

UPDATE user_identities 
SET platform = 'email', username = email
WHERE email IS NOT NULL AND platform IS NULL;

-- Create unique constraint for wallet + platform combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_identities_wallet_platform 
ON user_identities(wallet_address, platform);
