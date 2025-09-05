-- Add tournament name column to tournament_settings table
ALTER TABLE tournament_settings 
ADD COLUMN IF NOT EXISTS tournament_name TEXT DEFAULT 'PIGGY SUMMER POKER';

-- Insert default tournament info if no records exist
INSERT INTO tournament_settings (setting_key, setting_value, tournament_name)
SELECT 'tournament_url', 'https://www.pokernow.club/mtt/piggy-summer-poker-NV9_BmueuR', 'PIGGY SUMMER POKER'
WHERE NOT EXISTS (SELECT 1 FROM tournament_settings WHERE setting_key = 'tournament_url');

-- Update existing records to have default tournament name if null
UPDATE tournament_settings 
SET tournament_name = 'PIGGY SUMMER POKER' 
WHERE tournament_name IS NULL;
