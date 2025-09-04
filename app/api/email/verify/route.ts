import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    console.log("[v0] Email verification request received") // Added debugging

    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    console.log("[v0] Verification token:", token) // Added token logging

    if (!token) {
      console.log("[v0] No token provided") // Added error logging
      return NextResponse.redirect(new URL("/poker?error=invalid_token", request.url))
    }

    // Find verification record
    const verification = await sql`
      SELECT * FROM email_verifications 
      WHERE verification_token = ${token} 
      AND expires_at > NOW() 
      AND verified = FALSE
    `

    console.log("[v0] Verification record found:", verification.length > 0) // Added verification status logging

    if (verification.length === 0) {
      console.log("[v0] Token expired or already used") // Added error logging
      return NextResponse.redirect(new URL("/poker?error=token_expired", request.url))
    }

    const { wallet_address, email } = verification[0]
    console.log("[v0] Verifying email:", email, "for wallet:", wallet_address) // Added verification details logging

    // Mark as verified
    await sql`
      UPDATE email_verifications 
      SET verified = TRUE, updated_at = NOW()
      WHERE verification_token = ${token}
    `

    // Update or create user identity with verified email
    await sql`
      INSERT INTO user_identities (wallet_address, email, created_at, updated_at)
      VALUES (${wallet_address}, ${email}, NOW(), NOW())
      ON CONFLICT (wallet_address) DO UPDATE SET
        email = ${email},
        updated_at = NOW()
    `

    // Clean up old verification records for this wallet
    await sql`
      DELETE FROM email_verifications 
      WHERE wallet_address = ${wallet_address} 
      AND verification_token != ${token}
    `

    console.log("[v0] Email verification completed successfully") // Added success logging
    return NextResponse.redirect(new URL("/poker?success=email_verified", request.url))
  } catch (error) {
    console.error("[v0] Email verification error:", error) // Added v0 prefix to error logging
    return NextResponse.redirect(new URL("/poker?error=verification_failed", request.url))
  }
}
