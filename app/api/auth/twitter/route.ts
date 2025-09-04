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
      note: "Make sure TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET are set in Vercel Preview environment",
    })
    return NextResponse.redirect(`${origin}/poker?error=twitter_config_missing&help=credentials`, { status: 302 })
  }

  const clientId = process.env.TWITTER_CLIENT_ID
  if (clientId.length < 20 || !/^[a-zA-Z0-9_-]+$/.test(clientId)) {
    console.error("[v0] Twitter OAuth Error: Invalid Client ID format", {
      clientIdLength: clientId.length,
      clientIdPreview: `${clientId.substring(0, 8)}...`,
      note: "OAuth 2.0 Client ID should be 20+ characters. If using OAuth 1.0a API Key, switch to OAuth 2.0 in X Dev Portal",
    })
    return NextResponse.redirect(`${origin}/poker?error=twitter_invalid_client_format&help=oauth2_credentials`, {
      status: 302,
    })
  }

  console.log("[v0] Twitter OAuth Debug:", {
    origin,
    redirectUri,
    wallet,
    clientId: `${clientId.substring(0, 8)}...`,
    clientIdLength: clientId.length,
    callbackUrlNote: "Callback URL in X Dev Portal must match exactly: " + redirectUri,
    credentialsNote: "Using OAuth 2.0 Client ID/Secret (not OAuth 1.0a API Key/Secret)",
    appTypeNote: "X Dev Portal should be configured as Web App (Confidential)",
    userAuthNote: "User authentication must be enabled in X Dev Portal settings",
  })

  const state = b64url(crypto.randomBytes(16))

  const payload = JSON.stringify({ w: wallet, s: state })
  const authUrl = new URL("https://twitter.com/i/oauth2/authorize")
  authUrl.searchParams.set("client_id", process.env.TWITTER_CLIENT_ID!)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("scope", "users.read")
  authUrl.searchParams.set("state", state)

  console.log("[v0] Twitter OAuth URL:", {
    url: authUrl.toString(),
    scopeNote: "Using minimal 'users.read' scope for better compatibility",
    pkceNote: "PKCE disabled - using Web App (Confidential) flow with client_secret",
  })

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
