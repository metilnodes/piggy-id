import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  console.log("[v0] Twitter OAuth callback started")

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  console.log("[v0] Twitter callback params:", { code: !!code, state: !!state, error })

  if (error) {
    console.log("[v0] Twitter OAuth error:", error)
    return NextResponse.redirect(`${new URL(request.url).origin}/poker?error=twitter_auth_denied`)
  }

  if (!code || !state) {
    console.log("[v0] Missing code or state parameter")
    return NextResponse.redirect(`${new URL(request.url).origin}/poker?error=twitter_auth_failed`)
  }

  try {
    const { walletAddress } = JSON.parse(Buffer.from(state, "base64").toString())
    console.log("[v0] Decoded wallet address:", walletAddress)

    // Get code verifier
    const codeVerifier = global.twitterCodeVerifiers?.get(state)
    if (!codeVerifier) {
      console.log("[v0] Code verifier not found for state:", state)
      throw new Error("Code verifier not found")
    }

    // Clean up
    global.twitterCodeVerifiers?.delete(state)

    const origin = new URL(request.url).origin
    const redirect_uri = `${origin}/api/auth/twitter/callback`

    console.log("[v0] Exchanging code for token with redirect_uri:", redirect_uri)

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
        redirect_uri,
        code_verifier: codeVerifier,
      }),
    })

    const tokenData = await tokenResponse.json()
    console.log("[v0] Token response:", { success: !!tokenData.access_token, error: tokenData.error })

    if (!tokenData.access_token) {
      console.log("[v0] Failed to get access token:", tokenData)
      throw new Error(`Failed to get access token: ${tokenData.error_description || tokenData.error}`)
    }

    // Get user info
    console.log("[v0] Fetching Twitter user data")
    const userResponse = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    )

    const userResponseData = await userResponse.json()
    console.log("[v0] User response:", { success: !!userResponseData.data, error: userResponseData.error })

    if (!userResponseData.data) {
      throw new Error(`Failed to get user data: ${userResponseData.error?.message || "Unknown error"}`)
    }

    const userData = userResponseData.data

    const existingConnection = await sql`
      SELECT wallet_address FROM user_identities 
      WHERE platform = 'twitter' AND platform_user_id = ${userData.id}
      AND wallet_address != ${walletAddress.toLowerCase()}
    `

    if (existingConnection.length > 0) {
      console.log("[v0] Twitter account already connected to another wallet")
      return NextResponse.redirect(`${origin}/poker?error=twitter_already_connected`)
    }

    // Store in database
    console.log("[v0] Storing Twitter connection in database")
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

    console.log("[v0] Twitter connection successful")
    return NextResponse.redirect(`${origin}/poker?twitter_connected=true`)
  } catch (error) {
    console.error("[v0] Twitter OAuth error:", error)
    return NextResponse.redirect(`${new URL(request.url).origin}/poker?error=twitter_connection_failed`)
  }
}
