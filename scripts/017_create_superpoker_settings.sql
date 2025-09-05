-- Create superpoker settings table for editable tournament configuration
CREATE TABLE IF NOT EXISTS superpoker_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tournament name
INSERT INTO superpoker_settings (setting_key, setting_value) 
VALUES ('tournament_name', 'SuperPoker #63')
ON CONFLICT (setting_key) DO NOTHING;

-- Create function to update timestamp on changes
CREATE OR REPLACE FUNCTION update_superpoker_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_superpoker_settings_timestamp_trigger ON superpoker_settings;
CREATE TRIGGER update_superpoker_settings_timestamp_trigger
  BEFORE UPDATE ON superpoker_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_superpoker_settings_timestamp();
