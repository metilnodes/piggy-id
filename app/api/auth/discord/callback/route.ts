export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  console.log("[Discord Callback] Request received")

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")

  console.log("[Discord Callback] Code exists:", !!code)
  console.log("[Discord Callback] State exists:", !!state)

  const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || `https://${request.headers.get("host") || "localhost:3000"}`
  const baseUrl = rawBaseUrl.endsWith("/") ? rawBaseUrl.slice(0, -1) : rawBaseUrl
  const redirectUri = `${baseUrl}/api/auth/discord/callback`

  console.log("[Discord Callback] Base URL:", baseUrl)
  console.log("[Discord Callback] Redirect URI:", redirectUri)

  if (!code || !state) {
    console.error("[Discord Callback] Missing code or state")
    return NextResponse.redirect(`${baseUrl}/profile?error=discord_auth_failed&details=missing_code_or_state`)
  }

  try {
    let walletAddress: string
    let source = "poker"

    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString())
      walletAddress = decoded.walletAddress
      source = decoded.source || "poker"
      console.log("[Discord Callback] Decoded wallet:", walletAddress)
      console.log("[Discord Callback] Source:", source)
    } catch (stateError) {
      console.error("[Discord Callback] Invalid state:", stateError)
      return NextResponse.redirect(`${baseUrl}/profile?error=discord_auth_failed&details=invalid_state`)
    }

    console.log("[Discord Callback] Fetching token from Discord...")
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    })

    console.log("[Discord Callback] Token response status:", tokenRes.status)

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      console.error("[Discord Callback] Token error:", errorText)
      const errorDetails = `token_${tokenRes.status}_${encodeURIComponent(errorText.substring(0, 50))}`
      return NextResponse.redirect(`${baseUrl}/profile?error=discord_connection_failed&details=${errorDetails}`)
    }

    const token = await tokenRes.json()

    if (!token.access_token) {
      console.error("[Discord Callback] No access token in response")
      return NextResponse.redirect(`${baseUrl}/profile?error=discord_connection_failed&details=no_access_token`)
    }

    console.log("[Discord Callback] Got access token, fetching user...")
    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })

    console.log("[Discord Callback] User response status:", meRes.status)

    if (!meRes.ok) {
      console.error("[Discord Callback] Failed to fetch user")
      const errorDetails = `user_${meRes.status}`
      return NextResponse.redirect(`${baseUrl}/profile?error=discord_connection_failed&details=${errorDetails}`)
    }

    const me = await meRes.json()
    console.log("[Discord Callback] Discord user ID:", me.id)
    console.log("[Discord Callback] Discord username:", me.username)

    if (source === "superpoker") {
      console.log("[Discord Callback] Processing superpoker user...")
      const existingUser = await sql`
        SELECT * FROM superpoker_users WHERE discord_id = ${me.id} LIMIT 1
      `

      if (existingUser.length === 0) {
        await sql`
          INSERT INTO superpoker_users (discord_id, discord_username, created_at, updated_at)
          VALUES (${me.id}, ${me.username}, NOW(), NOW())
        `
        console.log("[Discord Callback] Created new superpoker user")
      } else {
        await sql`
          UPDATE superpoker_users 
          SET discord_username = ${me.username}, updated_at = NOW()
          WHERE discord_id = ${me.id}
        `
        console.log("[Discord Callback] Updated superpoker user")
      }

      const response = NextResponse.redirect(`${baseUrl}/superpoker?success=discord_verified`)
      response.cookies.set("superpoker_discord_id", me.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      })
      return response
    }

    const normalizedWallet = walletAddress.toLowerCase()
    console.log("[Discord Callback] Normalized wallet:", normalizedWallet)

    console.log("[Discord Callback] Checking for wallet conflicts...")
    const walletConflict = await sql`
      SELECT discord_id FROM user_identities 
      WHERE wallet_address = ${normalizedWallet}
        AND discord_id IS NOT NULL 
        AND discord_id != ${me.id}
      LIMIT 1
    `

    if (walletConflict.length > 0) {
      console.error("[Discord Callback] Wallet already linked to different Discord")
      const redirectPath = source === "market" ? "market/profile" : "profile"
      return NextResponse.redirect(
        `${baseUrl}/${redirectPath}?error=wallet_already_linked&details=discord_${walletConflict[0].discord_id}`,
      )
    }

    console.log("[Discord Callback] Checking for existing Discord user...")
    const existingDiscordUser = await sql`
      SELECT wallet_address, tips_wallet_address, token_id FROM user_identities 
      WHERE discord_id = ${me.id} 
      LIMIT 1
    `

    if (existingDiscordUser.length > 0) {
      console.log("[Discord Callback] Found existing Discord user, merging with wallet record...")

      const oldTipsWallet = existingDiscordUser[0].tips_wallet_address
      const oldTokenId = existingDiscordUser[0].token_id

      const walletRecord = await sql`
        SELECT id, tips_wallet_address FROM user_identities 
        WHERE wallet_address = ${normalizedWallet}
        LIMIT 1
      `

      if (walletRecord.length > 0) {
        console.log("[Discord Callback] Wallet record exists, merging...")

        // Delete the old Discord-only record
        await sql`
          DELETE FROM user_identities 
          WHERE discord_id = ${me.id}
        `

        // Update wallet record with Discord info, preserve existing tips_wallet if present
        await sql`
          UPDATE user_identities SET
            discord_id       = ${me.id},
            discord_username = ${me.username},
            tips_wallet_address = COALESCE(tips_wallet_address, ${oldTipsWallet}),
            token_id = COALESCE(token_id, ${oldTokenId}),
            updated_at       = NOW()
          WHERE wallet_address = ${normalizedWallet}
        `
        console.log("[Discord Callback] Merged records successfully")
      } else {
        console.log("[Discord Callback] No wallet record, updating Discord record with wallet...")

        await sql`
          UPDATE user_identities SET
            wallet_address = ${normalizedWallet},
            discord_username = ${me.username},
            updated_at = NOW()
          WHERE discord_id = ${me.id}
        `
        console.log("[Discord Callback] Updated Discord record with wallet address")
      }
    } else {
      console.log("[Discord Callback] No existing Discord user, checking wallet record...")
      const existingWallet = await sql`
        SELECT id, token_id FROM user_identities 
        WHERE wallet_address = ${normalizedWallet}
        LIMIT 1
      `

      if (existingWallet.length > 0) {
        // Update existing wallet record
        await sql`
          UPDATE user_identities SET
            discord_id       = ${me.id},
            discord_username = ${me.username},
            updated_at       = NOW()
          WHERE wallet_address = ${normalizedWallet}
        `
        console.log("[Discord Callback] Updated existing wallet record")
      } else {
        // Create new record
        console.log("[Discord Callback] Creating new user identity...")
        const tokenIdRows = await sql`
          SELECT token_id FROM code_assignments 
          WHERE wallet_address = ${normalizedWallet}
          LIMIT 1
        `
        const tokenId = tokenIdRows.length ? tokenIdRows[0].token_id : null

        await sql`
          INSERT INTO user_identities (
            discord_id, 
            wallet_address, 
            discord_username, 
            token_id, 
            created_at, 
            updated_at
          )
          VALUES (
            ${me.id}, 
            ${normalizedWallet},
            ${me.username}, 
            ${tokenId}, 
            NOW(), 
            NOW()
          )
        `
        console.log("[Discord Callback] Created new user identity")
      }
    }

    const redirectPath = source === "market" ? "market/profile" : "profile"
    console.log("[Discord Callback] Success! Redirecting to:", `${baseUrl}/${redirectPath}`)
    return NextResponse.redirect(`${baseUrl}/${redirectPath}?success=discord_verified`)
  } catch (e) {
    console.error("[Discord Callback] Caught error:", e)

    let redirectPage = "profile"
    try {
      if (state) {
        const parsed = JSON.parse(Buffer.from(state, "base64").toString())
        const source = parsed.source
        if (source === "superpoker") {
          redirectPage = "superpoker"
        } else if (source === "market") {
          redirectPage = "market/profile"
        }
      }
    } catch {}

    const errorMessage = e instanceof Error ? e.message : String(e)
    const errorDetails = encodeURIComponent(errorMessage.substring(0, 100))
    console.error("[Discord Callback] Redirecting with error:", errorDetails)
    return NextResponse.redirect(`${baseUrl}/${redirectPage}?error=discord_connection_failed&details=${errorDetails}`)
  }
}
