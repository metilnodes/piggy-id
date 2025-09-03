import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const walletAddress = searchParams.get("wallet")

  if (!walletAddress) {
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
  }

  const discordClientId = process.env.DISCORD_CLIENT_ID
  if (!discordClientId) {
    return NextResponse.json({ error: "Discord not configured" }, { status: 500 })
  }

  const redirectUri = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/discord/callback`
  const state = Buffer.from(JSON.stringify({ walletAddress })).toString("base64")

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify&state=${state}`

  return NextResponse.redirect(discordAuthUrl)
}
