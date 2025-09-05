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

      return NextResponse.redirect(`${origin}/superpoker?success=discord_verified`)
    } else {
      // Original poker logic
      const tokenIdRows = await sql`
        SELECT token_id FROM user_identities WHERE wallet_address = ${walletAddress.toLowerCase()} LIMIT 1
      `
      const tokenId = tokenIdRows.length ? tokenIdRows[0].token_id : null

      await sql /* sql */`
        INSERT INTO user_identities (wallet_address, discord_id, discord_username, token_id, created_at, updated_at)
        VALUES (${walletAddress.toLowerCase()}, ${me.id}, ${me.username}, ${tokenId}, NOW(), NOW())
        ON CONFLICT (wallet_address) DO UPDATE SET
          discord_id       = EXCLUDED.discord_id,
          discord_username = EXCLUDED.discord_username,
          token_id         = COALESCE(EXCLUDED.token_id, user_identities.token_id),
          updated_at       = NOW()
      `

      return NextResponse.redirect(`${origin}/poker?success=discord_verified`)
    }
  } catch (e) {
    console.error("[discord callback] error:", e)
    const redirectPage = state
      ? JSON.parse(Buffer.from(state, "base64").toString()).source === "superpoker"
        ? "superpoker"
        : "poker"
      : "poker"
    return NextResponse.redirect(`${origin}/${redirectPage}?error=discord_connection_failed`)
  }
}
