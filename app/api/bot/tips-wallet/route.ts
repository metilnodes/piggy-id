import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { isAddress } from "viem"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 30 // requests per minute
const RATE_WINDOW = 60000 // 1 minute in ms

// Simple in-memory cache
const cache = new Map<string, { data: any; expiry: number }>()
const CACHE_TTL = 60000 // 60 seconds

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

function validateBotApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-bot-api-key")
  const expectedKey = process.env.BOT_API_KEY

  if (!expectedKey) {
    console.error("[v0] BOT_API_KEY environment variable is not set")
    return false
  }

  return apiKey === expectedKey
}

function validateDiscordId(discordId: string): boolean {
  // Discord IDs are numeric strings, typically 17-20 characters
  return /^\d{10,}$/.test(discordId)
}

function validateTxHash(txHash: string): boolean {
  // Ethereum transaction hash: 0x + 64 hex characters
  return /^0x[a-fA-F0-9]{64}$/.test(txHash)
}

// GET /api/bot/tips-wallet?discord_id=...
export async function POST(request: NextRequest) {
  try {
    if (!validateBotApiKey(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const discord_id = String(body?.discord_id || "").trim()
    const tips_wallet_address = String(body?.tips_wallet_address || "").trim()

    if (!discord_id) {
      return NextResponse.json({ error: "discord_id is required" }, { status: 400 })
    }
    if (!validateDiscordId(discord_id)) {
      return NextResponse.json({ error: "Invalid discord_id format" }, { status: 400 })
    }
    if (!tips_wallet_address) {
      return NextResponse.json({ error: "tips_wallet_address is required" }, { status: 400 })
    }
    if (!isAddress(tips_wallet_address)) {
      return NextResponse.json({ error: "Invalid EVM address format" }, { status: 400 })
    }

    if (!checkRateLimit(`discord:${discord_id}`)) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 })
    }

    // Check user exists
    const user = await sql`
      SELECT tips_wallet_address
      FROM user_identities
      WHERE discord_id = ${discord_id}
      LIMIT 1
    `
    if (!user[0]) {
      return NextResponse.json({ error: "User not found for discord_id" }, { status: 404 })
    }

    // Do not overwrite existing wallet (MVP)
    if (user[0].tips_wallet_address) {
      return NextResponse.json(
        {
          error: "Tips wallet already exists",
          existing_tips_wallet_address: user[0].tips_wallet_address,
        },
        { status: 409 }
      )
    }

    // Save wallet
    await sql`
      UPDATE user_identities
      SET tips_wallet_address = ${tips_wallet_address.toLowerCase()}
      WHERE discord_id = ${discord_id}
    `

    cache.delete(`tips_wallet:${discord_id}`)

    const updated = await sql`
      SELECT tips_wallet_address
      FROM user_identities
      WHERE discord_id = ${discord_id}
      LIMIT 1
    `

    return NextResponse.json({
      ok: true,
      discord_id,
      tips_wallet_address: updated[0]?.tips_wallet_address || null,
    })
  } catch (error) {
    console.error("[v0] Error in POST /api/bot/tips-wallet:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
