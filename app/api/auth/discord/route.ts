import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  console.log("[v0] Discord OAuth route called")

  // Build redirect_uri from the current request host so it always matches the
  // domain the user is actually on. Do NOT rely on NEXT_PUBLIC_BASE_URL, which
  // may point to a stale/dead domain (e.g. id.piggyworld.xyz).
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000"
  const proto = request.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https")
  const baseUrl = `${proto}://${host}`
  const redirectUri = `${baseUrl}/api/auth/discord/callback`

  const searchParams = request.nextUrl.searchParams
  const walletAddress = searchParams.get("wallet")
  const source = searchParams.get("source") || "poker"

  if (!walletAddress && source !== "superpoker") {
    console.log("[v0] ERROR: No wallet address provided")
    return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
  }

  console.log("[v0] Wallet address from params:", walletAddress)
  console.log("[v0] Source from params:", source)

  console.log("[v0] Origin:", baseUrl)
  console.log("[v0] Redirect URI:", redirectUri)

  const state = Buffer.from(JSON.stringify({ walletAddress, source })).toString("base64")

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify",
    state,
  })

  const authorizeUrl = `https://discord.com/oauth2/authorize?${params.toString()}`

  console.log("[v0] Discord Client ID:", process.env.DISCORD_CLIENT_ID ? "Present" : "Missing")
  console.log("[v0] Authorize URL:", authorizeUrl)
  console.log("[v0] Redirecting to Discord...")

  return NextResponse.redirect(authorizeUrl)
}
