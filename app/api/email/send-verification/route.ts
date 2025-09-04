import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, email } = body

    console.log("[v0] Send verification request:", { walletAddress, email })

    if (!walletAddress || !email) {
      return NextResponse.json({ error: "Wallet address and email are required" }, { status: 400 })
    }

    const walletLc = walletAddress.toLowerCase()
    const emailLc = email.toLowerCase()

    console.log("[v0] Normalized addresses:", { walletLc, emailLc })

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailLc)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check if email is already connected to a different wallet
    console.log("[v0] Checking for existing email connections...")
    const existingEmail = await sql`
      SELECT wallet_address FROM user_identities 
      WHERE email = ${emailLc} AND wallet_address != ${walletLc}
    `

    console.log("[v0] Existing email check result:", existingEmail)

    if (existingEmail.rows.length > 0) {
      console.log("[v0] Email already connected to different wallet:", existingEmail.rows[0].wallet_address)
      return NextResponse.json({ error: "Email already connected to another account" }, { status: 409 })
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const expires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    console.log("[v0] Generated token:", token)
    console.log("[v0] Token expires at:", expires.toISOString())

    // Store verification token with lowercase wallet address
    await sql`
      INSERT INTO email_verifications (email, wallet_address, verification_token, token_hash, token_expires_at, created_at, updated_at)
      VALUES (${emailLc}, ${walletLc}, ${token}, ${tokenHash}, ${expires.toISOString()}, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        verification_token = EXCLUDED.verification_token,
        token_hash = EXCLUDED.token_hash,
        token_expires_at = EXCLUDED.token_expires_at,
        wallet_address = EXCLUDED.wallet_address,
        updated_at = NOW()
    `

    console.log("[v0] Verification token stored successfully")
  } catch (error) {}
}
