-- Add unique index for verified emails per wallet
CREATE UNIQUE INDEX IF NOT EXISTS email_verifications_wallet_unique_verified
ON email_verifications (wallet_address)
WHERE verified = true;

-- Add indexes for token lookups
CREATE INDEX IF NOT EXISTS email_verifications_token_idx
ON email_verifications (verification_token);

CREATE INDEX IF NOT EXISTS email_verifications_token_hash_idx
ON email_verifications (token_hash);

-- Clean up old unverified records
DELETE FROM email_verifications 
WHERE verified = false 
  AND expires_at < NOW();
