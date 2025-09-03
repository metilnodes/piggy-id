import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, email } = await request.json()

    if (!walletAddress || !email) {
      return NextResponse.json({ error: "Wallet address and email are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check if email is already connected to another wallet
    const existingEmail = await sql`
      SELECT wallet_address FROM user_identities 
      WHERE email = ${email} AND wallet_address != ${walletAddress}
    `

    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "Email already connected to another account" }, { status: 400 })
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    // Store verification request
    await sql`
      INSERT INTO email_verifications (wallet_address, email, verification_token, expires_at)
      VALUES (${walletAddress}, ${email}, ${verificationToken}, ${expiresAt})
      ON CONFLICT (verification_token) DO UPDATE SET
        wallet_address = ${walletAddress},
        email = ${email},
        expires_at = ${expiresAt},
        verified = FALSE,
        updated_at = NOW()
    `

    // Create verification URL
    const origin = new URL(request.url).origin
    const verificationUrl = `${origin}/api/email/verify?token=${verificationToken}`

    // Send verification email
    const { data, error } = await resend.emails.send({
      from: "Piggy ID <noreply@piggydao.eth>",
      to: [email],
      subject: "Verify your email for Piggy ID",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify your email address</h2>
          <p>Click the button below to verify your email address and connect it to your Piggy ID account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 15 minutes. If you didn't request this verification, you can safely ignore this email.
          </p>
          <p style="color: #666; font-size: 12px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            ${verificationUrl}
          </p>
        </div>
      `,
    })

    if (error) {
      console.error("Resend error:", error)
      return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully",
      emailId: data?.id,
    })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
