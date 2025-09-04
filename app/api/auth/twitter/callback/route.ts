import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const origin = url.origin
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    const error = url.searchParams.get("error")

    if (error) {
      console.error("[v0] Twitter OAuth error:", error)
      return NextResponse.redirect(`${origin}/poker?error=twitter_oauth_denied`)
    }

    if (!code || !state) {
      console.error("[v0] Twitter OAuth: Missing code or state")
      return NextResponse.redirect(`${origin}/poker?error=twitter_missing_params`)
    }

    const cookieData = cookies().get("twitter_oauth_state")?.value
    if (!cookieData) {
      console.error("[v0] Twitter OAuth: Missing state cookie")
      return NextResponse.redirect(`${origin}/poker?error=twitter_state_missing`)
    }

    let wallet: string, expectedState: string
    try {
      const parsed = JSON.parse(cookieData)
      wallet = parsed.wallet
      expectedState = parsed.state
    } catch {
      console.error("[v0] Twitter OAuth: Invalid state cookie")
      return NextResponse.redirect(`${origin}/poker?error=twitter_state_invalid`)
    }

    if (state !== expectedState) {
      console.error("[v0] Twitter OAuth: State mismatch")
      return NextResponse.redirect(`${origin}/poker?error=twitter_state_mismatch`)
    }

    const redirectUri = `${origin}/api/auth/twitter/callback`

    console.log("[v0] Twitter OAuth: Exchanging code for token")
    const tokenResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: process.env.TWITTER_CLIENT_ID!,
        client_secret: process.env.TWITTER_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error("[v0] Twitter token exchange failed:", tokenResponse.status, errorText)
      return NextResponse.redirect(`${origin}/poker?error=twitter_token_failed`)
    }

    const tokenData = await tokenResponse.json()
    if (!tokenData.access_token) {
      console.error("[v0] Twitter OAuth: No access token received")
      return NextResponse.redirect(`${origin}/poker?error=twitter_no_token`)
    }

    console.log("[v0] Twitter OAuth: Fetching user profile")
    const userResponse = await fetch("https://api.twitter.com/2/users/me?user.fields=username,name", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      console.error("[v0] Twitter profile fetch failed:", userResponse.status, errorText)
      return NextResponse.redirect(`${origin}/poker?error=twitter_profile_failed`)
    }

    const userData = await userResponse.json()
    const twitterUser = userData.data

    if (!twitterUser?.id || !twitterUser?.username) {
      console.error("[v0] Twitter OAuth: Invalid user data", userData)
      return NextResponse.redirect(`${origin}/poker?error=twitter_invalid_user`)
    }

    const existingConnection = await sql`
      SELECT wallet_address FROM user_identities 
      WHERE twitter_id = ${twitterUser.id} AND wallet_address != ${wallet}
    `

    if (existingConnection.length > 0) {
      console.log("[v0] Twitter account already connected to another wallet")
      return NextResponse.redirect(`${origin}/poker?error=twitter_already_connected`)
    }

    console.log("[v0] Twitter OAuth: Storing connection", {
      wallet,
      twitterId: twitterUser.id,
      twitterUsername: twitterUser.username,
    })

    await sql`
      INSERT INTO user_identities (wallet_address, twitter_id, twitter_username, created_at, updated_at)
      VALUES (${wallet}, ${twitterUser.id}, ${twitterUser.username}, NOW(), NOW())
      ON CONFLICT (wallet_address) DO UPDATE SET
        twitter_id = EXCLUDED.twitter_id,
        twitter_username = EXCLUDED.twitter_username,
        updated_at = NOW()
    `

    const response = NextResponse.redirect(`${origin}/poker?success=twitter_verified`)
    response.cookies.set("twitter_oauth_state", "", {
      path: "/",
      maxAge: 0,
    })

    console.log("[v0] Twitter OAuth: Connection successful")
    return response
  } catch (error) {
    console.error("[v0] Twitter OAuth callback error:", error)

    const response = NextResponse.redirect(`${req.nextUrl.origin}/poker?error=twitter_connection_failed`)
    response.cookies.set("twitter_oauth_state", "", {
      path: "/",
      maxAge: 0,
    })

    return response
  }
}
