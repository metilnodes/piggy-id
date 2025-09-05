import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  console.log("[v0] Discord OAuth route called")

  const searchParams = request.nextUrl.searchParams
  const walletAddress = searchParams.get("wallet")
  const source = searchParams.get("source") || "poker"

  console.log("[v0] Wallet address from params:", walletAddress)
  console.log("[v0] Source from params:", source)

  if (!walletAddress && source !== "superpoker") {
    console.log("[v0] ERROR: No wallet address provided")
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
  }

  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/auth/discord/callback`

  console.log("[v0] Origin:", origin)
  console.log("[v0] Redirect URI:", redirectUri)

  const state = Buffer.from(JSON.stringify({ walletAddress, source })).toString("base64")

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify email",
    state,
  })

  const authorizeUrl = `https://discord.com/oauth2/authorize?${params.toString()}`

  console.log("[v0] Discord Client ID:", process.env.DISCORD_CLIENT_ID ? "Present" : "Missing")
  console.log("[v0] Authorize URL:", authorizeUrl)
  console.log("[v0] Redirecting to Discord...")

  return NextResponse.redirect(authorizeUrl)
}
