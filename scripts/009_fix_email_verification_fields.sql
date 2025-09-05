-- Fix email_verifications table structure
ALTER TABLE email_verifications 
ADD COLUMN IF NOT EXISTS token_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS email_verifications_token_idx ON email_verifications (verification_token);
CREATE INDEX IF NOT EXISTS email_verifications_token_hash_idx ON email_verifications (token_hash);
CREATE INDEX IF NOT EXISTS email_verifications_email_idx ON email_verifications (email);

-- Ensure user_identities table has proper structure for email platform
ALTER TABLE user_identities 
ADD COLUMN IF NOT EXISTS platform VARCHAR(50) DEFAULT 'email',
ADD COLUMN IF NOT EXISTS platform_user_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS username VARCHAR(255),
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create unique constraint for wallet_address + platform combination
CREATE UNIQUE INDEX IF NOT EXISTS user_identities_wallet_platform_unique 
ON user_identities (wallet_address, platform);
