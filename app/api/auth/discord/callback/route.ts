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

  console.log("[v0] ===== DISCORD CALLBACK START =====")
  console.log("[v0] Full URL:", request.url)
  console.log("[v0] Origin:", origin)
  console.log("[v0] Redirect URI:", redirectUri)
  console.log("[v0] Code:", code ? "present" : "missing")
  console.log("[v0] State:", state ? "present" : "missing")
  console.log("[v0] CLIENT_ID:", process.env.DISCORD_CLIENT_ID ? "set" : "MISSING")
  console.log("[v0] CLIENT_SECRET:", process.env.DISCORD_CLIENT_SECRET ? "set" : "MISSING")

  if (!code || !state) {
    console.log("[v0] ERROR: Missing code or state parameter")
    return NextResponse.redirect(`${origin}/profile?error=discord_auth_failed`)
  }

  try {
    let walletAddress: string
    let source = "poker"

    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString())
      walletAddress = decoded.walletAddress
      source = decoded.source || "poker"
      console.log("[v0] Decoded state - wallet:", walletAddress)
      console.log("[v0] Decoded state - source:", source)
    } catch (stateError) {
      console.error("[v0] ERROR: Failed to decode state:", stateError)
      throw new Error("Invalid state parameter")
    }

    console.log("[v0] Fetching Discord token...")
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

    console.log("[v0] Token response status:", tokenRes.status)

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      console.error("[v0] ERROR: Discord token fetch failed")
      console.error("[v0] Status:", tokenRes.status)
      console.error("[v0] Response:", errorText)
      throw new Error(`Token fetch failed: ${tokenRes.status}`)
    }

    const token = await tokenRes.json()
    console.log("[v0] Token received:", token.access_token ? "yes" : "no")

    if (!token.access_token) {
      console.error("[v0] ERROR: No access_token in response:", JSON.stringify(token))
      throw new Error("No access_token in Discord response")
    }

    console.log("[v0] Fetching Discord user info...")
    const meRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    })

    console.log("[v0] User info response status:", meRes.status)

    if (!meRes.ok) {
      const errorText = await meRes.text()
      console.error("[v0] ERROR: Discord user fetch failed")
      console.error("[v0] Status:", meRes.status)
      console.error("[v0] Response:", errorText)
      throw new Error(`User fetch failed: ${meRes.status}`)
    }

    const me = await meRes.json()
    console.log("[v0] Discord user fetched - ID:", me.id, "Username:", me.username)

    if (source === "superpoker") {
      console.log("[v0] Processing superpoker connection...")
      // Check if Discord user already exists in superpoker_users
      const existingUser = await sql`
        SELECT * FROM superpoker_users WHERE discord_id = ${me.id} LIMIT 1
      `

      if (existingUser.length === 0) {
        await sql`
          INSERT INTO superpoker_users (discord_id, discord_username, created_at, updated_at)
          VALUES (${me.id}, ${me.username}, NOW(), NOW())
        `
        console.log("[v0] Superpoker user created")
      } else {
        await sql`
          UPDATE superpoker_users 
          SET discord_username = ${me.username}, updated_at = NOW()
          WHERE discord_id = ${me.id}
        `
        console.log("[v0] Superpoker user updated")
      }

      const response = NextResponse.redirect(`${origin}/superpoker?success=discord_verified`)
      response.cookies.set("superpoker_discord_id", me.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
      })
      console.log("[v0] Redirecting to superpoker with success")
      return response
    } else {
      console.log("[v0] Processing regular profile connection...")

      console.log("[v0] Checking for wallet conflicts...")
      const walletConflict = await sql`
        SELECT discord_id FROM user_identities 
        WHERE wallet_address = ${walletAddress.toLowerCase()} 
          AND discord_id IS NOT NULL 
          AND discord_id != ${me.id}
        LIMIT 1
      `

      if (walletConflict.length > 0) {
        console.error(
          `[v0] ERROR: Wallet ${walletAddress} already linked to discord_id ${walletConflict[0].discord_id}`,
        )
        const errorParam = `wallet_already_linked_to_discord_${walletConflict[0].discord_id}`
        const redirectPath = source === "market" ? "market/profile" : "profile"
        return NextResponse.redirect(`${origin}/${redirectPath}?error=${errorParam}`)
      }

      console.log("[v0] No wallet conflict found")

      console.log("[v0] Checking if discord_id exists in database...")
      const existingDiscordUser = await sql`
        SELECT wallet_address, tips_wallet_address, token_id FROM user_identities 
        WHERE discord_id = ${me.id} 
        LIMIT 1
      `

      if (existingDiscordUser.length > 0) {
        console.log("[v0] Discord user exists - updating record")
        console.log("[v0] Existing wallet:", existingDiscordUser[0].wallet_address)
        console.log("[v0] Existing tips_wallet:", existingDiscordUser[0].tips_wallet_address)

        let tokenId = existingDiscordUser[0].token_id
        if (!tokenId) {
          const tokenIdRows = await sql`
            SELECT token_id FROM user_identities 
            WHERE wallet_address = ${walletAddress.toLowerCase()} 
            LIMIT 1
          `
          tokenId = tokenIdRows.length ? tokenIdRows[0].token_id : null
          console.log("[v0] Token ID from wallet lookup:", tokenId)
        }

        await sql`
          UPDATE user_identities SET
            wallet_address   = ${walletAddress.toLowerCase()},
            discord_username = ${me.username},
            token_id         = COALESCE(${tokenId}, token_id),
            updated_at       = NOW()
          WHERE discord_id = ${me.id}
        `
        console.log("[v0] Database UPDATE successful")
      } else {
        console.log("[v0] Discord user does not exist - inserting new record")

        const tokenIdRows = await sql`
          SELECT token_id FROM code_assignments 
          WHERE wallet_address = ${walletAddress.toLowerCase()} 
          LIMIT 1
        `
        const tokenId = tokenIdRows.length ? tokenIdRows[0].token_id : null
        console.log("[v0] Token ID from code_assignments:", tokenId)

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
        `
        console.log("[v0] Database INSERT successful")
      }

      const redirectPath = source === "market" ? "market/profile" : "profile"
      console.log("[v0] Redirecting to:", `${origin}/${redirectPath}?success=discord_verified`)
      console.log("[v0] ===== DISCORD CALLBACK SUCCESS =====")
      return NextResponse.redirect(`${origin}/${redirectPath}?success=discord_verified`)
    }
  } catch (e) {
    console.error("[v0] ===== DISCORD CALLBACK ERROR =====")
    console.error("[v0] Error type:", e instanceof Error ? e.constructor.name : typeof e)
    console.error("[v0] Error message:", e instanceof Error ? e.message : String(e))
    console.error("[v0] Error stack:", e instanceof Error ? e.stack : "No stack trace")

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
    } catch (parseError) {
      console.error("[v0] Failed to parse state for error redirect:", parseError)
    }

    console.log("[v0] Redirecting to error page:", `${origin}/${redirectPage}?error=discord_connection_failed`)
    return NextResponse.redirect(`${origin}/${redirectPage}?error=discord_connection_failed`)
  }
}
