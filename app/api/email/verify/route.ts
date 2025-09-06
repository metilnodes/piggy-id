import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import crypto from "crypto"

export const runtime = "nodejs"
const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")?.trim()
    if (!token) {
      return NextResponse.redirect(new URL("/poker?error=verification_failed", request.url))
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")

    // 1) Find current verification record by token/hash
    const rows = await sql /* sql */`
      SELECT id, email, wallet_address
      FROM email_verifications
      WHERE (verification_token = ${token} OR token_hash = ${tokenHash})
        AND expires_at > NOW()
      ORDER BY created_at DESC
      LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.redirect(new URL("/poker?error=verification_expired", request.url))
    }

    const { email, wallet_address } = rows[0]
    const walletLc = wallet_address.toLowerCase()
    const emailLc = email.toLowerCase()

    // 2) Reset all verifications for this wallet and confirm current one
    await sql /* sql */`
      UPDATE email_verifications
      SET verified = false, updated_at = NOW()
      WHERE wallet_address = ${walletLc}
    `
    await sql /* sql */`
      UPDATE email_verifications
      SET verified = true, updated_at = NOW()
      WHERE (verification_token = ${token} OR token_hash = ${tokenHash})
    `

    // 3) Update user_identities (upsert)
    await sql /* sql */`
      INSERT INTO user_identities (wallet_address, email, created_at, updated_at)
      VALUES (${walletLc}, ${emailLc}, NOW(), NOW())
      ON CONFLICT (wallet_address) DO UPDATE
      SET email = EXCLUDED.email,
          updated_at = NOW()
    `

    // 4) Clean up expired tokens for this wallet
    await sql /* sql */`
      DELETE FROM email_verifications
      WHERE wallet_address = ${walletLc}
        AND verified = false
        AND expires_at < NOW()
    `

    return NextResponse.redirect(new URL("/poker?success=email_verified", request.url))
  } catch (e) {
    return NextResponse.redirect(new URL("/poker?error=verification_failed", request.url))
  }
}
