-- Add unique constraints for username, email, and social media IDs
-- This prevents multiple users from having the same username, email, or social accounts

-- Username should be unique (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS user_identities_username_unique 
ON user_identities (LOWER(username)) 
WHERE username IS NOT NULL;

-- Email should be unique (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS user_identities_email_unique 
ON user_identities (LOWER(email)) 
WHERE email IS NOT NULL;

-- Discord ID should be unique
CREATE UNIQUE INDEX IF NOT EXISTS user_identities_discord_id_unique 
ON user_identities (discord_id) 
WHERE discord_id IS NOT NULL;

-- Twitter ID should be unique
CREATE UNIQUE INDEX IF NOT EXISTS user_identities_twitter_id_unique 
ON user_identities (twitter_id) 
WHERE twitter_id IS NOT NULL;

-- Platform user ID should be unique per platform (for Farcaster, etc.)
CREATE UNIQUE INDEX IF NOT EXISTS user_identities_platform_user_unique 
ON user_identities (platform, platform_user_id) 
WHERE platform IS NOT NULL AND platform_user_id IS NOT NULL;

-- Note: wallet_address already has a unique constraint from previous scripts
