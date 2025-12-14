-- Migration: Add unique constraint on discord_id for Tips Wallet merge feature
-- This ensures one Discord account = one user identity record

-- Check if constraint already exists, if not - add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_identities_discord_id_unique'
  ) THEN
    ALTER TABLE user_identities
    ADD CONSTRAINT user_identities_discord_id_unique UNIQUE (discord_id);
  END IF;
END $$;

-- Create index for better performance on discord_id lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_identities_discord_id ON user_identities(discord_id);

-- Create index for wallet_address conflict checks (if not exists)  
CREATE INDEX IF NOT EXISTS idx_user_identities_wallet_address ON user_identities(wallet_address);
