import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("wallet")

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    const user = await sql`
      SELECT token_id, wallet_address, email, discord_username, twitter_username, display_name
      FROM user_identities 
      WHERE wallet_address = ${walletAddress}
    `

    if (user.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: user[0],
    })
  } catch (error) {
    console.error("Error getting user identity:", error)
    return NextResponse.json({ error: "Failed to get user identity" }, { status: 500 })
  }
}
