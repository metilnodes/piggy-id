import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function b64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

export async function GET(req: NextRequest) {
  const wallet = (req.nextUrl.searchParams.get("wallet") || "").toLowerCase()
  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/auth/twitter/callback`

  if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
    console.error("[v0] Twitter OAuth Error: Missing credentials", {
      clientId: !!process.env.TWITTER_CLIENT_ID,
      clientSecret: !!process.env.TWITTER_CLIENT_SECRET,
    })
    return NextResponse.redirect(`${origin}/poker?error=twitter_config_missing`, { status: 302 })
  }

  console.log("[v0] Twitter OAuth Debug:", {
    origin,
    redirectUri,
    wallet,
    clientId: process.env.TWITTER_CLIENT_ID ? `${process.env.TWITTER_CLIENT_ID.substring(0, 8)}...` : "NOT SET",
    clientIdLength: process.env.TWITTER_CLIENT_ID?.length || 0,
    note: "Make sure you're using OAuth 2.0 Client ID/Secret, not OAuth 1.0a API Key/Secret",
  })

  const state = b64url(crypto.randomBytes(16)) // nonce

  const payload = JSON.stringify({ w: wallet, s: state })
  const authUrl = new URL("https://twitter.com/i/oauth2/authorize")
  authUrl.searchParams.set("client_id", process.env.TWITTER_CLIENT_ID!)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("scope", "users.read offline.access")
  authUrl.searchParams.set("state", state)

  const res = NextResponse.redirect(authUrl.toString(), { status: 302 })
  res.cookies.set("tw_oauth", payload, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  })
  return res
}
