import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import crypto from "crypto"
import { Resend } from "resend"

export const runtime = "nodejs"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, walletAddress } = body

    console.log("[v0] Send verification request:", { email, walletAddress })

    if (!email || !walletAddress) {
      return NextResponse.json({ error: "Email and wallet address required" }, { status: 400 })
    }

    const emailLc = email.toLowerCase().trim()
    const walletLc = walletAddress.toLowerCase()

    const existingVerified = await sql`
      SELECT * FROM email_verifications 
      WHERE email = ${emailLc} AND verified = true
    `

    if (existingVerified.length > 0) {
      const verifiedRecord = existingVerified[0]
      console.log("[v0] Email already verified for wallet:", verifiedRecord.wallet_address)

      if (verifiedRecord.wallet_address.toLowerCase() === walletLc) {
        console.log("[v0] Email already verified for this wallet - should show connected state")
        return NextResponse.json(
          {
            error: "Email already verified for this account",
          },
          { status: 400 },
        )
      } else {
        console.log("[v0] Email verified for different wallet")
        return NextResponse.json(
          {
            error: "Email already connected to another account",
          },
          { status: 409 },
        )
      }
    }

    const existingPending = await sql`
      SELECT * FROM email_verifications 
      WHERE email = ${emailLc} AND wallet_address = ${walletLc} AND verified = false AND expires_at > NOW()
    `

    if (existingPending.length > 0) {
      console.log("[v0] Pending verification already exists, not sending duplicate")
      return NextResponse.json({
        message: "Verification email already sent. Please check your inbox.",
      })
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    console.log("[v0] Generated token:", token)
    console.log("[v0] Token expires at:", expires)

    // Store verification token
    await sql`
      INSERT INTO email_verifications (email, wallet_address, verification_token, token_hash, expires_at, created_at, updated_at)
      VALUES (${emailLc}, ${walletLc}, ${token}, ${tokenHash}, ${expires.toISOString()}, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        verification_token = EXCLUDED.verification_token,
        token_hash = EXCLUDED.token_hash,
        expires_at = EXCLUDED.expires_at,
        wallet_address = EXCLUDED.wallet_address,
        verified = false,
        updated_at = NOW()
    `

    console.log("[v0] Verification token stored in database")

    // Send verification email
    const verificationUrl = `${new URL(request.url).origin}/api/email/verify?token=${token}`
    console.log("[v0] Verification URL:", verificationUrl)

    const emailResult = await resend.emails.send({
      from: "noreply@piggyworld.xyz",
      to: [email],
      subject: "Verify your email address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify your email address</h2>
          <p>Click the link below to verify your email address and connect it to your account:</p>
          <a href="${verificationUrl}" style="display: inline-block; background-color: #007cba; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
            Verify Email Address
          </a>
          <p style="color: #666; font-size: 14px;">This link will expire in 15 minutes.</p>
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
    return NextResponse.json({
      message: "Verification email sent successfully",
    })
  } catch (error) {
    console.error("[v0] Send verification error:", error)
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
  }
}
