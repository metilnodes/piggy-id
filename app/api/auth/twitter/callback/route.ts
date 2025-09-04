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

  let parsed: { w: string; s: string }
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

  const wallet = (parsed.w || "").toLowerCase()
  if (!wallet) {
    console.log("[v0] Twitter callback - no wallet in state")
    return redirectBack("?error=twitter_wallet_missing")
  }

  console.log("[v0] Twitter callback - wallet:", wallet)

  try {
    const redirectUri = `${origin}/api/auth/twitter/callback`

    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: process.env.TWITTER_CLIENT_ID!,
        client_secret: process.env.TWITTER_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })

    console.log("[v0] Twitter token response status:", tokenRes.status)

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      console.error("[v0] Twitter token error:", tokenRes.status, errorText)

      try {
        const errorData = JSON.parse(errorText)
        if (errorData.error === "invalid_client") {
          console.error(
            "[v0] Twitter invalid_client - Check: 1) Using OAuth 2.0 Client ID/Secret (not 1.0a), 2) Credentials set in Vercel Preview env",
          )
          return redirectBack("?error=twitter_invalid_client&step=token&help=check_oauth2_credentials")
        }
        if (errorData.error === "invalid_grant") {
          console.error(
            "[v0] Twitter invalid_grant - Check: 1) Callback URL matches exactly, 2) Code not expired/reused",
          )
          return redirectBack("?error=twitter_invalid_grant&step=token&help=check_callback_url")
        }
        if (errorData.error === "unauthorized_client") {
          console.error(
            "[v0] Twitter unauthorized_client - Check: 1) User authentication enabled in X Dev Portal, 2) App has required permissions",
          )
          return redirectBack("?error=twitter_unauthorized&step=token&help=check_dev_portal_settings")
        }
        if (errorData.error === "invalid_request") {
          console.error(
            "[v0] Twitter invalid_request - Check: 1) All required parameters present, 2) Callback URL format",
          )
          return redirectBack("?error=twitter_invalid_request&step=token&help=check_parameters")
        }
      } catch (e) {
        console.log("[v0] Could not parse Twitter error JSON")
      }

      if (tokenRes.status === 400) {
        console.error(
          "[v0] Twitter 400 Bad Request - Common causes: wrong credentials, callback URL mismatch, or app configuration issues",
        )
        return redirectBack(
          `?error=twitter_400_error&step=token&help=check_configuration&details=${encodeURIComponent(errorText)}`,
        )
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

      if (meRes.status === 403) {
        console.error(
          "[v0] Twitter 403 Forbidden - Check: 1) users.read scope granted, 2) Developer account has required access level",
        )
        return redirectBack(`?error=twitter_profile_forbidden&step=profile&help=check_scopes_and_account`)
      }

      return redirectBack(`?error=twitter_profile_failed&step=profile&details=${encodeURIComponent(errorText)}`)
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
