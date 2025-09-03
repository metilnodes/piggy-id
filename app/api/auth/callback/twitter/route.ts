import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (!code || !state) {
    return NextResponse.redirect("/poker?error=twitter_auth_failed")
  }

  try {
    const { walletAddress } = JSON.parse(Buffer.from(state, "base64").toString())

    // Get code verifier
    const codeVerifier = global.twitterCodeVerifiers?.get(state)
    if (!codeVerifier) {
      throw new Error("Code verifier not found")
    }

    // Clean up
    global.twitterCodeVerifiers?.delete(state)

    // Exchange code for access token
    const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/twitter/callback`,
        code_verifier: codeVerifier,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      throw new Error("Failed to get access token")
    }

    // Get user info
    const userResponse = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    )

    const { data: userData } = await userResponse.json()

    // Store in database
    await sql`
      INSERT INTO user_identities (wallet_address, platform, platform_user_id, username, display_name, avatar_url, created_at, updated_at)
      VALUES (${walletAddress.toLowerCase()}, 'twitter', ${userData.id}, ${userData.username}, ${userData.name}, ${userData.profile_image_url || null}, NOW(), NOW())
      ON CONFLICT (wallet_address, platform) 
      DO UPDATE SET 
        platform_user_id = EXCLUDED.platform_user_id,
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = NOW()
    `

    return NextResponse.redirect("/poker?twitter_connected=true")
  } catch (error) {
    console.error("Twitter OAuth error:", error)
    return NextResponse.redirect("/poker?error=twitter_connection_failed")
  }
}
