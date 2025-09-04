import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import crypto from "crypto"

export const runtime = "nodejs"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Send verification request received")

    const body = await request.json()
    const { email, walletAddress } = body

    console.log("[v0] Verification request for email:", email, "wallet:", walletAddress)

    if (!email || !walletAddress) {
      return NextResponse.json({ error: "Email and wallet address required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const emailLc = email.toLowerCase()
    const walletLc = walletAddress.toLowerCase()

    // Check if email is already connected to a different wallet
    const existingEmail = await sql`
      SELECT wallet_address FROM user_identities 
      WHERE email = ${emailLc} AND wallet_address != ${walletLc}
    `

    if (existingEmail.length > 0) {
      console.log("[v0] Email already connected to different wallet")
      return NextResponse.json({ error: "Email already connected to another account" }, { status: 409 })
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const expires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    console.log("[v0] Generated token for verification")

    // Store verification data
    await sql`
      INSERT INTO email_verifications (email, wallet_address, verification_token, token_hash, expires_at, created_at, updated_at)
      VALUES (${emailLc}, ${walletLc}, ${token}, ${tokenHash}, ${expires.toISOString()}, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        verification_token = EXCLUDED.verification_token,
        token_hash = EXCLUDED.token_hash,
        expires_at = EXCLUDED.expires_at,
        wallet_address = EXCLUDED.wallet_address,
        updated_at = NOW()
    `

    console.log("[v0] Stored verification data in database")

    // Send verification email
    const verificationUrl = `${new URL(request.url).origin}/api/email/verify?token=${token}`

    const emailResult = await resend.emails.send({
      from: "id@piggyworld.xyz",
      to: [email],
      subject: "Verify your email for Piggy ID",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email</h2>
          <p>Click the link below to verify your email address and connect it to your Piggy ID account:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">
            Verify Email Address
          </a>
          <p style="color: #666; font-size: 14px;">This link will expire in 30 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this verification, you can safely ignore this email.</p>
        </div>
      `,
    })

    console.log("[v0] Resend API response:", emailResult)

    if (emailResult.error) {
      console.error("[v0] Resend API error:", emailResult.error)
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
    }

    console.log("[v0] Verification email sent successfully")
    return NextResponse.json({ success: true, message: "Verification email sent" })
  } catch (error) {
    console.error("[v0] Send verification error:", error)
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
  }
}
