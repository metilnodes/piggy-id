import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { getOwnedTokenIds } from "@/lib/piggy/checkHolder"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("address")

    console.log("[v0] Identity API GET request for address:", walletAddress)

    if (!walletAddress) {
      return NextResponse.json({ error: "Wallet address required" }, { status: 400 })
    }

    console.log("[v0] Querying user_identities table for wallet:", walletAddress.toLowerCase())

    let result = await sql`
      SELECT * FROM user_identities 
      WHERE wallet_address = ${walletAddress.toLowerCase()}
    `

    if (result[0] && !result[0].token_id) {
      console.log("[v0] No token_id found, checking code_assignments table")

      const codeAssignment = await sql`
        SELECT token_id FROM code_assignments 
        WHERE wallet_address = ${walletAddress.toLowerCase()}
        LIMIT 1
      `

      if (codeAssignment[0]?.token_id) {
        console.log("[v0] Found token_id in code_assignments:", codeAssignment[0].token_id)

        await sql`
          UPDATE user_identities 
          SET token_id = ${codeAssignment[0].token_id}, updated_at = NOW()
          WHERE wallet_address = ${walletAddress.toLowerCase()}
        `

        result = await sql`
          SELECT * FROM user_identities 
          WHERE wallet_address = ${walletAddress.toLowerCase()}
        `
      } else {
        console.log("[v0] Not found in code_assignments, checking blockchain...")
        try {
          const ownedTokens = await getOwnedTokenIds(walletAddress)

          if (ownedTokens.length > 0) {
            const firstTokenId = Number(ownedTokens[0])
            console.log("[v0] Found NFT on-chain! Token ID:", firstTokenId)

            await sql`
              UPDATE user_identities 
              SET token_id = ${firstTokenId}, updated_at = NOW()
              WHERE wallet_address = ${walletAddress.toLowerCase()}
            `

            result = await sql`
              SELECT * FROM user_identities 
              WHERE wallet_address = ${walletAddress.toLowerCase()}
            `
          } else {
            console.log("[v0] No NFTs found on-chain for this wallet")
          }
        } catch (blockchainError) {
          console.error("[v0] Error checking blockchain:", blockchainError)
          // Continue without blockchain data if check fails
        }
      }
    }

    if (!result[0]) {
      console.log("[v0] No user_identities record found, checking code_assignments")

      const codeAssignment = await sql`
        SELECT token_id FROM code_assignments 
        WHERE wallet_address = ${walletAddress.toLowerCase()}
        LIMIT 1
      `

      if (codeAssignment[0]?.token_id) {
        console.log("[v0] Creating user_identities record with token_id:", codeAssignment[0].token_id)

        await sql`
          INSERT INTO user_identities (wallet_address, token_id, created_at, updated_at)
          VALUES (${walletAddress.toLowerCase()}, ${codeAssignment[0].token_id}, NOW(), NOW())
        `

        result = await sql`
          SELECT * FROM user_identities 
          WHERE wallet_address = ${walletAddress.toLowerCase()}
        `
      } else {
        console.log("[v0] Wallet not in DB, checking blockchain...")
        try {
          const ownedTokens = await getOwnedTokenIds(walletAddress)

          if (ownedTokens.length > 0) {
            const firstTokenId = Number(ownedTokens[0])
            console.log("[v0] Found NFT on-chain for new wallet! Token ID:", firstTokenId)

            await sql`
              INSERT INTO user_identities (wallet_address, token_id, created_at, updated_at)
              VALUES (${walletAddress.toLowerCase()}, ${firstTokenId}, NOW(), NOW())
            `

            result = await sql`
              SELECT * FROM user_identities 
              WHERE wallet_address = ${walletAddress.toLowerCase()}
            `
          } else {
            console.log("[v0] No NFTs found on-chain for new wallet")
          }
        } catch (blockchainError) {
          console.error("[v0] Error checking blockchain for new wallet:", blockchainError)
        }
      }
    }

    console.log("[v0] Identity query result:", result)
    console.log("[v0] Identity result length:", result.length)
    if (result[0]) {
      console.log("[v0] Identity token_id:", result[0].token_id)
      console.log("[v0] Identity email field:", result[0].email)
      console.log("[v0] Identity discord fields:", result[0].discord_id, result[0].discord_username)
      console.log("[v0] Identity twitter fields:", result[0].twitter_id, result[0].twitter_username)
      console.log("[v0] Identity farcaster fields:", result[0].platform_user_id, result[0].username)
    }

    if (result[0]) {
      const identity = result[0]

      // Map Farcaster data from platform columns to specific fields
      const farcasterRecord = await sql`
        SELECT platform_user_id, username, display_name, avatar_url 
        FROM user_identities 
        WHERE wallet_address = ${walletAddress.toLowerCase()} 
        AND platform = 'farcaster'
        LIMIT 1
      `

      if (farcasterRecord[0]) {
        identity.farcaster_id = farcasterRecord[0].platform_user_id
        identity.farcaster_username = farcasterRecord[0].username
        identity.farcaster_display_name = farcasterRecord[0].display_name
        identity.farcaster_avatar_url = farcasterRecord[0].avatar_url
      }
    }

    return NextResponse.json({
      identity: result[0] || null,
    })
  } catch (error) {
    console.error("[v0] Error fetching identity - Full error:", error)
    console.error("[v0] Error message:", error.message)
    console.error("[v0] Error code:", error.code)

    if (error.message?.includes('relation "user_identities" does not exist')) {
      console.error("[v0] user_identities table does not exist! Run scripts/005_add_identity_connections.sql")
      return NextResponse.json(
        {
          error: "Database not initialized. Please run identity connections script.",
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ error: "Failed to fetch identity" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, tokenId, type, data } = body

    if (!walletAddress || !type || !data) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    let finalTokenId = tokenId
    if (!finalTokenId) {
      const codeAssignment = await sql`
        SELECT token_id FROM code_assignments 
        WHERE wallet_address = ${walletAddress.toLowerCase()}
        LIMIT 1
      `
      finalTokenId = codeAssignment[0]?.token_id || null
      console.log("[v0] Auto-fetched token_id from code_assignments:", finalTokenId)
    }

    await sql`
      INSERT INTO user_identities (wallet_address, token_id)
      VALUES (${walletAddress.toLowerCase()}, ${finalTokenId})
      ON CONFLICT (wallet_address) 
      DO UPDATE SET 
        token_id = COALESCE(${finalTokenId}, user_identities.token_id),
        updated_at = NOW()
    `

    if (type === "username") {
      if (!data.username || data.username.trim().length === 0) {
        return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 })
      }

      const existingUsername = await sql`
        SELECT wallet_address FROM user_identities 
        WHERE LOWER(username) = LOWER(${data.username.trim()})
        AND wallet_address != ${walletAddress.toLowerCase()}
        LIMIT 1
      `

      if (existingUsername.length > 0) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 })
      }

      await sql`
        UPDATE user_identities 
        SET username = ${data.username.trim()},
            updated_at = NOW()
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `
    } else if (type === "discord") {
      const existingDiscord = await sql`
        SELECT wallet_address FROM user_identities 
        WHERE discord_id = ${data.id}
        AND wallet_address != ${walletAddress.toLowerCase()}
        LIMIT 1
      `

      if (existingDiscord.length > 0) {
        return NextResponse.json(
          { error: "This Discord account is already connected to another user" },
          { status: 409 },
        )
      }

      await sql`
        UPDATE user_identities 
        SET discord_id = ${data.id}, 
            discord_username = ${data.username},
            updated_at = NOW()
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `
    } else if (type === "twitter") {
      const existingTwitter = await sql`
        SELECT wallet_address FROM user_identities 
        WHERE twitter_id = ${data.id}
        AND wallet_address != ${walletAddress.toLowerCase()}
        LIMIT 1
      `

      if (existingTwitter.length > 0) {
        return NextResponse.json(
          { error: "This Twitter account is already connected to another user" },
          { status: 409 },
        )
      }

      await sql`
        UPDATE user_identities 
        SET twitter_id = ${data.id}, 
            twitter_username = ${data.username},
            updated_at = NOW()
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `
    } else if (type === "email") {
      if (!data.email || !data.email.includes("@")) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
      }

      const existingEmail = await sql`
        SELECT wallet_address FROM user_identities 
        WHERE LOWER(email) = LOWER(${data.email})
        AND wallet_address != ${walletAddress.toLowerCase()}
        LIMIT 1
      `

      if (existingEmail.length > 0) {
        return NextResponse.json({ error: "Email is already taken" }, { status: 409 })
      }

      await sql`
        UPDATE user_identities 
        SET email = ${data.email},
            updated_at = NOW()
        WHERE wallet_address = ${walletAddress.toLowerCase()}
      `
    } else if (type === "farcaster") {
      const existingFarcaster = await sql`
        SELECT wallet_address FROM user_identities 
        WHERE platform = 'farcaster' 
        AND platform_user_id = ${data.fid}
        AND wallet_address != ${walletAddress.toLowerCase()}
        LIMIT 1
      `

      if (existingFarcaster.length > 0) {
        return NextResponse.json(
          { error: "This Farcaster account is already connected to another user" },
          { status: 409 },
        )
      }

      await sql`
        INSERT INTO user_identities 
          (wallet_address, platform, platform_user_id, username, display_name, avatar_url, token_id, created_at, updated_at)
        VALUES 
          (${walletAddress.toLowerCase()}, 'farcaster', ${data.fid}, ${data.username}, ${data.displayName}, ${data.avatarUrl}, ${finalTokenId}, NOW(), NOW())
        ON CONFLICT (wallet_address, platform) 
        DO UPDATE SET 
          platform_user_id = ${data.fid},
          username = ${data.username},
          display_name = ${data.displayName},
          avatar_url = ${data.avatarUrl},
          token_id = COALESCE(${finalTokenId}, user_identities.token_id),
          updated_at = NOW()
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating identity:", error)

    if (error.message?.includes("duplicate key") || error.code === "23505") {
      if (error.message?.includes("username")) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 })
      }
      if (error.message?.includes("email")) {
        return NextResponse.json({ error: "Email is already taken" }, { status: 409 })
      }
      if (error.message?.includes("discord")) {
        return NextResponse.json(
          { error: "This Discord account is already connected to another user" },
          { status: 409 },
        )
      }
      if (error.message?.includes("twitter")) {
        return NextResponse.json(
          { error: "This Twitter account is already connected to another user" },
          { status: 409 },
        )
      }
      if (error.message?.includes("platform")) {
        return NextResponse.json({ error: "This social account is already connected to another user" }, { status: 409 })
      }
      return NextResponse.json({ error: "This value is already in use" }, { status: 409 })
    }

    return NextResponse.json({ error: "Failed to update identity" }, { status: 500 })
  }
}
