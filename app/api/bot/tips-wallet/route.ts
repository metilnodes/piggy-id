export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { type NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { isAddress } from "viem";

const sql = neon(process.env.DATABASE_URL!);

// ---- Simple in-memory rate limiter ----
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60_000;

// ---- Simple in-memory cache ----
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 60_000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }
  if (record.count >= RATE_LIMIT) return false;
  record.count++;
  return true;
}

function validateBotApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get("x-bot-api-key");
  const expectedKey = process.env.BOT_API_KEY;
  if (!expectedKey) return false;
  return apiKey === expectedKey;
}

function validateDiscordId(discordId: string): boolean {
  return /^\d{10,}$/.test(discordId);
}

function validateTxHash(txHash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(txHash);
}

// -------------------- GET --------------------
// GET /api/bot/tips-wallet?discord_id=...
export async function GET(request: NextRequest) {
  try {
    if (!validateBotApiKey(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const discordId = (searchParams.get("discord_id") || "").trim();

    if (!discordId) {
      return NextResponse.json({ error: "discord_id is required" }, { status: 400 });
    }
    if (!validateDiscordId(discordId)) {
      return NextResponse.json({ error: "Invalid discord_id format" }, { status: 400 });
    }
    if (!checkRateLimit(`discord:${discordId}`)) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    const cacheKey = `tips_wallet:${discordId}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return NextResponse.json(cached.data);
    }

    const rows = await sql`
      SELECT tips_wallet_address, tips_gas_funded_at, tips_gas_funding_tx
      FROM user_identities
      WHERE discord_id = ${discordId}
      LIMIT 1
    `;

    if (!rows[0]) {
      return NextResponse.json({ error: "User not found for discord_id" }, { status: 404 });
    }

    if (!rows[0].tips_wallet_address) {
      return NextResponse.json({ error: "Tips wallet not found" }, { status: 404 });
    }

    const response = {
      discord_id: discordId,
      tips_wallet_address: rows[0].tips_wallet_address,
      tips_gas_funded_at: rows[0].tips_gas_funded_at || null,
      tips_gas_funding_tx: rows[0].tips_gas_funding_tx || null,
    };

    cache.set(cacheKey, { data: response, expiry: Date.now() + CACHE_TTL });
    return NextResponse.json(response);
  } catch (error) {
    console.error("[v0] Error in GET /api/bot/tips-wallet:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// -------------------- POST --------------------
// POST /api/bot/tips-wallet
export async function POST(request: NextRequest) {
  try {
    if (!validateBotApiKey(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const discord_id = String(body?.discord_id || "").trim();
    const tips_wallet_address = String(body?.tips_wallet_address || "").trim();

    // optional fields (for later)
    const tips_gas_funded_at = body?.tips_gas_funded_at;
    const tips_gas_funding_tx = body?.tips_gas_funding_tx;

    if (!discord_id) {
      return NextResponse.json({ error: "discord_id is required" }, { status: 400 });
    }
    if (!validateDiscordId(discord_id)) {
      return NextResponse.json({ error: "Invalid discord_id format" }, { status: 400 });
    }

    if (tips_wallet_address && !isAddress(tips_wallet_address)) {
      return NextResponse.json({ error: "Invalid EVM address format" }, { status: 400 });
    }

    if (tips_gas_funded_at) {
      const d = new Date(tips_gas_funded_at);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid ISO date format for tips_gas_funded_at" }, { status: 400 });
      }
    }

    if (tips_gas_funding_tx && !validateTxHash(String(tips_gas_funding_tx))) {
      return NextResponse.json({ error: "Invalid tx hash format" }, { status: 400 });
    }

    if (!checkRateLimit(`discord:${discord_id}`)) {
      return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
    }

    // Ensure user exists + read current values
    const current = await sql`
      SELECT tips_wallet_address, tips_gas_funded_at, tips_gas_funding_tx
      FROM user_identities
      WHERE discord_id = ${discord_id}
      LIMIT 1
    `;

    if (!current[0]) {
      return NextResponse.json({ error: "User not found for discord_id" }, { status: 404 });
    }

    const force = new URL(request.url).searchParams.get("force") === "true";

    // overwrite guards
    if (tips_wallet_address && current[0].tips_wallet_address && !force) {
      return NextResponse.json(
        { error: "Tips wallet already exists", existing_tips_wallet_address: current[0].tips_wallet_address },
        { status: 409 }
      );
    }
    if (tips_gas_funded_at && current[0].tips_gas_funded_at && !force) {
      return NextResponse.json(
        { error: "Gas funding already recorded", existing_tips_gas_funded_at: current[0].tips_gas_funded_at },
        { status: 409 }
      );
    }

    // compute final values (keep old if not provided)
    const newTipsWallet =
      tips_wallet_address ? tips_wallet_address.toLowerCase() : current[0].tips_wallet_address;

    const newGasFundedAt =
      tips_gas_funded_at !== undefined ? tips_gas_funded_at : current[0].tips_gas_funded_at;

    const newGasFundingTx =
      tips_gas_funding_tx !== undefined ? tips_gas_funding_tx : current[0].tips_gas_funding_tx;

    // no-op guard
    if (!newTipsWallet && newGasFundedAt === undefined && newGasFundingTx === undefined) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    // single safe update (no dynamic sql)
    await sql`
      UPDATE user_identities
      SET
        tips_wallet_address = ${newTipsWallet},
        tips_gas_funded_at = ${newGasFundedAt},
        tips_gas_funding_tx = ${newGasFundingTx}
      WHERE discord_id = ${discord_id}
    `;

    cache.delete(`tips_wallet:${discord_id}`);

    const updated = await sql`
      SELECT tips_wallet_address, tips_gas_funded_at, tips_gas_funding_tx
      FROM user_identities
      WHERE discord_id = ${discord_id}
      LIMIT 1
    `;

    return NextResponse.json({
      ok: true,
      discord_id,
      tips_wallet_address: updated[0]?.tips_wallet_address || null,
      tips_gas_funded_at: updated[0]?.tips_gas_funded_at || null,
      tips_gas_funding_tx: updated[0]?.tips_gas_funding_tx || null,
    });
  } catch (error) {
    console.error("[v0] Error in POST /api/bot/tips-wallet:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
