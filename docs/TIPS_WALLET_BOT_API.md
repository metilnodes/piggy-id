# Tips Wallet Bot API Documentation

## Overview

The Tips Wallet Bot API allows your Discord bot to manage and retrieve Tips Wallet information for users. All endpoints are protected with API key authentication.

## Authentication

All API requests must include the `x-bot-api-key` header:

\`\`\`bash
x-bot-api-key: YOUR_BOT_API_KEY
\`\`\`

**Setup:**
1. Set the `BOT_API_KEY` environment variable in your Vercel project
2. Use the same key in your Discord bot configuration

**Generate a secure API key:**
\`\`\`bash
openssl rand -hex 32
\`\`\`

## Rate Limiting

- **Limit:** 30 requests per minute per Discord ID
- **Response on exceeding:** `429 Too Many Requests`
- **Window:** Rolling 60-second window

## Caching

Responses are cached for 60 seconds to reduce database load. The cache is automatically invalidated when tips wallet data is updated via POST.

## Endpoints

### GET /api/bot/tips-wallet

Retrieves the tips wallet address for a Discord user.

**Query Parameters:**
- `discord_id` (required): Discord user ID (digits only, minimum 10 characters)

**Success Response (200):**
\`\`\`json
{
  "discord_id": "541066012305653760",
  "tips_wallet_address": "0x1234567890abcdef1234567890abcdef12345678"
}
\`\`\`

**Error Responses:**

\`\`\`json
// 400 Bad Request - Missing discord_id
{
  "error": "discord_id is required"
}

// 400 Bad Request - Invalid discord_id format
{
  "error": "Invalid discord_id format. Must be digits only with length >= 10"
}

// 401 Unauthorized - Missing or invalid API key
{
  "error": "Unauthorized"
}

// 404 Not Found - Tips wallet not created yet
{
  "error": "Tips wallet not found"
}

// 429 Too Many Requests - Rate limit exceeded
{
  "error": "Rate limit exceeded. Try again later."
}
\`\`\`

**Example (curl):**
\`\`\`bash
curl -H "x-bot-api-key: YOUR_API_KEY" \
  "https://your-domain.vercel.app/api/bot/tips-wallet?discord_id=541066012305653760"
\`\`\`

**Example (Python):**
\`\`\`python
import requests

BOT_API_KEY = "your_bot_api_key_here"
DISCORD_ID = "541066012305653760"

response = requests.get(
    f"https://your-domain.vercel.app/api/bot/tips-wallet",
    params={"discord_id": DISCORD_ID},
    headers={"x-bot-api-key": BOT_API_KEY}
)

if response.status_code == 200:
    data = response.json()
    tips_wallet = data["tips_wallet_address"]
    print(f"Tips wallet: {tips_wallet}")
elif response.status_code == 404:
    print("Tips wallet not created yet")
else:
    print(f"Error: {response.json()}")
\`\`\`

---

### POST /api/bot/tips-wallet

Creates or updates a tips wallet address for a Discord user.

**Request Body:**
\`\`\`json
{
  "discord_id": "541066012305653760",
  "tips_wallet_address": "0x1234567890abcdef1234567890abcdef12345678"
}
\`\`\`

**Query Parameters (optional):**
- `force=true`: Overwrite existing tips wallet address

**Success Response (200):**
\`\`\`json
{
  "ok": true,
  "discord_id": "541066012305653760",
  "tips_wallet_address": "0x1234567890abcdef1234567890abcdef12345678"
}
\`\`\`

**Error Responses:**

\`\`\`json
// 400 Bad Request - Missing discord_id
{
  "error": "discord_id is required"
}

// 400 Bad Request - Invalid discord_id format
{
  "error": "Invalid discord_id format. Must be digits only with length >= 10"
}

// 400 Bad Request - Missing tips_wallet_address
{
  "error": "tips_wallet_address is required"
}

// 400 Bad Request - Invalid EVM address
{
  "error": "Invalid EVM address format"
}

// 401 Unauthorized - Missing or invalid API key
{
  "error": "Unauthorized"
}

// 404 Not Found - Discord user not found in database
{
  "error": "User not found for discord_id"
}

// 409 Conflict - Tips wallet already exists (without force=true)
{
  "error": "Tips wallet already exists. Use ?force=true to overwrite.",
  "existing_tips_wallet_address": "0xabcdef..."
}

// 429 Too Many Requests - Rate limit exceeded
{
  "error": "Rate limit exceeded. Try again later."
}
\`\`\`

**Example (curl):**
\`\`\`bash
curl -X POST \
  -H "x-bot-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"discord_id":"541066012305653760","tips_wallet_address":"0x1234567890abcdef1234567890abcdef12345678"}' \
  "https://your-domain.vercel.app/api/bot/tips-wallet"
\`\`\`

**Example with force (curl):**
\`\`\`bash
curl -X POST \
  -H "x-bot-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"discord_id":"541066012305653760","tips_wallet_address":"0x1234567890abcdef1234567890abcdef12345678"}' \
  "https://your-domain.vercel.app/api/bot/tips-wallet?force=true"
\`\`\`

**Example (Python):**
\`\`\`python
import requests

BOT_API_KEY = "your_bot_api_key_here"
DISCORD_ID = "541066012305653760"
TIPS_WALLET_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678"

response = requests.post(
    "https://your-domain.vercel.app/api/bot/tips-wallet",
    headers={
        "x-bot-api-key": BOT_API_KEY,
        "Content-Type": "application/json"
    },
    json={
        "discord_id": DISCORD_ID,
        "tips_wallet_address": TIPS_WALLET_ADDRESS
    }
)

if response.status_code == 200:
    data = response.json()
    print(f"Success! Tips wallet created: {data['tips_wallet_address']}")
elif response.status_code == 409:
    print("Tips wallet already exists. Use ?force=true to overwrite.")
elif response.status_code == 404:
    print("User not found. Make sure Discord is connected first.")
else:
    print(f"Error: {response.json()}")
\`\`\`

---

## Environment Variables

### Required

- `BOT_API_KEY`: Secret API key for bot authentication
- `DATABASE_URL`: Neon database connection string (automatically set)

### Optional

- `NEXT_PUBLIC_BASE_RPC`: Custom Base RPC URL for balance queries (defaults to `https://mainnet.base.org`)

