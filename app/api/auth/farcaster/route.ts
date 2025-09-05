import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const wallet = url.searchParams.get("wallet")

    if (!wallet) {
      return NextResponse.redirect("/poker?error=farcaster_wallet_missing")
    }

    const apiKey = process.env.NEYNAR_API_KEY

    if (!apiKey) {
      console.error("[v0] Missing Neynar API key")
      return NextResponse.redirect("/poker?error=farcaster_config_missing")
    }

    console.log("[v0] Neynar API Key present:", !!apiKey)
    console.log("[v0] API Key length:", apiKey.length)
    console.log("[v0] API Key prefix:", apiKey.substring(0, 8) + "...")

    // Create state parameter with wallet address
    const state = Buffer.from(JSON.stringify({ wallet })).toString("base64")

    const authUrl = new URL("https://api.neynar.com/v2/oauth/authorize")
    authUrl.searchParams.set("client_id", apiKey)
    authUrl.searchParams.set("redirect_uri", `${url.origin}/api/auth/farcaster/callback`)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", "openid farcaster:read")
    authUrl.searchParams.set("state", state)

    console.log("[v0] Authorization URL:", authUrl.toString())

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error("[v0] Farcaster auth error:", error)
    return NextResponse.redirect("/poker?error=farcaster_auth_failed")
  }
}
