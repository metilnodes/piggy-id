import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const walletAddress = searchParams.get("wallet")

  if (!walletAddress) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/auth/discord/callback`

  const state = Buffer.from(JSON.stringify({ walletAddress })).toString("base64")

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
    state,
  })

  const authorizeUrl = `https://discord.com/oauth2/authorize?${params.toString()}`
  return NextResponse.redirect(authorizeUrl)
}
