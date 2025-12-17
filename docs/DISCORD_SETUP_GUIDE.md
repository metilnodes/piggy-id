# Discord OAuth Setup Guide

## Problem: "Connection failed. Please try again later"

If you're getting this error, the most common cause is **incorrect Discord Developer Portal configuration**.

## Step-by-Step Fix

### 1. Go to Discord Developer Portal
Visit: https://discord.com/developers/applications

### 2. Select Your Application
Click on your Piggy ID application

### 3. Check OAuth2 Settings

Navigate to **OAuth2** → **General** in the left sidebar

#### A) Check Redirect URLs

You MUST add the **EXACT** redirect URI for each environment:

**For v0 Preview:**
```
https://v0-piggy-id-git-profile-testing-rgtscorp-yarus-projects.vercel.app/api/auth/discord/callback
```

**For Production:**
```
https://your-production-domain.com/api/auth/discord/callback
```

**Important:**
- URLs are case-sensitive
- Must include `/api/auth/discord/callback` at the end
- HTTPS is required (not HTTP)
- No trailing slashes

#### B) Check OAuth2 Scopes

Under **OAuth2** → **URL Generator**, make sure you have:
- `identify` (required - gets user ID and username)

Optional scopes:
- `email` (if you want email)
- `guilds` (if you want server list)

### 4. Verify Client Credentials

#### A) Client ID
1. Go to **OAuth2** → **General**
2. Copy your **CLIENT ID**
3. Verify it matches `DISCORD_CLIENT_ID` in your environment variables

#### B) Client Secret
1. Go to **OAuth2** → **General**
2. Copy your **CLIENT SECRET** (click "Reset Secret" if needed)
3. Verify it matches `DISCORD_CLIENT_SECRET` in your environment variables

**Warning:** If you reset the secret, you MUST update the environment variable immediately!

### 5. Check Environment Variables

In v0, go to **Vars** section (left sidebar) and verify:

```
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
```

Make sure there are no extra spaces or quotes around the values.

### 6. Test the Connection

1. Save all changes in Discord Developer Portal
2. Republish your v0 project (if needed)
3. Try connecting Discord again
4. Check browser DevTools Console for detailed error logs starting with `[v0]`

## Common Error Messages

### "invalid_grant" or "invalid_client"
- **Cause:** CLIENT_ID or CLIENT_SECRET is wrong, or redirect_uri doesn't match
- **Fix:** Double-check credentials and redirect URLs

### "401 Unauthorized" when fetching token
- **Cause:** CLIENT_SECRET is incorrect
- **Fix:** Reset secret in Discord portal and update environment variable

### "invalid_redirect_uri"
- **Cause:** The redirect_uri doesn't match ANY of the URLs in Discord portal
- **Fix:** Add the EXACT URL to Discord portal (copy from browser DevTools Network tab)

### "access_denied"
- **Cause:** User clicked "Cancel" on Discord authorization screen
- **Fix:** Try again and click "Authorize"

## How to Debug

1. Open Browser DevTools (F12)
2. Go to **Console** tab
3. Try connecting Discord
4. Look for logs starting with `[v0]` - they will show exactly where it fails:
   - `[v0] Token response status: 400` = wrong credentials or redirect URI
   - `[v0] User info response status: 401` = token exchange failed
   - `[v0] ERROR: Database INSERT failed` = database issue

5. Go to **Network** tab
6. Look for the `/api/auth/discord/callback` request
7. Check the **Request URL** - copy it and verify it's in Discord portal

## Still Not Working?

If you've checked everything above and it still fails:

1. Copy the full `[v0]` logs from browser console
2. Copy the redirect URI from Network tab
3. Take a screenshot of your Discord OAuth2 settings
4. Contact support with these details
