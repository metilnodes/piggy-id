import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import crypto from "crypto"

export const runtime = "nodejs"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { email, walletAddress, source = "poker" } = await request.json()

    if (!email || !walletAddress) {
      return NextResponse.json({ error: "Email and wallet address required" }, { status: 400 })
    }

    const emailLc = email.toLowerCase().trim()
    const walletLc = walletAddress.toLowerCase()

    const existingVerified = await sql /* sql */`
      SELECT email, wallet_address
      FROM email_verifications
      WHERE email = ${emailLc}
        AND verified = true
      LIMIT 1
    `

    if (existingVerified.length > 0) {
      const existingWallet = existingVerified[0].wallet_address.toLowerCase()
      if (existingWallet === walletLc) {
        // Email already verified for this wallet - return success
        return NextResponse.json(
          {
            message: "Email already connected to this account",
          },
          { status: 200 },
        )
      } else {
        // Email verified for different wallet
        return NextResponse.json(
          {
            error: "Email already connected to another account",
          },
          { status: 409 },
        )
      }
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const expires = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

    // Store verification token
    await sql /* sql */`
      INSERT INTO email_verifications (email, wallet_address, verification_token, token_hash, expires_at, created_at, updated_at)
      VALUES (${emailLc}, ${walletLc}, ${token}, ${tokenHash}, ${expires.toISOString()}, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        verification_token = EXCLUDED.verification_token,
        token_hash = EXCLUDED.token_hash,
        expires_at = EXCLUDED.expires_at,
        wallet_address = EXCLUDED.wallet_address,
        updated_at = NOW()
    `

    // Send verification email
    const origin = request.nextUrl.origin
    const verificationUrl = `${origin}/api/email/verify?token=${token}&source=${source}`

    await resend.emails.send({
      from: "noreply@piggyworld.xyz",
      to: emailLc,
      subject: "Verify your email for Piggy ID",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify your email for Piggy ID</h2>
          <p>Click the link below to verify your email address:</p>
          <a href="${verificationUrl}" style="background: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email
          </a>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            This link will expire in 30 minutes. If you didn't request this verification, you can safely ignore this email.
          </p>
        </div>
      `,
    })

    return NextResponse.json(
      {
        message: "Verification email sent successfully",
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Send verification error:", error)
    return NextResponse.json(
      {
        error: "Failed to send verification email",
      },
      { status: 500 },
    )
  }
}
