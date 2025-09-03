import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("address")

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    const result = await sql`
      SELECT * FROM user_identities 
      WHERE wallet_address = ${walletAddress.toLowerCase()}
    `

    return NextResponse.json({
      identity: result[0] || null,
    })
  } catch (error) {
    console.error("Error fetching identity:", error)
    return NextResponse.json({ error: "Failed to fetch identity" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, tokenId, type, data } = body

    if (!walletAddress || !type || !data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Upsert user identity
    await sql`
      INSERT INTO user_identities (wallet_address, token_id)
      VALUES (${walletAddress.toLowerCase()}, ${tokenId})
      ON CONFLICT (wallet_address) 
      DO UPDATE SET 
        token_id = ${tokenId},
        updated_at = NOW()
    `

    // Update specific identity type
    if (type === "discord") {
      await sql`
        UPDATE user_identities 
        SET discord_id = ${data.id}, 
            discord_username = ${data.username},
            updated_at = NOW()
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `
    } else if (type === "twitter") {
      await sql`
        UPDATE user_identities 
        SET twitter_id = ${data.id}, 
            twitter_username = ${data.username},
            updated_at = NOW()
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `
    } else if (type === "email") {
      await sql`
        UPDATE user_identities 
        SET email = ${data.email},
            updated_at = NOW()
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating identity:", error)
    return NextResponse.json({ error: "Failed to update identity" }, { status: 500 })
  }
}
