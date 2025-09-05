CREATE TABLE IF NOT EXISTS email_verifications (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  email VARCHAR(255) NOT NULL,
  verification_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(verification_token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_wallet ON email_verifications(wallet_address);
