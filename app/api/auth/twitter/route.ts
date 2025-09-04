import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const origin = request.nextUrl.origin
    const wallet = request.nextUrl.searchParams.get("wallet")

    if (!wallet) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    // Check for required environment variables
    const clientId = process.env.TWITTER_CLIENT_ID
    if (!clientId) {
      console.error("[v0] Twitter OAuth Error: TWITTER_CLIENT_ID not found")
      return NextResponse.json({ error: "Twitter OAuth not configured" }, { status: 500 })
    }

    const redirectUri = `${origin}/api/auth/twitter/callback`
    const state = Buffer.from(JSON.stringify({ wallet })).toString("base64")

    console.log("[v0] Twitter OAuth starting:", { wallet, redirectUri, origin })

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "tweet.read users.read",
      state,
      code_challenge: "challenge",
      code_challenge_method: "plain",
    })

    const authorizeUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`
    console.log("[v0] Redirecting to Twitter:", authorizeUrl)

    return NextResponse.redirect(authorizeUrl)
  } catch (error) {
    console.error("[v0] Twitter OAuth Error:", error)
    return NextResponse.json({ error: "Failed to initiate Twitter OAuth" }, { status: 500 })
  }
}
