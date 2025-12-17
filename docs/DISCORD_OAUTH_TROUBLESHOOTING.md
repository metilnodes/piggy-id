# Discord OAuth Troubleshooting Guide

## Current Setup

**Callback Endpoint:** `/api/auth/discord/callback`  
**Authorize Endpoint:** `/api/auth/discord`

## Quick Diagnostics

Visit this URL to check your setup:
```
https://your-domain.vercel.app/api/auth/discord/debug
```

This will show:
- Environment variables status
- Database connection status
- Table structure validation

## Common Issues & Solutions

### 1. `error=discord_connection_failed&details=token_401`

**Problem:** Discord rejected the token exchange  
**Causes:**
- Wrong `DISCORD_CLIENT_SECRET` in environment variables
- `redirect_uri` mismatch between code and Discord Developer Portal settings

**Fix:**
1. Check Discord Developer Portal → OAuth2 → Redirects
2. Add EXACT URL: `https://your-domain.vercel.app/api/auth/discord/callback`
3. For preview deployments, add: `https://v0-piggy-id-git-profile-testing-rgtscorp-yarus-projects.vercel.app/api/auth/discord/callback`

### 2. `error=discord_connection_failed&details=user_403`

**Problem:** Can't fetch user info from Discord  
**Cause:** Missing `identify` scope or invalid access token

**Fix:**
- Check Discord Developer Portal → OAuth2 → Scopes includes "identify"

### 3. `error=wallet_already_linked&details=discord_123456`

**Problem:** This wallet is already connected to another Discord account

**Fix:** User must disconnect from the other Discord account first

### 4. Discord connects on `/superpoker` but fails on `/profile`

**Problem:** Different flows use different logic

**Differences:**
- `/superpoker` doesn't require wallet_address in state
- `/profile` requires wallet_address to link Discord to wallet

**Fix:** Make sure `wallet` parameter is passed when calling `/api/auth/discord?wallet=0x...&source=profile`

## Database Schema Requirements

Your `user_identities` table must have:
```sql
- wallet_address (varchar, nullable for stub users)
- discord_id (varchar, should be unique)
- discord_username (varchar)
- tips_wallet_address (varchar, nullable, protected from overwrites)
- token_id (integer, nullable)
```

## Redirect URI Configuration

**Discord Developer Portal must have ALL these URLs:**

Production:
```
https://id.piggyworld.xyz/api/auth/discord/callback
```

Preview/Testing:
```
https://v0-piggy-id-git-profile-testing-rgtscorp-yarus-projects.vercel.app/api/auth/discord/callback
```

**Important:** Discord requires EXACT match including protocol (https://) and trailing paths

## Testing Flow

1. Start: User clicks "Connect Discord" on `/profile`
2. Call: `GET /api/auth/discord?wallet=0xabc...&source=profile`
3. Discord OAuth: User authorizes on Discord
4. Callback: Discord redirects to `/api/auth/discord/callback?code=xxx&state=yyy`
5. Exchange: Server exchanges code for access_token
6. Fetch: Server fetches user info from Discord
7. Save: Server updates database with discord_id and discord_username
8. Redirect: User returns to `/profile?success=discord_verified`

## Error Details Meanings

- `missing_code_or_state` - Discord didn't return auth code or state
- `invalid_state` - State parameter corrupted or malformed
- `token_401` - Wrong CLIENT_SECRET or redirect_uri mismatch
- `token_400` - Invalid code (expired or already used)
- `user_403` - Token valid but can't access user info
- `no_access_token` - Discord API didn't return access_token
- `wallet_already_linked` - Wallet connected to different Discord account

## Still Having Issues?

Check the URL bar after error - it will contain `&details=...` parameter with specific error code.
