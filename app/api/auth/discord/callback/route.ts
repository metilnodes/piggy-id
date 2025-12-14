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
    return NextResponse.redirect(`${origin}/poker?error=discord_auth_failed`)
  }

  try {
    const { walletAddress, source = "poker" } = JSON.parse(Buffer.from(state, "base64").toString())

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
    if (!tokenRes.ok) throw new Error(await tokenRes.text())
    const token = await tokenRes.json()
    if (!token.access_token) throw new Error("No access_token")

    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })
    if (!meRes.ok) throw new Error(await meRes.text())
    const me = await meRes.json() // { id, username, global_name, avatar, ... }

    if (source === "superpoker") {
      // Check if Discord user already exists in superpoker_users
      const existingUser = await sql`
        SELECT * FROM superpoker_users WHERE discord_id = ${me.id} LIMIT 1
      `

      if (existingUser.length === 0) {
        // Insert new superpoker user
        await sql`
          INSERT INTO superpoker_users (discord_id, discord_username, created_at, updated_at)
          VALUES (${me.id}, ${me.username}, NOW(), NOW())
        `
      } else {
        // Update existing user
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
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
      return response
    } else {
      // 1) Check if wallet_address is already linked to a DIFFERENT discord_id
      const walletConflict = await sql`
        SELECT discord_id FROM user_identities 
        WHERE wallet_address = ${walletAddress.toLowerCase()} 
          AND discord_id IS NOT NULL 
          AND discord_id != ${me.id}
        LIMIT 1
      `

      if (walletConflict.length > 0) {
        console.error(
          `[discord callback] Wallet ${walletAddress} already linked to discord_id ${walletConflict[0].discord_id}`,
        )
        const errorParam = `wallet_already_linked_to_discord_${walletConflict[0].discord_id}`
        if (source === "piggyvegas") {
          return NextResponse.redirect(`${origin}/piggyvegas/profile?error=${errorParam}`)
        } else if (source === "market") {
          return NextResponse.redirect(`${origin}/market/profile?error=${errorParam}`)
        } else {
          return NextResponse.redirect(`${origin}/poker?error=${errorParam}`)
        }
      }

      // 2) Get token_id from existing record or code_assignments
      const tokenIdRows = await sql`
        SELECT token_id FROM user_identities WHERE wallet_address = ${walletAddress.toLowerCase()} LIMIT 1
      `
      const tokenId = tokenIdRows.length ? tokenIdRows[0].token_id : null

      // 3) UPSERT by discord_id (preserves tips_wallet_address if exists)
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
          ${walletAddress.toLowerCase()}, 
          ${me.username}, 
          ${tokenId}, 
          NOW(), 
          NOW()
        )
        ON CONFLICT (discord_id) DO UPDATE SET
          wallet_address   = EXCLUDED.wallet_address,
          discord_username = EXCLUDED.discord_username,
          token_id         = COALESCE(EXCLUDED.token_id, user_identities.token_id),
          updated_at       = NOW()
          -- tips_wallet_address is NOT updated - it stays as is
      `

      if (source === "piggyvegas") {
        return NextResponse.redirect(`${origin}/piggyvegas/profile?success=discord_verified`)
      } else if (source === "market") {
        return NextResponse.redirect(`${origin}/market/profile?success=discord_verified`)
      } else {
        return NextResponse.redirect(`${origin}/poker?success=discord_verified`)
      }
    }
  } catch (e) {
    console.error("[discord callback] error:", e)
    const redirectPage = state
      ? JSON.parse(Buffer.from(state, "base64").toString()).source === "superpoker"
        ? "superpoker"
        : JSON.parse(Buffer.from(state, "base64").toString()).source === "piggyvegas"
          ? "piggyvegas/profile"
          : JSON.parse(Buffer.from(state, "base64").toString()).source === "market"
            ? "market/profile"
            : "poker"
      : "poker"
    return NextResponse.redirect(`${origin}/${redirectPage}?error=discord_connection_failed`)
  }
}
