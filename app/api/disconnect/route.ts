import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, platform } = await request.json()

    if (!walletAddress || !platform) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const walletLc = walletAddress.toLowerCase()

    console.log(`[v0] Disconnecting ${platform} for wallet:`, walletLc)

    // Update the user_identities table to remove the platform connection
    if (platform === "discord") {
      await sql`
        UPDATE user_identities 
        SET discord_id = NULL, discord_username = NULL, updated_at = NOW()
        WHERE wallet_address = ${walletLc}
      `
    } else if (platform === "twitter") {
      await sql`
        UPDATE user_identities 
        SET twitter_id = NULL, twitter_username = NULL, updated_at = NOW()
        WHERE wallet_address = ${walletLc}
      `
    } else if (platform === "email") {
      await sql`
        UPDATE user_identities 
        SET email = NULL, updated_at = NOW()
        WHERE wallet_address = ${walletLc}
      `
      // Also remove from email_verifications table
      await sql`
        DELETE FROM email_verifications 
        WHERE wallet_address = ${walletLc}
      `
    } else {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 })
    }

    console.log(`[v0] Successfully disconnected ${platform}`)

    return NextResponse.json({
      success: true,
      message: `${platform} successfully disconnected`,
    })
  } catch (error) {
    console.error(`[v0] Error disconnecting platform:`, error)
    return NextResponse.json({ error: "Failed to disconnect platform" }, { status: 500 })
  }
}
