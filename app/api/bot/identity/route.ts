import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createPublicClient, http } from "viem"
import { base } from "viem/chains"

const sql = neon(process.env.DATABASE_URL!)

// Piggy ID contract configuration
const PIGGY_ID_CONTRACT = "0x7FA5212be2b53A0bF3cA6b06664232695625f108"
const PIGGY_ID_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

// Rate limiting (simple in-memory cache)
const rateLimit = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30 // 30 requests per minute

// Response cache (60s)
const responseCache = new Map<string, { data: any; expiresAt: number }>()
const CACHE_TTL = 60000 // 60 seconds

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const record = rateLimit.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimit.set(identifier, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  record.count++
  return true
}

function getCachedResponse(key: string): any | null {
  const cached = responseCache.get(key)
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data
  }
  responseCache.delete(key)
  return null
}

function setCachedResponse(key: string, data: any): void {
  responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL })
}

async function checkPiggyIDBalance(walletAddress: string): Promise<boolean> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org"

    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    })

    const balance = await client.readContract({
      address: PIGGY_ID_CONTRACT as `0x${string}`,
      abi: PIGGY_ID_ABI,
      functionName: "balanceOf",
      args: [walletAddress as `0x${string}`],
    })

    return Number(balance) > 0
  } catch (error) {
    console.error("[v0] Error checking Piggy ID balance:", error)
    // Return null on error to indicate we couldn't check
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    // Auth: Check BOT_API_KEY
    const apiKey = request.headers.get("x-bot-api-key")
    if (!apiKey || apiKey !== process.env.BOT_API_KEY) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const discordId = searchParams.get("discord_id")

    // Input validation
    if (!discordId) {
      return NextResponse.json({ error: "discord_id is required" }, { status: 400 })
    }

    // Validate discord_id format (must be digits only, length >= 10)
    if (!/^\d{10,}$/.test(discordId)) {
      return NextResponse.json(
        { error: "Invalid discord_id format. Must be digits only with length >= 10" },
        { status: 400 },
      )
    }

    // Rate limiting per discord_id
    if (!checkRateLimit(discordId)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    // Check cache
    const cacheKey = `discord:${discordId}`
    const cachedResponse = getCachedResponse(cacheKey)
    if (cachedResponse) {
      return NextResponse.json(cachedResponse)
    }

    // Query database for user by discord_id
    const result = await sql`
      SELECT 
        discord_id,
        wallet_address,
        token_id
      FROM user_identities 
      WHERE discord_id = ${discordId}
      LIMIT 1
    `

    if (!result[0]) {
      return NextResponse.json({ error: "User not found with this discord_id" }, { status: 404 })
    }

    const user = result[0]

    // Determine has_piggy_id
    let hasPiggyId = false

    if (user.token_id) {
      // User has token_id stored in database
      hasPiggyId = true
    } else if (user.wallet_address) {
      // Check on-chain balance
      hasPiggyId = await checkPiggyIDBalance(user.wallet_address)
    }

    const response = {
      discord_id: user.discord_id,
      primary_wallet: user.wallet_address,
      has_piggy_id: hasPiggyId,
    }

    // Cache the response
    setCachedResponse(cacheKey, response)

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Error in bot identity API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
