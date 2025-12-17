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

    const result = await sql`
      SELECT tips_wallet_address, tips_gas_funded_at, tips_gas_funding_tx
      FROM user_identities 
      WHERE discord_id = ${discordId}
      LIMIT 1
    `

    if (!result[0] || !result[0].tips_wallet_address) {
      return NextResponse.json({ error: "Tips wallet not found" }, { status: 404 })
    }

    const response = {
      discord_id: discordId,
      tips_wallet_address: result[0].tips_wallet_address,
      tips_gas_funded_at: result[0].tips_gas_funded_at || null,
      tips_gas_funding_tx: result[0].tips_gas_funding_tx || null,
    }

    // Cache result
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
    const { discord_id, tips_wallet_address, tips_gas_funded_at, tips_gas_funding_tx } = body

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

    if (tips_wallet_address && !isAddress(tips_wallet_address)) {
      return NextResponse.json({ error: "Invalid EVM address format" }, { status: 400 })
    }

    if (tips_gas_funded_at) {
      const date = new Date(tips_gas_funded_at)
      if (isNaN(date.getTime())) {
        return NextResponse.json({ error: "Invalid ISO date format for tips_gas_funded_at" }, { status: 400 })
      }
    }

    if (tips_gas_funding_tx && !validateTxHash(tips_gas_funding_tx)) {
      return NextResponse.json(
        { error: "Invalid transaction hash format. Must be 0x + 64 hex characters" },
        { status: 400 },
      )
    }

    // 4. Rate limiting per discord_id
    if (!checkRateLimit(`discord:${discord_id}`)) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 })
    }

    // 5. Find user by discord_id
    const userResult = await sql`
      SELECT wallet_address, tips_wallet_address, tips_gas_funded_at, tips_gas_funding_tx
      FROM user_identities 
      WHERE discord_id = ${discord_id}
      LIMIT 1
    `

    if (!userResult[0]) {
      return NextResponse.json({ error: "User not found for discord_id" }, { status: 404 })
    }

    const force = new URL(request.url).searchParams.get("force") === "true"

    if (tips_wallet_address && userResult[0].tips_wallet_address && !force) {
      return NextResponse.json(
        {
          error: "Tips wallet already exists. Use ?force=true to overwrite.",
          existing_tips_wallet_address: userResult[0].tips_wallet_address,
        },
        { status: 409 },
      )
    }

    if (tips_gas_funded_at && userResult[0].tips_gas_funded_at && !force) {
      return NextResponse.json(
        {
          error: "Gas funding already recorded. Use ?force=true to overwrite.",
          existing_tips_gas_funded_at: userResult[0].tips_gas_funded_at,
        },
        { status: 409 },
      )
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (tips_wallet_address) {
      updates.push(`tips_wallet_address = $${paramIndex++}`)
      values.push(tips_wallet_address.toLowerCase())
    }

    if (tips_gas_funded_at !== undefined) {
      updates.push(`tips_gas_funded_at = $${paramIndex++}`)
      values.push(tips_gas_funded_at)
    }

    if (tips_gas_funding_tx !== undefined) {
      updates.push(`tips_gas_funding_tx = $${paramIndex++}`)
      values.push(tips_gas_funding_tx)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    updates.push(`updated_at = NOW()`)
    values.push(discord_id) // for WHERE clause

    const query = `
      UPDATE user_identities 
      SET ${updates.join(", ")}
      WHERE discord_id = $${paramIndex}
    `

    await sql(query, values)

    // Invalidate cache
    const cacheKey = `tips_wallet:${discord_id}`
    cache.delete(cacheKey)

    const updatedResult = await sql`
      SELECT tips_wallet_address, tips_gas_funded_at, tips_gas_funding_tx
      FROM user_identities 
      WHERE discord_id = ${discord_id}
      LIMIT 1
    `

    return NextResponse.json({
      ok: true,
      discord_id,
      tips_wallet_address: updatedResult[0].tips_wallet_address,
      tips_gas_funded_at: updatedResult[0].tips_gas_funded_at,
      tips_gas_funding_tx: updatedResult[0].tips_gas_funding_tx,
    })
  } catch (error) {
    console.error("[v0] Error in POST /api/bot/tips-wallet:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