### For Balances (set automatically)

- `PIGGY_TOKEN_ADDRESS`: `0xe3CF8dBcBDC9B220ddeaD0bD6342E245DAFF934d`
- `PIGGY_DECIMALS`: `18`

---

## Database Schema

The tips wallet data is stored in the existing `user_identities` table:

\`\`\`sql
ALTER TABLE user_identities 
ADD COLUMN tips_wallet_address VARCHAR(255);

CREATE INDEX idx_user_identities_tips_wallet 
ON user_identities(tips_wallet_address);
\`\`\`

**Important Notes:**
- Only the **public address** is stored, never private keys
- One tips wallet per Discord user
- The bot must ensure Discord is connected before creating a tips wallet

---

## Security Best Practices

1. **Never** store or transmit private keys through this API
2. **Always** validate the BOT_API_KEY before processing requests
3. **Keep** the BOT_API_KEY secret and rotate it periodically
4. **Use** HTTPS in production to encrypt API traffic
5. **Monitor** API usage for suspicious activity
6. **Implement** additional rate limiting in your bot if needed

---

## Workflow Example

**Discord Bot Creates Tips Wallet:**

1. User runs `/tip` command in Discord
2. Bot checks if user has tips wallet (GET request)
3. If not found (404), bot generates new EOA wallet
4. Bot stores private key securely on bot server (never sent to API)
5. Bot sends public address to API (POST request)
6. User can now send/receive tips via Discord

**User Views Tips Wallet on Website:**

1. User connects wallet on PiggyWorld
2. User connects Discord account
3. Website displays tips wallet address (if created by bot)
4. Website shows PIGGY and ETH balances
5. User can copy address or view on Basescan

---

## Troubleshooting

**401 Unauthorized:**
- Verify `BOT_API_KEY` is set in Vercel project
- Check that bot is sending correct API key in header

**404 User not found:**
- User must connect Discord account on PiggyWorld first
- Check that discord_id matches the connected account

**404 Tips wallet not found:**
- Tips wallet hasn't been created yet by the bot
- Create it using POST endpoint when user first uses tips

**429 Rate limit exceeded:**
- Implement caching in your bot
- Wait 60 seconds before retrying
- Consider reducing request frequency

**400 Invalid discord_id:**
- Ensure discord_id contains only digits
- Discord IDs are typically 17-20 characters long

---

## Support

For issues or questions, contact the PiggyWorld team or open a support ticket.
