import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, tokenId } = body

    console.log("[v0] Saving user identity - wallet:", walletAddress, "tokenId:", tokenId)

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    await sql`
      INSERT INTO user_identities (wallet_address, token_id, created_at, updated_at)
      VALUES (${walletAddress.toLowerCase()}, ${tokenId ? Number.parseInt(tokenId) : null}, NOW(), NOW())
      ON CONFLICT (wallet_address) 
      DO UPDATE SET 
        token_id = ${tokenId ? Number.parseInt(tokenId) : null},
        updated_at = NOW()
    `

    console.log("[v0] Successfully saved user identity to database")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error saving user identity:", error)
    return NextResponse.json({ error: "Failed to save user identity" }, { status: 500 })
  }
}
