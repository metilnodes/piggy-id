# Discord Bot API Documentation

## Overview

This API allows the Python Discord bot to fetch user identity information by Discord ID. The endpoint is protected with API key authentication and includes rate limiting.

## Environment Variables

Add these environment variables to your Vercel project:

```bash
BOT_API_KEY=your-secret-key-here
NEXT_PUBLIC_BASE_RPC=https://mainnet.base.org  # Optional, defaults to Base mainnet
```

### Generating BOT_API_KEY

Generate a secure API key using one of these methods:

```bash
# Option 1: Using openssl
openssl rand -hex 32

# Option 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 3: Using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

## Endpoint

### GET /api/bot/identity

Fetch user's connected wallet and Piggy ID status by Discord ID.

**Authentication:** Required via header

**Rate Limiting:** 30 requests per minute per discord_id

**Caching:** Responses cached for 60 seconds

#### Request

**Headers:**
```
x-bot-api-key: <your-bot-api-key>
```

**Query Parameters:**
- `discord_id` (required): Discord user ID (must be digits only, minimum 10 characters)

#### Response

**Success (200):**
```json
{
  "discord_id": "123456789012345678",
  "primary_wallet": "0xabc123...",
  "has_piggy_id": true
}
```

**Fields:**
- `discord_id`: The Discord user ID
- `primary_wallet`: The connected EVM wallet address
- `has_piggy_id`: Boolean indicating if user owns a Piggy ID NFT (checked via database token_id or on-chain balance)

**Error Responses:**

```json
// 400 - Missing discord_id
{
  "error": "discord_id is required"
}

// 400 - Invalid discord_id format
{
  "error": "Invalid discord_id format. Must be digits only with length >= 10"
}

// 401 - Missing or invalid API key
{
  "error": "Unauthorized"
}

// 404 - User not found
{
  "error": "User not found with this discord_id"
}

// 429 - Rate limit exceeded
{
  "error": "Rate limit exceeded. Please try again later."
}

// 500 - Server error
{
  "error": "Internal server error"
}
```

## Usage Examples

### cURL

```bash
# Basic request
curl -H "x-bot-api-key: $BOT_API_KEY" \
  "https://id.piggyworld.xyz/api/bot/identity?discord_id=123456789012345678"

# With response formatting
curl -H "x-bot-api-key: $BOT_API_KEY" \
  "https://id.piggyworld.xyz/api/bot/identity?discord_id=123456789012345678" | jq
```

### Python (requests)

```python
import requests
import os

BOT_API_KEY = os.getenv("BOT_API_KEY")
API_URL = "https://id.piggyworld.xyz/api/bot/identity"

def get_user_wallet(discord_id: str) -> dict | None:
    """Fetch user's wallet by Discord ID."""
    headers = {"x-bot-api-key": BOT_API_KEY}
    params = {"discord_id": discord_id}
    
    try:
        response = requests.get(API_URL, headers=headers, params=params)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 404:
            print(f"User {discord_id} not found")
            return None
        elif e.response.status_code == 429:
            print("Rate limit exceeded, please wait")
            return None
        else:
            print(f"Error: {e}")
            return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

# Usage
user_data = get_user_wallet("123456789012345678")
if user_data:
    print(f"Wallet: {user_data['primary_wallet']}")
    print(f"Has Piggy ID: {user_data['has_piggy_id']}")
```

### Python (aiohttp - async)

```python
import aiohttp
import os

BOT_API_KEY = os.getenv("BOT_API_KEY")
API_URL = "https://id.piggyworld.xyz/api/bot/identity"

async def get_user_wallet_async(discord_id: str) -> dict | None:
    """Fetch user's wallet by Discord ID (async)."""
    headers = {"x-bot-api-key": BOT_API_KEY}
    params = {"discord_id": discord_id}
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(API_URL, headers=headers, params=params) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 404:
                    print(f"User {discord_id} not found")
                    return None
                elif response.status == 429:
                    print("Rate limit exceeded")
                    return None
                else:
                    print(f"Error {response.status}: {await response.text()}")
                    return None
        except Exception as e:
            print(f"Unexpected error: {e}")
            return None

# Usage in Discord bot
# user_data = await get_user_wallet_async(str(ctx.author.id))
```

## Security Notes

- **Never commit BOT_API_KEY** to version control
- Store the API key securely in environment variables
- The API key should only be known to authorized bot instances
- Rate limiting is enforced per discord_id (30 req/min)
- Responses are cached for 60 seconds to reduce load
- No sensitive data (tokens, emails, internal IDs) is returned

## Rate Limiting

- **Limit:** 30 requests per discord_id per minute
- **Window:** Rolling 60-second window
- **Response:** 429 status code when exceeded
- **Reset:** Automatic after 60 seconds

## Caching

- **TTL:** 60 seconds
- **Key:** `discord:{discord_id}`
- **Benefit:** Reduces database queries and improves response time
- **Note:** Data may be up to 60 seconds stale

## Chain Details

- **Network:** Base (Chain ID: 8453)
- **RPC:** Configurable via `NEXT_PUBLIC_BASE_RPC` (defaults to `https://mainnet.base.org`)
- **Piggy ID Contract:** `0x7FA5212be2b53A0bF3cA6b06664232695625f108`
- **Method:** `balanceOf(address)` to check NFT ownership

## Support

For issues or questions, contact the PiggyWorld development team.
