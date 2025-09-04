import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const wallet = (req.nextUrl.searchParams.get("wallet") || "").toLowerCase()
    const origin = req.nextUrl.origin

    if (!wallet) {
      return NextResponse.redirect(`${origin}/poker?error=twitter_no_wallet`)
    }

    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      console.error("[v0] Twitter OAuth: Missing credentials")
      return NextResponse.redirect(`${origin}/poker?error=twitter_config_missing`)
    }

    const state = crypto.randomBytes(32).toString("hex")
    const redirectUri = `${origin}/api/auth/twitter/callback`

    const cookieData = JSON.stringify({ wallet, state })

    const authUrl = new URL("https://twitter.com/i/oauth2/authorize")
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("client_id", process.env.TWITTER_CLIENT_ID)
    authUrl.searchParams.set("redirect_uri", redirectUri)
    authUrl.searchParams.set("scope", "users.read")
    authUrl.searchParams.set("state", state)

    console.log("[v0] Twitter OAuth: Starting authorization", {
      wallet,
      redirectUri,
      scope: "users.read",
    })

    const response = NextResponse.redirect(authUrl.toString())

    response.cookies.set("twitter_oauth_state", cookieData, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 minutes
    })

    return response
  } catch (error) {
    console.error("[v0] Twitter OAuth start error:", error)
    return NextResponse.redirect(`${req.nextUrl.origin}/poker?error=twitter_start_failed`)
  }
}
