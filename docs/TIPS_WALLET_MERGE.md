# Tips Wallet Merge on Connect - Documentation

## Overview

When a user connects Discord + main EVM wallet on PiggyWorld, the system automatically merges with any existing Tips Wallet created by the Discord bot.

## How It Works

### Flow

1. **Discord Bot Creates Tips Wallet** (Optional, before user visits site)
   - Bot creates a record in `user_identities` with `discord_id` and `tips_wallet_address`
   - The `wallet_address` field may be empty (stub record)

2. **User Connects on Website**
   - User goes through Discord OAuth
   - User provides their main EVM `wallet_address`
   - System checks for conflicts
   - System performs UPSERT by `discord_id`

3. **Result**
   - If Tips Wallet existed → it's preserved and shown in profile
   - Main wallet is now linked to Discord ID
   - User sees their Tips Wallet balance immediately

### Database Logic

```sql
-- UPSERT by discord_id (NOT wallet_address)
INSERT INTO user_identities (
  discord_id, 
  wallet_address, 
  discord_username, 
  token_id, 
  created_at, 
  updated_at
)
VALUES ($1, $2, $3, $4, NOW(), NOW())
ON CONFLICT (discord_id) DO UPDATE SET
  wallet_address   = EXCLUDED.wallet_address,
  discord_username = EXCLUDED.discord_username,
  token_id         = COALESCE(EXCLUDED.token_id, user_identities.token_id),
  updated_at       = NOW()
  -- tips_wallet_address is NOT in UPDATE - stays unchanged
```

### Conflict Protection

**Rule:** One `wallet_address` can only be linked to ONE `discord_id`.

If wallet is already linked to a different Discord account:
- Returns redirect with error parameter
- User sees error message
- Connection is blocked (409 Conflict logic)

## Database Changes

### Migration: 021_add_discord_id_unique_constraint.sql

```sql
-- Ensures discord_id is unique
ALTER TABLE user_identities
ADD CONSTRAINT user_identities_discord_id_unique UNIQUE (discord_id);

-- Indexes for performance
CREATE INDEX idx_user_identities_discord_id ON user_identities(discord_id);
CREATE INDEX idx_user_identities_wallet_address ON user_identities(wallet_address);
```

## Test Scenarios

### Scenario 1: Stub Record (Tips Wallet Pre-Created by Bot)

**Setup:**
```sql
-- Bot created this record earlier
INSERT INTO user_identities (discord_id, tips_wallet_address)
VALUES ('1143184018813222972', '0x5fab...a634');
```

**Action:**
User connects Discord + wallet `0x382FC...5c1` on website

**Result:**
```sql
SELECT * FROM user_identities WHERE discord_id = '1143184018813222972';
-- Returns:
-- discord_id: 1143184018813222972
-- wallet_address: 0x382fc...5c1
-- tips_wallet_address: 0x5fab...a634  ← PRESERVED
-- token_id: 11
```

### Scenario 2: New User (No Existing Record)

**Setup:**
No record exists for discord_id

**Action:**
User connects Discord + wallet

**Result:**
New record created with all fields, `tips_wallet_address` is NULL (bot will create it later)

### Scenario 3: Wallet Conflict

**Setup:**
```sql
-- Wallet already linked to another Discord
INSERT INTO user_identities (discord_id, wallet_address)
VALUES ('999999', '0x382FC...5c1');
```

**Action:**
Different user (discord_id: 1143184...) tries to connect same wallet `0x382FC...5c1`

**Result:**
- Redirect with error: `?error=wallet_already_linked_to_discord_999999`
- Connection blocked
- Original link preserved

## API Endpoint

**File:** `app/api/auth/discord/callback/route.ts`

**Runtime:** `nodejs` (required for Neon SQL)

**Flow:**
1. Discord OAuth callback
2. Get Discord user info
3. Check wallet conflict
4. UPSERT by discord_id
5. Redirect to profile

## Frontend Display

After successful connection, profile page shows:
- Main wallet address
- Discord username
- Tips Wallet address (if exists)
- Tips Wallet balances (PIGGY, ETH)

No manual action needed - it's automatic!

## Security Notes

- Tips Wallet address is write-protected during connect
- Only Discord bot can create/update `tips_wallet_address` via `/api/bot/tips-wallet`
- Wallet conflicts are blocked to prevent account hijacking
- All operations use `discord_id` as primary key for user identity

## Troubleshooting

### Error: "wallet_already_linked_to_discord_XXX"

**Cause:** The wallet address is already connected to a different Discord account.

**Solution:** 
- Disconnect from the other Discord account first
- Or use a different wallet

### Tips Wallet Not Showing

**Cause:** Bot hasn't created Tips Wallet yet.

**Solution:**
- Tips Wallet is created on-demand by Discord bot
- After bot creates it, refresh the profile page
- The merge will happen automatically

### Duplicate Records

**Cause:** Migration wasn't run (no unique constraint on discord_id)

**Solution:**
1. Run migration `021_add_discord_id_unique_constraint.sql`
2. Clean up duplicates manually if needed
3. Reconnect Discord

## Summary

This implementation ensures:
✅ Tips Wallet created by bot is never overwritten
✅ One Discord = one identity record (UPSERT by discord_id)
✅ One wallet = one Discord (conflict detection)
✅ Seamless user experience (automatic merge on connect)
✅ Works on Vercel with App Router + Neon
