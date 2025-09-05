CREATE TABLE IF NOT EXISTS user_identities (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  token_id INTEGER,
  discord_id VARCHAR(255),
  discord_username VARCHAR(255),
  twitter_id VARCHAR(255),
  twitter_username VARCHAR(255),
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(wallet_address)
);

-- Insert default tournament info if not exists
INSERT INTO tournament_settings (key, value) 
VALUES ('tournament_name', 'PIGGY SUMMER POKER')
ON CONFLICT (key) DO NOTHING;

INSERT INTO tournament_settings (key, value) 
VALUES ('tournament_url', 'https://www.pokernow.club/mtt/piggy-summer-poker-NV9_BmueuR')
ON CONFLICT (key) DO NOTHING;
