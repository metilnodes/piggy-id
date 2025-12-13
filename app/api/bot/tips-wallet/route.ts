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

// GET /api/bot/tips-wallet?discord_id=...
export async function GET(request: NextRequest) {
  try {
    // 1. Validate API key
    if (!validateBotApiKey(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const discordId = searchParams.get("discord_id")

    // 2. Validate discord_id
    if (!discordId) {
      return NextResponse.json({ error: "discord_id is required" }, { status: 400 })
    }

    if (!validateDiscordId(discordId)) {
      return NextResponse.json(
        { error: "Invalid discord_id format. Must be digits only with length >= 10" },
        { status: 400 },
      )
    }

    // 3. Rate limiting per discord_id
    if (!checkRateLimit(`discord:${discordId}`)) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 })
    }

    // 4. Check cache
    const cacheKey = `tips_wallet:${discordId}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() < cached.expiry) {
      return NextResponse.json(cached.data)
    }

    // 5. Query database
    const result = await sql`
      SELECT tips_wallet_address
      FROM user_identities 
      WHERE discord_id = ${discordId}
      LIMIT 1
    `

    if (!result[0] || !result[0].tips_wallet_address) {
      return NextResponse.json({ error: "Tips wallet not found" }, { status: 404 })
    }

    // 6. Prepare response
    const response = {
      discord_id: discordId,
      tips_wallet_address: result[0].tips_wallet_address,
    }

    // 7. Cache result
    cache.set(cacheKey, {
      data: response,
      expiry: Date.now() + CACHE_TTL,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error("[v0] Error in GET /api/bot/tips-wallet:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/bot/tips-wallet
export async function POST(request: NextRequest) {
  try {
    // 1. Validate API key
    if (!validateBotApiKey(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { discord_id, tips_wallet_address } = body

    // 2. Validate discord_id
    if (!discord_id) {
      return NextResponse.json({ error: "discord_id is required" }, { status: 400 })
    }

    if (!validateDiscordId(discord_id)) {
      return NextResponse.json(
        { error: "Invalid discord_id format. Must be digits only with length >= 10" },
        { status: 400 },
      )
    }

    // 3. Validate tips_wallet_address
    if (!tips_wallet_address) {
      return NextResponse.json({ error: "tips_wallet_address is required" }, { status: 400 })
    }

    if (!isAddress(tips_wallet_address)) {
      return NextResponse.json({ error: "Invalid EVM address format" }, { status: 400 })
    }

    // 4. Rate limiting per discord_id
    if (!checkRateLimit(`discord:${discord_id}`)) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 })
    }

    // 5. Find user by discord_id
    const userResult = await sql`
      SELECT wallet_address, tips_wallet_address
      FROM user_identities 
      WHERE discord_id = ${discord_id}
      LIMIT 1
    `

    if (!userResult[0]) {
      return NextResponse.json({ error: "User not found for discord_id" }, { status: 404 })
    }

    // 6. Check if tips_wallet already exists (unless force=true)
    const force = new URL(request.url).searchParams.get("force") === "true"

    if (userResult[0].tips_wallet_address && !force) {
      return NextResponse.json(
        {
          error: "Tips wallet already exists. Use ?force=true to overwrite.",
          existing_tips_wallet_address: userResult[0].tips_wallet_address,
        },
        { status: 409 },
      )
    }

    // 7. Upsert tips_wallet_address
    await sql`
      UPDATE user_identities 
      SET tips_wallet_address = ${tips_wallet_address.toLowerCase()},
          updated_at = NOW()
      WHERE discord_id = ${discord_id}
    `

    // 8. Invalidate cache
    const cacheKey = `tips_wallet:${discord_id}`
    cache.delete(cacheKey)

    // 9. Return success response
    return NextResponse.json({
      ok: true,
      discord_id,
      tips_wallet_address: tips_wallet_address.toLowerCase(),
    })
  } catch (error) {
    console.error("[v0] Error in POST /api/bot/tips-wallet:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
