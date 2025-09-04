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

  // PKCE
  const verifier = b64url(crypto.randomBytes(32))
  const challenge = b64url(crypto.createHash("sha256").update(verifier).digest())
  const state = b64url(crypto.randomBytes(16)) // nonce

  // сохраним verifier+wallet+state в HttpOnly cookie на 10 минут
  const payload = JSON.stringify({ v: verifier, w: wallet, s: state })
  const authUrl = new URL("https://twitter.com/i/oauth2/authorize")
  authUrl.searchParams.set("client_id", process.env.TWITTER_CLIENT_ID!)
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("scope", "users.read offline.access") // добавим ещё, если нужно
  authUrl.searchParams.set("state", state)
  authUrl.searchParams.set("code_challenge", challenge)
  authUrl.searchParams.set("code_challenge_method", "S256")

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
