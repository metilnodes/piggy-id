-- Add avatar fields to user_identities table
ALTER TABLE user_identities
ADD COLUMN IF NOT EXISTS avatar_cid text,
ADD COLUMN IF NOT EXISTS avatar_updated_at timestamptz;
