import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (!code || !state) {
    return NextResponse.redirect("/poker?error=discord_auth_failed")
  }

  try {
    const { walletAddress } = JSON.parse(Buffer.from(state, "base64").toString())

    // Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/discord/callback`,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      throw new Error("Failed to get access token")
    }

    // Get user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()

    // Store in database
    await sql`
      INSERT INTO user_identities (wallet_address, platform, platform_user_id, username, display_name, avatar_url, created_at, updated_at)
      VALUES (${walletAddress.toLowerCase()}, 'discord', ${userData.id}, ${userData.username}, ${userData.global_name || userData.username}, ${userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null}, NOW(), NOW())
      ON CONFLICT (wallet_address, platform) 
      DO UPDATE SET 
        platform_user_id = EXCLUDED.platform_user_id,
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
    `

    return NextResponse.redirect("/poker?discord_connected=true")
  } catch (error) {
    console.error("Discord OAuth error:", error)
    return NextResponse.redirect("/poker?error=discord_connection_failed")
  }
}
