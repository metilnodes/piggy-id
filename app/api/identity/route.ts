import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("address")

    console.log("[v0] Identity API GET request for address:", walletAddress)

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    console.log("[v0] Querying user_identities table for wallet:", walletAddress.toLowerCase())

    let result = await sql`
      SELECT * FROM user_identities 
      WHERE wallet_address = ${walletAddress.toLowerCase()}
    `

    if (result[0] && !result[0].token_id) {
      console.log("[v0] No token_id found, checking code_assignments table")

      const codeAssignment = await sql`
        SELECT token_id FROM code_assignments 
        WHERE wallet_address = ${walletAddress.toLowerCase()}
        LIMIT 1
      `

      if (codeAssignment[0]?.token_id) {
        console.log("[v0] Found token_id in code_assignments:", codeAssignment[0].token_id)

        await sql`
          UPDATE user_identities 
          SET token_id = ${codeAssignment[0].token_id}, updated_at = NOW()
          WHERE wallet_address = ${walletAddress.toLowerCase()}
        `

        result = await sql`
          SELECT * FROM user_identities 
          WHERE wallet_address = ${walletAddress.toLowerCase()}
        `
      }
    }

    if (!result[0]) {
      console.log("[v0] No user_identities record found, checking code_assignments")

      const codeAssignment = await sql`
        SELECT token_id FROM code_assignments 
        WHERE wallet_address = ${walletAddress.toLowerCase()}
        LIMIT 1
      `

      if (codeAssignment[0]?.token_id) {
        console.log("[v0] Creating user_identities record with token_id:", codeAssignment[0].token_id)

        await sql`
          INSERT INTO user_identities (wallet_address, token_id, created_at, updated_at)
          VALUES (${walletAddress.toLowerCase()}, ${codeAssignment[0].token_id}, NOW(), NOW())
        `

        result = await sql`
          SELECT * FROM user_identities 
          WHERE wallet_address = ${walletAddress.toLowerCase()}
        `
      }
    }

    console.log("[v0] Identity query result:", result)
    console.log("[v0] Identity result length:", result.length)
    if (result[0]) {
      console.log("[v0] Identity token_id:", result[0].token_id)
      console.log("[v0] Identity email field:", result[0].email)
      console.log("[v0] Identity discord fields:", result[0].discord_id, result[0].discord_username)
      console.log("[v0] Identity twitter fields:", result[0].twitter_id, result[0].twitter_username)
    }

    return NextResponse.json({
      identity: result[0] || null,
    })
  } catch (error) {
    console.error("[v0] Error fetching identity - Full error:", error)
    console.error("[v0] Error message:", error.message)
    console.error("[v0] Error code:", error.code)

    if (error.message?.includes('relation "user_identities" does not exist')) {
      console.error("[v0] user_identities table does not exist! Run scripts/005_add_identity_connections.sql")
      return NextResponse.json(
        {
          error: "Database not initialized. Please run identity connections script.",
        },
        { status: 500 },
      )
    }

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

    let finalTokenId = tokenId
    if (!finalTokenId) {
      const codeAssignment = await sql`
        SELECT token_id FROM code_assignments 
        WHERE wallet_address = ${walletAddress.toLowerCase()}
        LIMIT 1
      `
      finalTokenId = codeAssignment[0]?.token_id || null
      console.log("[v0] Auto-fetched token_id from code_assignments:", finalTokenId)
    }

    await sql`
      INSERT INTO user_identities (wallet_address, token_id)
      VALUES (${walletAddress.toLowerCase()}, ${finalTokenId})
      ON CONFLICT (wallet_address) 
      DO UPDATE SET 
        token_id = COALESCE(${finalTokenId}, user_identities.token_id),
        updated_at = NOW()
    `

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
      if (!data.email || !data.email.includes("@")) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
      }

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
