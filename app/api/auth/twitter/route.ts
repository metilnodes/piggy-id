import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const walletAddress = searchParams.get("wallet")

  if (!walletAddress) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
  }

  const twitterClientId = process.env.TWITTER_CLIENT_ID
  if (!twitterClientId) {
    return NextResponse.json({ error: "Twitter not configured" }, { status: 500 })
  }

  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/twitter/callback`
  const state = Buffer.from(JSON.stringify({ walletAddress })).toString("base64")

  // Twitter OAuth 2.0 with PKCE
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  // Store code verifier temporarily (in production, use Redis or database)
  global.twitterCodeVerifiers = global.twitterCodeVerifiers || new Map()
  global.twitterCodeVerifiers.set(state, codeVerifier)

  const twitterAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${twitterClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20users.read&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`

  return NextResponse.redirect(twitterAuthUrl)
}

function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString("base64url")
}

async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Buffer.from(digest).toString("base64url")
}
