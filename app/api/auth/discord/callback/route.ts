export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const origin = url.origin
  const redirectUri = `${origin}/api/auth/discord/callback`

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/profile?error=discord_auth_failed&details=missing_code_or_state`)
  }

  try {
    let walletAddress: string
    let source = "poker"

    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString())
      walletAddress = decoded.walletAddress
      source = decoded.source || "poker"
    } catch (stateError) {
      return NextResponse.redirect(`${origin}/profile?error=discord_auth_failed&details=invalid_state`)
    }

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

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      const errorDetails = `token_${tokenRes.status}_${encodeURIComponent(errorText.substring(0, 50))}`
      return NextResponse.redirect(`${origin}/profile?error=discord_connection_failed&details=${errorDetails}`)
    }

    const token = await tokenRes.json()

    if (!token.access_token) {
      return NextResponse.redirect(`${origin}/profile?error=discord_connection_failed&details=no_access_token`)
    }

    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })

    if (!meRes.ok) {
      const errorDetails = `user_${meRes.status}`
      return NextResponse.redirect(`${origin}/profile?error=discord_connection_failed&details=${errorDetails}`)
    }

    const me = await meRes.json()

    if (source === "superpoker") {
      const existingUser = await sql`
        SELECT * FROM superpoker_users WHERE discord_id = ${me.id} LIMIT 1
      `

      if (existingUser.length === 0) {
        await sql`
          INSERT INTO superpoker_users (discord_id, discord_username, created_at, updated_at)
          VALUES (${me.id}, ${me.username}, NOW(), NOW())
        `
      } else {
        await sql`
          UPDATE superpoker_users 
          SET discord_username = ${me.username}, updated_at = NOW()
          WHERE discord_id = ${me.id}
        `
      }

      const response = NextResponse.redirect(`${origin}/superpoker?success=discord_verified`)
      response.cookies.set("superpoker_discord_id", me.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      })
      return response
    }

    const normalizedWallet = walletAddress.toLowerCase()

    const walletConflict = await sql`
      SELECT discord_id FROM user_identities 
      WHERE wallet_address = ${normalizedWallet}
        AND discord_id IS NOT NULL 
        AND discord_id != ${me.id}
      LIMIT 1
    `

    if (walletConflict.length > 0) {
      const redirectPath = source === "market" ? "market/profile" : "profile"
      return NextResponse.redirect(
        `${origin}/${redirectPath}?error=wallet_already_linked&details=discord_${walletConflict[0].discord_id}`,
      )
    }

    const existingDiscordUser = await sql`
      SELECT wallet_address, tips_wallet_address, token_id FROM user_identities 
      WHERE discord_id = ${me.id} 
      LIMIT 1
    `

    if (existingDiscordUser.length > 0) {
      let tokenId = existingDiscordUser[0].token_id
      if (!tokenId) {
        const tokenIdRows = await sql`
          SELECT token_id FROM user_identities 
          WHERE wallet_address = ${normalizedWallet}
          LIMIT 1
        `
        tokenId = tokenIdRows.length ? tokenIdRows[0].token_id : null
      }

      await sql`
        UPDATE user_identities SET
          wallet_address   = ${normalizedWallet},
          discord_username = ${me.username},
          token_id         = COALESCE(${tokenId}, token_id),
          updated_at       = NOW()
        WHERE discord_id = ${me.id}
      `
    } else {
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
    }

    const redirectPath = source === "market" ? "market/profile" : "profile"
    return NextResponse.redirect(`${origin}/${redirectPath}?success=discord_verified`)
  } catch (e) {
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
    return NextResponse.redirect(`${origin}/${redirectPage}?error=discord_connection_failed&details=${errorDetails}`)
  }
}
