-- Create user_identities table for storing connected social accounts and emails
CREATE TABLE IF NOT EXISTS user_identities (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    discord_id VARCHAR(255),
    discord_username VARCHAR(255),
    twitter_id VARCHAR(255), 
    twitter_username VARCHAR(255),
    token_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_identities_wallet ON user_identities(wallet_address);
CREATE INDEX IF NOT EXISTS idx_user_identities_email ON user_identities(email);
CREATE INDEX IF NOT EXISTS idx_user_identities_discord ON user_identities(discord_id);
CREATE INDEX IF NOT EXISTS idx_user_identities_twitter ON user_identities(twitter_id);
