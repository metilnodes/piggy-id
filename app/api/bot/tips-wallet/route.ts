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
    if (!validateBotApiKey(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const discord_id = String(body?.discord_id || "").trim()
    const tips_wallet_address = String(body?.tips_wallet_address || "").trim()

    if (!discord_id) return NextResponse.json({ error: "discord_id is required" }, { status: 400 })
    if (!validateDiscordId(discord_id)) {
      return NextResponse.json({ error: "Invalid discord_id format" }, { status: 400 })
    }
    if (!tips_wallet_address) {
      return NextResponse.json({ error: "tips_wallet_address is required" }, { status: 400 })
    }
    if (!isAddress(tips_wallet_address)) {
      return NextResponse.json({ error: "Invalid EVM address format" }, { status: 400 })
    }

    // Проверяем, что пользователь существует
    const exists = await sql`
      SELECT discord_id, tips_wallet_address
      FROM user_identities
      WHERE discord_id = ${discord_id}
      LIMIT 1
    `
    if (!exists[0]) {
      return NextResponse.json({ error: "User not found for discord_id" }, { status: 404 })
    }

    // Не перезаписываем, если уже есть (MVP)
    if (exists[0].tips_wallet_address) {
      return NextResponse.json(
        { error: "Tips wallet already exists", existing: exists[0].tips_wallet_address },
        { status: 409 }
      )
    }

    // Обновляем только address (без updated_at)
    await sql`
      UPDATE user_identities
      SET tips_wallet_address = ${tips_wallet_address.toLowerCase()}
      WHERE discord_id = ${discord_id}
    `

    // Проверяем, что сохранилось
    const updated = await sql`
      SELECT tips_wallet_address
      FROM user_identities
      WHERE discord_id = ${discord_id}
      LIMIT 1
    `

    return NextResponse.json(
      { ok: true, discord_id, tips_wallet_address: updated[0]?.tips_wallet_address || null },
      { status: 200 }
    )
  } catch (error) {
    console.error("[v0] Error in POST /api/bot/tips-wallet:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
