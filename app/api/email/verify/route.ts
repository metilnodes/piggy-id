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
    console.log("[v0] Token hash:", tokenHash)

    const verification = await sql`
      SELECT email, wallet_address, verified, expires_at, verification_token, token_hash
      FROM email_verifications
      WHERE (verification_token = ${token} OR token_hash = ${tokenHash})
      AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `

    console.log("[v0] Verification record found:", verification.length > 0)
    if (verification.length > 0) {
      console.log("[v0] Verification record details:", verification[0])
    }

    if (verification.length === 0) {
      console.log("[v0] Token not found or expired")
      return NextResponse.redirect(new URL("/poker?error=verification_expired", request.url))
    }

    const { wallet_address, email } = verification[0]
    console.log("[v0] Verifying email:", email, "for wallet:", wallet_address)
    console.log("[v0] Wallet address (original):", wallet_address)
    console.log("[v0] Wallet address (lowercase):", wallet_address.toLowerCase())

    const updateResult = await sql`
      UPDATE email_verifications
      SET verified = TRUE,
          verification_token = NULL,
          token_hash = NULL,
          updated_at = NOW()
      WHERE email = ${email} AND wallet_address = ${wallet_address}
    `
    console.log("[v0] Email verification update result:", updateResult)

    console.log("[v0] Creating/updating user_identities record...")
    const identityResult = await sql`
      INSERT INTO user_identities (wallet_address, email, created_at, updated_at)
      VALUES (${wallet_address.toLowerCase()}, ${email}, NOW(), NOW())
      ON CONFLICT (wallet_address) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        updated_at = NOW()
    `
    console.log("[v0] User identity upsert result:", identityResult)

    const verifyRecord = await sql`
      SELECT * FROM user_identities 
      WHERE wallet_address = ${wallet_address.toLowerCase()}
    `
    console.log("[v0] Verification - user_identities record:", verifyRecord)

    console.log("[v0] Email verification completed successfully")
    return NextResponse.redirect(new URL("/poker?success=email_verified", request.url))
  } catch (error) {
    console.error("[v0] Email verification error:", error)
    console.error("[v0] Error details:", error.message)
    console.error("[v0] Error stack:", error.stack)
    return NextResponse.redirect(new URL("/poker?error=verification_failed", request.url))
  }
}
