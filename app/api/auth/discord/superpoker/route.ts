import { type NextRequest, NextResponse } from "next/server"
import crypto from "crypto"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.DISCORD_CLIENT_ID
    const redirectUri = `${req.nextUrl.origin}/api/auth/discord/superpoker/callback`

    if (!clientId) {
      return NextResponse.json({ error: "Discord client ID not configured" }, { status: 500 })
    }

    // Generate state for security
    const state = crypto.randomBytes(32).toString("hex")

    // Store state in cookie
    const response = NextResponse.redirect(
      `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify&state=${state}`,
    )

    response.cookies.set("discord_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 minutes
    })

    return response
  } catch (error) {
    console.error("Discord OAuth start error:", error)
    return NextResponse.redirect(`${req.nextUrl.origin}/superpoker?error=discord_auth_failed`)
  }
}
