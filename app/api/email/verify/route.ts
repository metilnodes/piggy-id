import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import crypto from "crypto"

export const runtime = "nodejs"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Email verification request received")

    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")?.trim()

    console.log("[v0] Verification token:", token)

    if (!token) {
      console.log("[v0] No token provided")
      return NextResponse.redirect(new URL("/poker?error=missing_token", request.url))
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    const verification = await sql`
      SELECT email, wallet_address, verified, expires_at, verification_token, token_hash
      FROM email_verifications
      WHERE (verification_token = ${token} OR token_hash = ${tokenHash})
      AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `

    console.log("[v0] Verification record found:", verification.length > 0)

    if (verification.length === 0) {
      console.log("[v0] Token not found or expired")
      return NextResponse.redirect(new URL("/poker?error=verification_expired", request.url))
    }

    const { wallet_address, email } = verification[0]
    console.log("[v0] Verifying email:", email, "for wallet:", wallet_address)

    await sql`
      UPDATE email_verifications
      SET verified = TRUE,
          verification_token = NULL,
          token_hash = NULL,
          updated_at = NOW()
      WHERE email = ${email} AND wallet_address = ${wallet_address}
    `

    await sql`
      INSERT INTO user_identities (
        wallet_address, platform, platform_user_id, username, display_name, avatar_url, created_at, updated_at
      )
      VALUES (
        ${wallet_address.toLowerCase()},
        'email',
        ${email},
        ${email},
        ${email},
        NULL,
        NOW(), NOW()
      )
      ON CONFLICT (wallet_address, platform)
      DO UPDATE SET
        platform_user_id = EXCLUDED.platform_user_id,
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        updated_at = NOW()
    `

    console.log("[v0] Email verification completed successfully")
    return NextResponse.redirect(new URL("/poker?email_connected=true", request.url))
  } catch (error) {
    console.error("[v0] Email verification error:", error)
    return NextResponse.redirect(new URL("/poker?error=verification_failed", request.url))
  }
}
