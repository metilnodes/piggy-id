-- Sync token_id from code_assignments to user_identities for existing records
UPDATE user_identities 
SET token_id = ca.token_id, updated_at = NOW()
FROM code_assignments ca 
WHERE user_identities.wallet_address = ca.wallet_address 
  AND (user_identities.token_id IS NULL OR user_identities.token_id != ca.token_id);

-- Show results
SELECT 
  ui.wallet_address,
  ui.token_id as user_identities_token_id,
  ca.token_id as code_assignments_token_id,
  CASE 
    WHEN ui.token_id = ca.token_id THEN 'SYNCED'
    WHEN ui.token_id IS NULL THEN 'MISSING'
    ELSE 'MISMATCH'
  END as sync_status
FROM user_identities ui
LEFT JOIN code_assignments ca ON ui.wallet_address = ca.wallet_address
ORDER BY ui.wallet_address;
