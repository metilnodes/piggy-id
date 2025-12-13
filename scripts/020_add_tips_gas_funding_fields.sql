-- Add gas funding tracking fields for Tips Wallet
-- This prevents repeated funding after bot restarts

ALTER TABLE user_identities 
ADD COLUMN IF NOT EXISTS tips_gas_funded_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS tips_gas_funding_tx VARCHAR(66) NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_tips_gas_funded_at ON user_identities(tips_gas_funded_at);

-- Add comment for documentation
COMMENT ON COLUMN user_identities.tips_gas_funded_at IS 'Timestamp when welcome gas was sent to tips wallet';
COMMENT ON COLUMN user_identities.tips_gas_funding_tx IS 'Transaction hash of the welcome gas funding';
