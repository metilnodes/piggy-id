-- Create tables for invite code tracking system

-- Table to store all available invite codes from CSV
CREATE TABLE IF NOT EXISTS invite_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track code assignments to token IDs
CREATE TABLE IF NOT EXISTS code_assignments (
    id SERIAL PRIMARY KEY,
    token_id INTEGER NOT NULL,
    invite_code VARCHAR(255) NOT NULL REFERENCES invite_codes(code),
    wallet_address VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(token_id),
    UNIQUE(invite_code)
);

-- Table to track when codes are actually used (can be updated manually or via webhook)
CREATE TABLE IF NOT EXISTS code_usage (
    id SERIAL PRIMARY KEY,
    invite_code VARCHAR(255) NOT NULL REFERENCES invite_codes(code),
    player_name VARCHAR(255),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(invite_code)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_code_assignments_token_id ON code_assignments(token_id);
CREATE INDEX IF NOT EXISTS idx_code_assignments_wallet ON code_assignments(wallet_address);
CREATE INDEX IF NOT EXISTS idx_code_usage_code ON code_usage(invite_code);
