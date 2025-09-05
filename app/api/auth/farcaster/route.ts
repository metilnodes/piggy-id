import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const wallet = url.searchParams.get("wallet")

    if (!wallet) {
      return NextResponse.redirect("/poker?error=farcaster_auth_failed")
    }

    if (!process.env.NEYNAR_API_KEY) {
      console.error("NEYNAR_API_KEY not configured")
      return NextResponse.redirect("/poker?error=farcaster_config_missing")
    }

    if (!process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID) {
      console.error("NEXT_PUBLIC_NEYNAR_CLIENT_ID not configured")
      return NextResponse.redirect("/poker?error=farcaster_config_missing")
    }

    const state = Buffer.from(JSON.stringify({ wallet })).toString("base64")

    const authUrl = new URL("https://api.neynar.com/v2/oauth/authorize")
    authUrl.searchParams.set("client_id", process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID)
    authUrl.searchParams.set("neynar_api_key", process.env.NEYNAR_API_KEY)
    authUrl.searchParams.set("redirect_uri", `${url.origin}/api/auth/farcaster/callback`)
    authUrl.searchParams.set("response_type", "code")
    authUrl.searchParams.set("scope", "openid farcaster:read")
    authUrl.searchParams.set("state", state)

    return NextResponse.redirect(authUrl.toString(), { status: 302 })
  } catch (error) {
    console.error("Farcaster auth error:", error)
    return NextResponse.redirect("/poker?error=farcaster_auth_failed")
  }
}
