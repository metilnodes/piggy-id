import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

const back = (origin: string, qs: string) => NextResponse.redirect(`${origin}/poker${qs}`)

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const origin = url.origin
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  if (!code || !state) return back(origin, "?error=twitter_auth_failed")

  // читаем state из cookie
  const raw = cookies().get("tw_oauth")?.value
  if (!raw) return back(origin, "?error=twitter_state_missing")
  let w = "",
    s = ""
  try {
    const p = JSON.parse(raw)
    w = (p.w || "").toLowerCase()
    s = p.s
  } catch {}
  if (!w || s !== state) return back(origin, "?error=twitter_state_mismatch")

  try {
    const redirectUri = `${origin}/api/auth/twitter/callback`

    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: process.env.TWITTER_CLIENT_ID!, // OAuth2 Client ID
        client_secret: process.env.TWITTER_CLIENT_SECRET!, // OAuth2 Client Secret
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      const why = await tokenRes.text()
      console.error("twitter token error:", tokenRes.status, why)
      return back(origin, `?error=twitter_connection_failed&step=token`)
    }
    const token = await tokenRes.json()
    if (!token.access_token) throw new Error("no access_token")

    const meRes = await fetch("https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url", {
      headers: { Authorization: `Bearer ${token.access_token}`, Accept: "application/json" },
    })
    if (!meRes.ok) {
      const why = await meRes.text()
      console.error("twitter me error:", meRes.status, why)
      return back(origin, `?error=twitter_profile_failed&step=profile`)
    }
    const me = await meRes.json()
    const tUser = me?.data
    if (!tUser?.id) throw new Error("no user id")

    await sql /* sql */`
      INSERT INTO user_identities (wallet_address, twitter_id, twitter_username, created_at, updated_at)
      VALUES (${w}, ${tUser.id}, ${tUser.username}, NOW(), NOW())
      ON CONFLICT (wallet_address) DO UPDATE SET
        twitter_id = EXCLUDED.twitter_id,
        twitter_username = EXCLUDED.twitter_username,
        updated_at = NOW()
    `

    const res = back(origin, "?success=twitter_verified")
    res.cookies.set("tw_oauth", "", { path: "/", maxAge: 0 })
    return res
  } catch (e) {
    console.error("[twitter callback] error:", e)
    const res = back(origin, "?error=twitter_connection_failed")
    res.cookies.set("tw_oauth", "", { path: "/", maxAge: 0 })
    return res
  }
}
