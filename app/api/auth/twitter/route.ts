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
