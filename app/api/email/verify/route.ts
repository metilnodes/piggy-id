import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.redirect(new URL("/poker?error=invalid_token", request.url))
    }

    // Find verification record
    const verification = await sql`
      SELECT * FROM email_verifications 
      WHERE verification_token = ${token} 
      AND expires_at > NOW() 
      AND verified = FALSE
    `

    if (verification.length === 0) {
      return NextResponse.redirect(new URL("/poker?error=token_expired", request.url))
    }

    const { wallet_address, email } = verification[0]

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

    return NextResponse.redirect(new URL("/poker?success=email_verified", request.url))
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.redirect(new URL("/poker?error=verification_failed", request.url))
  }
}
