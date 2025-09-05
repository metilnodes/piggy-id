import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, signer_uuid, fid, user } = await req.json()

    if (!walletAddress || !signer_uuid || !fid || !user) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("[v0] SIWN callback data:", { walletAddress, signer_uuid, fid, user })

    // Check if this Farcaster account is already connected to another wallet
    const existingConnection = await sql`
      SELECT wallet_address 
      FROM user_identities 
      WHERE platform = 'farcaster' 
      AND platform_user_id = ${fid.toString()}
      AND wallet_address != ${walletAddress.toLowerCase()}
    `

    if (existingConnection.length > 0) {
      return NextResponse.json(
        { error: "This Farcaster account is already connected to another wallet" },
        { status: 400 },
      )
    }

    // Store or update Farcaster connection
    await sql`
      INSERT INTO user_identities (
        wallet_address, 
        platform, 
        platform_user_id, 
        username, 
        display_name, 
        avatar_url,
        created_at
      ) VALUES (
        ${walletAddress.toLowerCase()}, 
        'farcaster', 
        ${fid.toString()}, 
        ${user.username}, 
        ${user.display_name}, 
        ${user.pfp_url},
        NOW()
      )
      ON CONFLICT (wallet_address, platform) 
      DO UPDATE SET 
        platform_user_id = ${fid.toString()},
        username = ${user.username},
        display_name = ${user.display_name},
        avatar_url = ${user.pfp_url},
        updated_at = NOW()
    `

    console.log("[v0] Farcaster connection stored successfully")

    return NextResponse.json({
      success: true,
      message: "Farcaster account connected successfully",
    })
  } catch (error) {
    console.error("[v0] SIWN callback error:", error)
    return NextResponse.json({ error: "Failed to connect Farcaster account" }, { status: 500 })
  }
}
