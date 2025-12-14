-- Migration: Make wallet_address nullable to support stub users
-- This allows creating user_identities records for Discord tips recipients
-- who haven't connected their main wallet yet

-- Drop NOT NULL constraint on wallet_address (safe operation)
ALTER TABLE user_identities 
ALTER COLUMN wallet_address DROP NOT NULL;

-- Add comment explaining the nullable field
COMMENT ON COLUMN user_identities.wallet_address IS 
  'Main wallet address (nullable for stub users who received tips before connecting)';

-- Create index for faster queries on non-null wallet addresses
CREATE INDEX IF NOT EXISTS idx_user_identities_wallet_address_non_null 
  ON user_identities(wallet_address) 
  WHERE wallet_address IS NOT NULL;
