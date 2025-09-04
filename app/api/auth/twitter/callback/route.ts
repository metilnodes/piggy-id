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

  console.log("[v0] Twitter callback - code:", !!code, "state:", !!state)

  if (!code || !state) return redirectBack("?error=twitter_auth_failed")

  // достанем PKCE и кошелёк из HttpOnly cookie
  const jar = cookies()
  const raw = jar.get("tw_oauth")?.value
  if (!raw) {
    console.log("[v0] Twitter callback - no tw_oauth cookie found")
    return redirectBack("?error=twitter_state_missing")
  }

  let parsed: { v: string; w: string; s: string }
  try {
    parsed = JSON.parse(raw)
  } catch {
    console.log("[v0] Twitter callback - failed to parse cookie")
    return redirectBack("?error=twitter_state_parse")
  }
  if (parsed.s !== state) {
    console.log("[v0] Twitter callback - state mismatch:", parsed.s, "vs", state)
    return redirectBack("?error=twitter_state_mismatch")
  }

  const verifier = parsed.v
  const wallet = (parsed.w || "").toLowerCase()
  if (!wallet) {
    console.log("[v0] Twitter callback - no wallet in state")
    return redirectBack("?error=twitter_wallet_missing")
  }

  console.log("[v0] Twitter callback - wallet:", wallet, "verifier length:", verifier.length)

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

    console.log("[v0] Twitter token response status:", tokenRes.status)

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      console.error("[v0] Twitter token error:", tokenRes.status, errorText)

      // Parse specific Twitter errors
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.error === "invalid_client") {
          return redirectBack("?error=twitter_invalid_client&step=token&errorCode=InvalidClientComponent")
        }
        if (errorData.error === "invalid_grant") {
          return redirectBack("?error=twitter_invalid_grant&step=token&errorCode=InvalidGrantComponent")
        }
        if (errorData.error === "unauthorized_client") {
          return redirectBack("?error=twitter_unauthorized&step=token&errorCode=UnauthorizedComponent")
        }
      } catch (e) {
        console.log("[v0] Could not parse Twitter error JSON")
      }

      return redirectBack(`?error=twitter_token_failed&step=token&errorCode=TokenErrorComponent`)
    }

    const token = await tokenRes.json()
    console.log("[v0] Twitter token received, has access_token:", !!token.access_token)

    if (!token.access_token) {
      console.error("[v0] Twitter token response missing access_token:", token)
      return redirectBack("?error=twitter_no_token&step=token&errorCode=NoTokenComponent")
    }

    // 2) профиль
    const meRes = await fetch("https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })

    console.log("[v0] Twitter profile response status:", meRes.status)

    if (!meRes.ok) {
      const errorText = await meRes.text()
      console.error("[v0] Twitter profile error:", meRes.status, errorText)
      return redirectBack(`?error=twitter_profile_failed&step=profile&errorCode=ProfileErrorComponent`)
    }

    const me = await meRes.json()
    console.log("[v0] Twitter profile data:", {
      hasData: !!me?.data,
      userId: me?.data?.id,
      username: me?.data?.username,
    })

    const tUser = me?.data
    if (!tUser?.id) {
      console.error("[v0] Twitter profile missing user id:", me)
      return redirectBack("?error=twitter_no_user_id&step=profile&errorCode=NoUserIdComponent")
    }

    // 3) upsert в user_identities (как делали для Discord)
    console.log(
      "[v0] Twitter inserting to database - wallet:",
      wallet,
      "twitter_id:",
      tUser.id,
      "username:",
      tUser.username,
    )

    await sql /* sql */`
      INSERT INTO user_identities (wallet_address, twitter_id, twitter_username, updated_at, created_at)
      VALUES (${wallet}, ${tUser.id}, ${tUser.username}, NOW(), NOW())
      ON CONFLICT (wallet_address) DO UPDATE SET
        twitter_id = EXCLUDED.twitter_id,
        twitter_username = EXCLUDED.twitter_username,
        updated_at = NOW()
    `

    console.log("[v0] Twitter database insert successful")

    // 4) гасим cookie и редиректим с флагом успеха
    const res = redirectBack("?success=twitter_verified")
    res.cookies.set("tw_oauth", "", { path: "/", maxAge: 0 })
    return res
  } catch (e) {
    console.error("[v0] Twitter callback error:", e)
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error("[v0] Twitter error details:", errorMessage)

    const res = redirectBack(
      `?error=twitter_connection_failed&step=unknown&errorCode=UnknownErrorComponent&details=${encodeURIComponent(errorMessage)}`,
    )
    res.cookies.set("tw_oauth", "", { path: "/", maxAge: 0 })
    return res
  }
}
