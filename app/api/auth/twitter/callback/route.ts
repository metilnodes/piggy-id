import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const origin = url.origin
  const redirectBack = (qs: string) => NextResponse.redirect(`${origin}/poker${qs}`)

  if (!code || !state) return redirectBack("?error=twitter_auth_failed")

  // достанем PKCE и кошелёк из HttpOnly cookie
  const jar = cookies()
  const raw = jar.get("tw_oauth")?.value
  if (!raw) return redirectBack("?error=twitter_state_missing")

  let parsed: { v: string; w: string; s: string }
  try {
    parsed = JSON.parse(raw)
  } catch {
    return redirectBack("?error=twitter_state_parse")
  }
  if (parsed.s !== state) return redirectBack("?error=twitter_state_mismatch")

  const verifier = parsed.v
  const wallet = (parsed.w || "").toLowerCase()
  if (!wallet) return redirectBack("?error=twitter_wallet_missing")

  try {
    const redirectUri = `${origin}/api/auth/twitter/callback`

    // 1) обмен code -> токен (PKCE)
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: process.env.TWITTER_CLIENT_ID!,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    })
    if (!tokenRes.ok) {
      const t = await tokenRes.text()
      throw new Error(`token error: ${t}`)
    }
    const token = await tokenRes.json()
    if (!token.access_token) throw new Error("no access_token")

    // 2) профиль
    const meRes = await fetch("https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    if (!meRes.ok) {
      const t = await meRes.text()
      throw new Error(`me error: ${t}`)
    }
    const me = await meRes.json() // { data: { id, name, username, ... } }
    const tUser = me?.data
    if (!tUser?.id) throw new Error("no user id")

    // 3) upsert в user_identities (как делали для Discord)
    await sql /* sql */`
      INSERT INTO user_identities (wallet_address, twitter_id, twitter_username, updated_at, created_at)
      VALUES (${wallet}, ${tUser.id}, ${tUser.username}, NOW(), NOW())
      ON CONFLICT (wallet_address) DO UPDATE SET
        twitter_id = EXCLUDED.twitter_id,
        twitter_username = EXCLUDED.twitter_username,
        updated_at = NOW()
    `

    // 4) гасим cookie и редиректим с флагом успеха
    const res = redirectBack("?success=twitter_verified")
    res.cookies.set("tw_oauth", "", { path: "/", maxAge: 0 })
    return res
  } catch (e) {
    console.error("[twitter callback] error:", e)
    const res = redirectBack("?error=twitter_connection_failed")
    res.cookies.set("tw_oauth", "", { path: "/", maxAge: 0 })
    return res
  }
}
