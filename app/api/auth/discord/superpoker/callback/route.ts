import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.redirect(`${req.nextUrl.origin}/superpoker?error=discord_auth_failed`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${req.nextUrl.origin}/superpoker?error=discord_auth_failed`)
    }

    // Verify state
    const storedState = req.cookies.get("discord_oauth_state")?.value
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${req.nextUrl.origin}/superpoker?error=discord_auth_failed`)
    }

    // Exchange code for token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: `${req.nextUrl.origin}/api/auth/discord/superpoker/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      return NextResponse.redirect(`${req.nextUrl.origin}/superpoker?error=discord_token_failed`)
    }

    const tokenData = await tokenResponse.json()

    // Get user info
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    })

    if (!userResponse.ok) {
      return NextResponse.redirect(`${req.nextUrl.origin}/superpoker?error=discord_user_failed`)
    }

    const userData = await userResponse.json()

    // Store user in superpoker_users table
    await sql`
      INSERT INTO superpoker_users (discord_id, discord_username, updated_at)
      VALUES (${userData.id}, ${userData.global_name || userData.username}, CURRENT_TIMESTAMP)
      ON CONFLICT (discord_id) 
      DO UPDATE SET 
        discord_username = EXCLUDED.discord_username,
        updated_at = CURRENT_TIMESTAMP
    `

    // Set session cookie
    const response = NextResponse.redirect(`${req.nextUrl.origin}/superpoker?success=discord_verified`)
    response.cookies.set("superpoker_discord_id", userData.id, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    // Clear state cookie
    response.cookies.delete("discord_oauth_state")

    return response
  } catch (error) {
    console.error("Discord OAuth callback error:", error)
    return NextResponse.redirect(`${req.nextUrl.origin}/superpoker?error=discord_connection_failed`)
  }
}
