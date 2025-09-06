-- Adding Discord columns to user_identities table if they don't exist
ALTER TABLE user_identities
ADD COLUMN IF NOT EXISTS discord_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS discord_username VARCHAR(255);
