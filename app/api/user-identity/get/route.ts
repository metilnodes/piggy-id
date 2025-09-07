import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("address")

    console.log("[v0] Getting user identity for address:", walletAddress)

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    const result = await sql`
      SELECT * FROM user_identities 
      WHERE wallet_address = ${walletAddress.toLowerCase()}
      LIMIT 1
    `

    console.log("[v0] User identity query result:", result)

    return NextResponse.json({
      success: true,
      identity: result[0] || null,
    })
  } catch (error) {
    console.error("[v0] Error fetching user identity:", error)
    return NextResponse.json({ error: "Failed to fetch user identity" }, { status: 500 })
  }
}
