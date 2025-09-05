import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get("code")
    const state = url.searchParams.get("state")
    if (!code || !state) return NextResponse.redirect("/poker?error=farcaster_auth_failed")

    const { wallet } = JSON.parse(Buffer.from(state, "base64").toString() || "{}")
    if (!wallet) return NextResponse.redirect("/poker?error=farcaster_state_failed")

    // 1) code -> token (здесь ТОЛЬКО X-API-KEY)
    const tokenRes = await fetch("https://api.neynar.com/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.NEYNAR_API_KEY!,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${url.origin}/api/auth/farcaster/callback`,
      }),
    })
    if (!tokenRes.ok) {
      console.error("neynar token error", tokenRes.status, await tokenRes.text())
      return NextResponse.redirect("/poker?error=farcaster_token_failed")
    }
    const token = await tokenRes.json() // { access_token, ... }

    // 2) профиль по access_token
    const meRes = await fetch("https://api.neynar.com/v2/farcaster/user", {
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "X-API-KEY": process.env.NEYNAR_API_KEY!,
      },
    })
    if (!meRes.ok) {
      console.error("neynar user error", meRes.status, await meRes.text())
      return NextResponse.redirect("/poker?error=farcaster_profile_failed")
    }
    const me = await meRes.json()
    const fid = me?.user?.fid
    const username = me?.user?.username
    const displayName = me?.user?.display_name || username
    const avatarUrl = me?.user?.pfp_url || null

    await sql`
      INSERT INTO user_identities
        (wallet_address, platform, platform_user_id, username, display_name, avatar_url, created_at, updated_at)
      VALUES
        (${wallet.toLowerCase()}, 'farcaster', ${fid}, ${username}, ${displayName}, ${avatarUrl}, NOW(), NOW())
      ON CONFLICT (wallet_address, platform) DO UPDATE SET
        platform_user_id = EXCLUDED.platform_user_id,
        username        = EXCLUDED.username,
        display_name    = EXCLUDED.display_name,
        avatar_url      = EXCLUDED.avatar_url,
        updated_at      = NOW();
    `

    return NextResponse.redirect("/poker?farcaster_connected=true")
  } catch (e) {
    console.error("farcaster callback error", e)
    return NextResponse.redirect("/poker?error=farcaster_connection_failed")
  }
}
