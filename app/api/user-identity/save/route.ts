import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, tokenId } = await request.json()

    if (!walletAddress || !tokenId) {
      return NextResponse.json({ error: "Wallet address and token ID are required" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id, token_id FROM user_identities 
      WHERE wallet_address = ${walletAddress}
    `

    if (existingUser.length > 0) {
      // Update existing user's token_id if different
      if (existingUser[0].token_id !== tokenId) {
        await sql`
          UPDATE user_identities 
          SET token_id = ${tokenId}, updated_at = NOW()
          WHERE wallet_address = ${walletAddress}
        `
      }
      return NextResponse.json({
        success: true,
        message: "User updated",
        tokenId: tokenId,
      })
    } else {
      // Create new user
      await sql`
        INSERT INTO user_identities (wallet_address, token_id, created_at, updated_at)
        VALUES (${walletAddress}, ${tokenId}, NOW(), NOW())
      `
      return NextResponse.json({
        success: true,
        message: "User created",
        tokenId: tokenId,
      })
    }
  } catch (error) {
    console.error("Error saving user identity:", error)
    return NextResponse.json({ error: "Failed to save user identity" }, { status: 500 })
  }
}
