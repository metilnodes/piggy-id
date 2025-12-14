# Tips Wallet Bot API Documentation

## Overview

The Tips Wallet Bot API allows your Discord bot to manage and retrieve Tips Wallet information for users, including tracking one-time gas funding. All endpoints are protected with API key authentication.

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

Retrieves the tips wallet address and gas funding status for a Discord user.

**Query Parameters:**
- `discord_id` (required): Discord user ID (digits only, minimum 10 characters)

**Success Response (200):**
\`\`\`json
{
  "discord_id": "541066012305653760",
  "tips_wallet_address": "0x1234567890abcdef1234567890abcdef12345678",
  "tips_gas_funded_at": "2025-12-14T20:00:00.000Z",
  "tips_gas_funding_tx": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
}
\`\`\`

**Response Fields:**
- `discord_id`: Discord user ID
- `tips_wallet_address`: EVM address of tips wallet
- `tips_gas_funded_at`: ISO 8601 timestamp when welcome gas was sent (null if not funded)
- `tips_gas_funding_tx`: Transaction hash of gas funding (null if not funded)

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
    gas_funded = data.get("tips_gas_funded_at") is not None
    
    print(f"Tips wallet: {tips_wallet}")
    print(f"Gas funded: {gas_funded}")
    
    if gas_funded:
        print(f"Funded at: {data['tips_gas_funded_at']}")
        print(f"Funding tx: {data['tips_gas_funding_tx']}")
elif response.status_code == 404:
    print("Tips wallet not created yet")
else:
    print(f"Error: {response.json()}")
\`\`\`

---

### POST /api/bot/tips-wallet

Creates or updates a tips wallet address and/or gas funding metadata for a Discord user.

**Query Parameters (optional):**
- `create_stub=true`: Create a minimal user record if discord_id doesn't exist yet (for users who haven't connected to website)
- `force=true`: Overwrite existing tips wallet address or gas funding data

**Request Body:**
\`\`\`json
{
  "discord_id": "541066012305653760",
  "discord_username": "metilnodes",
  "tips_wallet_address": "0xabc...",
  "tips_gas_funded_at": "2025-12-14T20:00:00Z",
  "tips_gas_funding_tx": "0xdeadbeef..."
}
\`\`\`

**Request Fields:**
- `discord_id` (required): Discord user ID
- `discord_username` (optional): Discord username (stored in stub records)
- `tips_wallet_address` (optional): EVM address to set/update (required when `create_stub=true`)
- `tips_gas_funded_at` (optional): ISO 8601 timestamp of gas funding
- `tips_gas_funding_tx` (optional): Transaction hash (0x + 64 hex chars)

**Behavior:**

**Without `create_stub=true` (default):**
- User must already exist in database (connected Discord on website)
- All fields except `discord_id` are optional in each request
- You can update wallet address, gas funding, or both in one request
- If `tips_wallet_address` exists, POST returns 409 unless `force=true`
- If `tips_gas_funded_at` exists, POST returns 409 unless `force=true`

**With `create_stub=true`:**
- Creates a minimal "stub" user record if discord_id doesn't exist yet
- Allows tipping users who haven't connected to the website
- `tips_wallet_address` is required when creating stub
- `discord_username` is stored if provided
- Sets `wallet_address` and `token_id` to NULL (filled later when user connects)
- When user later connects Discord+wallet on website, tips wallet is preserved during merge
- If user already exists, behaves same as without flag (updates existing record)

**Success Response (200):**
\`\`\`json
{
  "ok": true,
  "discord_id": "541066012305653760",
  "discord_username": "metilnodes",
  "tips_wallet_address": "0x1234567890abcdef1234567890abcdef12345678",
  "tips_gas_funded_at": "2025-12-14T20:00:00.000Z",
  "tips_gas_funding_tx": "0xabcdef..."
}
\`\`\`

**Success Response with Stub Creation (200):**
\`\`\`json
{
  "ok": true,
  "stub_created": true,
  "discord_id": "999999999999999999",
  "discord_username": "newuser",
  "tips_wallet_address": "0x5fabe2a8873a8056aa0f874110ba0c63fab6a634",
  "tips_gas_funded_at": null,
  "tips_gas_funding_tx": null
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

// 400 Bad Request - Missing tips_wallet_address in stub mode
{
  "error": "tips_wallet_address is required when creating stub"
}

// 400 Bad Request - Invalid EVM address
{
  "error": "Invalid EVM address format"
}

// 401 Unauthorized - Missing or invalid API key
{
  "error": "Unauthorized"
}

// 404 Not Found - Discord user not found (without create_stub=true)
{
  "error": "User not found for discord_id"
}

// 409 Conflict - Tips wallet already exists (without force=true)
{
  "error": "Tips wallet already exists",
  "existing_tips_wallet_address": "0xabcdef..."
}

// 409 Conflict - Gas funding already recorded (without force=true)
{
  "error": "Gas funding already recorded",
  "existing_tips_gas_funded_at": "2025-12-14T20:00:00.000Z"
}

// 429 Too Many Requests - Rate limit exceeded
{
  "error": "Rate limit exceeded. Try again later."
}
\`\`\`

**Example - Create stub for new user (curl):**
\`\`\`bash
curl -i -X POST \
  -H "x-bot-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"discord_id":"999999999999999999","discord_username":"newuser","tips_wallet_address":"0x5FAbE2a8873A8056Aa0f874110Ba0c63fAb6a634"}' \
  "https://your-domain.vercel.app/api/bot/tips-wallet?create_stub=true"
\`\`\`

**Example - Create wallet (curl):**
\`\`\`bash
curl -X POST \
  -H "x-bot-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"discord_id":"541066012305653760","tips_wallet_address":"0xabc..."}' \
  "https://your-domain.vercel.app/api/bot/tips-wallet"
\`\`\`

**Example - Record gas funding (curl):**
\`\`\`bash
curl -X POST \
  -H "x-bot-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"discord_id":"541066012305653760","tips_gas_funded_at":"2025-12-14T20:00:00Z","tips_gas_funding_tx":"0xdeadbeef..."}' \
  "https://your-domain.vercel.app/api/bot/tips-wallet"
\`\`\`

**Example - Complete workflow with stub creation (Python):**
\`\`\`python
import requests
from datetime import datetime

BOT_API_KEY = "your_bot_api_key_here"
BASE_URL = "https://your-domain.vercel.app"

# Step 1: Check if tips wallet exists
def get_tips_wallet(discord_id):
    response = requests.get(
        f"{BASE_URL}/api/bot/tips-wallet",
        params={"discord_id": discord_id},
        headers={"x-bot-api-key": BOT_API_KEY}
    )
    
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 404:
        return None
    else:
        raise Exception(f"Error: {response.json()}")

# Step 2: Create tips wallet with stub mode (for users not on website yet)
def create_tips_wallet_stub(discord_id, discord_username, wallet_address):
    """Create stub record for user who hasn't connected to website"""
    response = requests.post(
        f"{BASE_URL}/api/bot/tips-wallet?create_stub=true",
        headers={
            "x-bot-api-key": BOT_API_KEY,
            "Content-Type": "application/json"
        },
        json={
            "discord_id": discord_id,
            "discord_username": discord_username,
            "tips_wallet_address": wallet_address
        }
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Error creating stub: {response.json()}")

# Step 3: Check if gas funding needed
def should_fund_gas(wallet_data):
    """Returns True if welcome gas should be sent"""
    if not wallet_data:
        return False  # Wallet doesn't exist yet
    
    # Check if gas was already funded
    return wallet_data.get("tips_gas_funded_at") is None

# Step 4: Record gas funding
def record_gas_funding(discord_id, tx_hash):
    """Record that welcome gas was sent"""
    response = requests.post(
        f"{BASE_URL}/api/bot/tips-wallet",
        headers={
            "x-bot-api-key": BOT_API_KEY,
            "Content-Type": "application/json"
        },
        json={
            "discord_id": discord_id,
            "tips_gas_funded_at": datetime.utcnow().isoformat() + "Z",
            "tips_gas_funding_tx": tx_hash
        }
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Error recording funding: {response.json()}")

# Example usage in Discord bot !tips command
def handle_tip_command(discord_id, discord_username):
    """Handle !tips @user command"""
    
    # Check if user has tips wallet
    wallet_data = get_tips_wallet(discord_id)
    
    if not wallet_data:
        # User hasn't connected to website yet - create stub
        new_wallet_address = generate_new_wallet()  # Bot generates EOA
        wallet_data = create_tips_wallet_stub(
            discord_id=discord_id,
            discord_username=discord_username,
            wallet_address=new_wallet_address
        )
        
        if wallet_data.get("stub_created"):
            print(f"Created stub for new user: {discord_username}")
        
        print(f"Created tips wallet: {wallet_data['tips_wallet_address']}")
    
    # Check if we need to send welcome gas
    if should_fund_gas(wallet_data):
        # Send gas on Base network
        tx_hash = send_welcome_gas(wallet_data["tips_wallet_address"])
        result = record_gas_funding(discord_id, tx_hash)
        print(f"Gas funding recorded: {result['tips_gas_funding_tx']}")
    else:
        print("Gas already funded, skipping")
    
    return wallet_data["tips_wallet_address"]

# Generate new EOA wallet (bot-side, private key never sent to API)
def generate_new_wallet():
    """Generate new Ethereum wallet - implementation depends on your bot"""
    # Example using web3.py:
    # from eth_account import Account
    # account = Account.create()
    # store_private_key_securely(account.key.hex())  # Store on bot server
    # return account.address
    pass

def send_welcome_gas(to_address):
    """Send small ETH for gas on Base network"""
    # Implementation depends on your bot's wallet setup
    pass
\`\`\`

## Environment Variables

### Required

- `BOT_API_KEY`: Secret API key for bot authentication
- `DATABASE_URL`: Neon database connection string (automatically set)

### Optional

- `NEXT_PUBLIC_BASE_RPC`: Custom Base RPC URL for balance queries (defaults to `https://mainnet.base.org`)

