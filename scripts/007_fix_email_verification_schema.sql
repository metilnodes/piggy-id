-- Fix email verification table schema
DROP TABLE IF EXISTS email_verifications;

CREATE TABLE email_verifications (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  verification_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unique index on email to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS email_verifications_email_unique 
ON email_verifications (email);

-- Create index on verification_token for faster lookups
CREATE INDEX IF NOT EXISTS email_verifications_token_idx 
ON email_verifications (verification_token);
