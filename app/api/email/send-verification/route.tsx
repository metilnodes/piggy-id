import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@vercel/postgres"
import crypto from "crypto"
import { Resend } from "resend"

export const runtime = "nodejs"

const resend = new Resend(process.env.RESEND_API_KEY)

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

    // Get the origin for the verification link
    const origin = request.nextUrl.origin
    const verificationUrl = `${origin}/api/email/verify?token=${token}`

    console.log("[v0] Sending verification email to:", emailLc)
    console.log("[v0] Verification URL:", verificationUrl)

    // Send verification email using Resend
    const emailResult = await resend.emails.send({
      from: "id@piggyworld.xyz",
      to: [emailLc],
      subject: "Verify your email for Piggy ID",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email Address</h2>
          <p>Click the link below to verify your email address and connect it to your Piggy ID account:</p>
          <div style="margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 30 minutes. If you didn't request this verification, you can safely ignore this email.
          </p>
          <p style="color: #666; font-size: 14px;">
            Wallet Address: ${walletAddress}
          </p>
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
      success: true,
      message: "Verification email sent successfully",
    })
  } catch (error) {
    console.error("[v0] Send verification error:", error)
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
  }
}
