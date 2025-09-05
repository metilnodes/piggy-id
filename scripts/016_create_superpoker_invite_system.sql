-- Create superpoker invite code system tables

-- Table to store all available superpoker invite codes
CREATE TABLE IF NOT EXISTS superpoker_invite_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to track code assignments to Discord users
CREATE TABLE IF NOT EXISTS superpoker_code_assignments (
    id SERIAL PRIMARY KEY,
    discord_id VARCHAR(255) NOT NULL,
    invite_code VARCHAR(255) NOT NULL REFERENCES superpoker_invite_codes(code),
    discord_username VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(discord_id),
    UNIQUE(invite_code)
);

-- Table to track when codes are actually used
CREATE TABLE IF NOT EXISTS superpoker_code_usage (
    id SERIAL PRIMARY KEY,
    invite_code VARCHAR(255) NOT NULL REFERENCES superpoker_invite_codes(code),
    player_name VARCHAR(255),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(invite_code)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_superpoker_code_assignments_discord_id ON superpoker_code_assignments(discord_id);
CREATE INDEX IF NOT EXISTS idx_superpoker_code_usage_code ON superpoker_code_usage(invite_code);

-- Show created tables
SELECT 'superpoker_invite_codes' as table_name, COUNT(*) as row_count FROM superpoker_invite_codes
UNION ALL
SELECT 'superpoker_code_assignments' as table_name, COUNT(*) as row_count FROM superpoker_code_assignments
UNION ALL
SELECT 'superpoker_code_usage' as table_name, COUNT(*) as row_count FROM superpoker_code_usage;