### For Balances (set automatically)

- `PIGGY_TOKEN_ADDRESS`: `0xe3CF8dBcBDC9B220ddeaD0bD6342E245DAFF934d`
- `PIGGY_DECIMALS`: `18`

## Database Schema

The tips wallet data is stored in the existing `user_identities` table:

\`\`\`sql
-- Added gas funding tracking fields
ALTER TABLE user_identities 
ADD COLUMN IF NOT EXISTS tips_wallet_address VARCHAR(255),
ADD COLUMN IF NOT EXISTS tips_gas_funded_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS tips_gas_funding_tx VARCHAR(66) NULL;

CREATE INDEX IF NOT EXISTS idx_user_identities_tips_wallet 
ON user_identities(tips_wallet_address);

CREATE INDEX IF NOT EXISTS idx_tips_gas_funded_at 
ON user_identities(tips_gas_funded_at);
\`\`\`

**Important Notes:**
- Only the **public address** is stored, never private keys
- One tips wallet per Discord user
- Gas funding is recorded once per wallet to prevent repeated funding after bot restarts
- The bot must ensure Discord is connected before creating a tips wallet

## Security Best Practices

1. **Never** store or transmit private keys through this API
2. **Always** validate the BOT_API_KEY before processing requests
3. **Keep** the BOT_API_KEY secret and rotate it periodically
4. **Use** HTTPS in production to encrypt API traffic
5. **Monitor** API usage for suspicious activity
6. **Implement** additional rate limiting in your bot if needed

## Workflow Example

**Discord Bot Creates Tips Wallet with Stub Mode:**

1. User runs `!tips @recipient` command in Discord
2. Bot checks if recipient has tips wallet (GET request)
3. If not found (404):
   - Bot generates new EOA wallet for recipient
   - Bot stores private key securely on bot server (never sent to API)
   - Bot creates stub record with `create_stub=true` (POST request)
   - Stub includes: discord_id, discord_username, tips_wallet_address
   - `wallet_address` and `token_id` remain NULL until user connects on website
4. Bot checks if gas funding needed (check `tips_gas_funded_at`)
5. If not funded yet:
   - Bot sends small ETH amount for gas on Base network
   - Bot records funding timestamp and tx hash (POST request)
6. Recipient can now receive tips via Discord even without visiting website
7. When recipient later connects Discord+wallet on website, tips wallet is preserved

**Bot Restart Protection:**

The gas funding fields prevent repeated funding after bot restarts:

\`\`\`python
# On bot startup or when processing tips
wallet_data = get_tips_wallet(discord_id)

if wallet_data and wallet_data.get("tips_gas_funded_at"):
    print(f"Gas already funded at {wallet_data['tips_gas_funded_at']}")
    print(f"Funding tx: {wallet_data['tips_gas_funding_tx']}")
    # Skip gas funding
else:
    # Send welcome gas and record it
    tx_hash = send_welcome_gas(wallet_data["tips_wallet_address"])
    record_gas_funding(discord_id, tx_hash)
\`\`\`

**User Views Tips Wallet on Website:**

1. User connects wallet on PiggyWorld
2. User connects Discord account
3. Website merges stub data with connected wallet (tips wallet preserved)
4. Website displays tips wallet address (created by bot)
5. Website shows gas funding status with checkmark if funded
6. Website shows PIGGY and ETH balances
7. User can view funding transaction on Basescan

## Troubleshooting

**401 Unauthorized:**
- Verify `BOT_API_KEY` is set in Vercel project
- Check that bot is sending correct API key in header

**404 User not found (without create_stub=true):**
- User must connect Discord account on PiggyWorld first
- OR use `?create_stub=true` to create record for users not on website yet
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

**409 Conflict (Tips wallet already exists):**
- Tips wallet address is already set for this user
- Use `?force=true` query parameter to overwrite
- Typical when migrating wallets or fixing issues

**409 Conflict (Gas funding already recorded):**
- Gas funding timestamp is already set
- Indicates welcome gas was already sent
- Use `?force=true` only if you need to update incorrect data
- This prevents accidental duplicate funding

**400 Invalid transaction hash:**
- Transaction hash must be 0x followed by 64 hex characters
- Example: `0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890`
- Verify the tx hash from your Base network transaction

**400 Invalid ISO date:**
- Use ISO 8601 format: `2025-12-14T20:00:00Z`
- Include timezone (Z for UTC or +00:00)
- Example: `datetime.utcnow().isoformat() + "Z"` in Python

**Stub records and website connection:**
- Stub records have NULL wallet_address and token_id
- When user connects Discord+wallet on website, these fields are filled
- The tips_wallet_address from stub is preserved during merge
- User's primary wallet becomes their wallet_address
- Their Piggy ID NFT (if owned) becomes their token_id

## Support

For issues or questions, contact the PiggyWorld team or open a support ticket.
