import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/auth/discord/callback`

  console.log("[v0] Discord OAuth callback - code:", !!code, "state:", !!state)
  console.log("[v0] Redirect URI:", redirectUri)

  if (!code || !state) {
    console.log("[v0] Missing code or state, redirecting with error")
    return NextResponse.redirect(`${origin}/poker?error=discord_auth_failed`)
  }

  try {
    const { walletAddress } = JSON.parse(Buffer.from(state, "base64").toString())
    console.log("[v0] Decoded wallet address:", walletAddress)

    const existingConnection = await sql`
      SELECT wallet_address FROM user_identities 
      WHERE platform = 'discord' AND platform_user_id = (
        SELECT platform_user_id FROM user_identities 
        WHERE wallet_address = ${walletAddress.toLowerCase()} AND platform = 'discord'
        UNION
        SELECT ${""} WHERE FALSE
      ) AND wallet_address != ${walletAddress.toLowerCase()}
      LIMIT 1
    `

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
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenResponse.json()
    console.log("[v0] Token response status:", tokenResponse.status)
    console.log("[v0] Has access token:", !!tokenData.access_token)

    if (!tokenData.access_token) {
      console.log("[v0] No access token received:", tokenData)
      throw new Error("Failed to get access token")
    }

    // Get user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()
    console.log("[v0] User response status:", userResponse.status)
    console.log("[v0] Discord user data:", {
      id: userData.id,
      username: userData.username,
      global_name: userData.global_name,
    })

    const discordAlreadyConnected = await sql`
      SELECT wallet_address FROM user_identities 
      WHERE platform = 'discord' AND platform_user_id = ${userData.id} AND wallet_address != ${walletAddress.toLowerCase()}
      LIMIT 1
    `

    console.log("[v0] Discord already connected check:", discordAlreadyConnected.length > 0)

    if (discordAlreadyConnected.length > 0) {
      console.log("[v0] Discord already connected to another wallet")
      return NextResponse.redirect(`${origin}/poker?error=discord_already_connected`)
    }

    // Store in database
    const insertResult = await sql`
      INSERT INTO user_identities (wallet_address, platform, platform_user_id, username, display_name, avatar_url, created_at, updated_at)
      VALUES (${walletAddress.toLowerCase()}, 'discord', ${userData.id}, ${userData.username}, ${userData.global_name || userData.username}, ${userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null}, NOW(), NOW())
      ON CONFLICT (wallet_address, platform) 
      DO UPDATE SET 
        platform_user_id = EXCLUDED.platform_user_id,
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
      RETURNING *
    `

    console.log("[v0] Database insert result:", insertResult.length > 0 ? "SUCCESS" : "FAILED")
    console.log("[v0] Inserted/Updated record:", insertResult[0])

    console.log("[v0] Redirecting to success page with username:", userData.username)
    return NextResponse.redirect(
      `${origin}/poker?discord_connected=true&username=${encodeURIComponent(userData.username)}`,
    )
  } catch (error) {
    console.error("[v0] Discord OAuth error:", error)
    return NextResponse.redirect(`${origin}/poker?error=discord_connection_failed`)
  }
}
