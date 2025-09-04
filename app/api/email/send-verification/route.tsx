import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Email verification request received")

    const { email, walletAddress } = await request.json()
    console.log("[v0] Email verification params:", { email, walletAddress })

    // Validate inputs
    if (!email || !walletAddress) {
      console.log("[v0] Missing required parameters")
      return NextResponse.json({ error: "Email and wallet address are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log("[v0] Invalid email format:", email)
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check if email is already connected to another wallet
    console.log("[v0] Checking for existing email connections")
    const existingEmail = await sql`
      SELECT wallet_address FROM user_identities 
      WHERE email = ${email} AND wallet_address != ${walletAddress}
    `

    if (existingEmail.length > 0) {
      console.log("[v0] Email already connected to another wallet")
      return NextResponse.json({ error: "Email already connected to another account" }, { status: 409 })
    }

    // Generate verification token
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    console.log("[v0] Generated verification token:", token)

    // Store verification token in database
    console.log("[v0] Storing verification token in database")
    await sql`
      INSERT INTO email_verifications (email, wallet_address, token, expires_at, created_at)
      VALUES (${email}, ${walletAddress}, ${token}, ${expiresAt}, NOW())
      ON CONFLICT (email) DO UPDATE SET
        token = ${token},
        expires_at = ${expiresAt},
        wallet_address = ${walletAddress},
        created_at = NOW()
    `

    // Create verification URL
    const origin = new URL(request.url).origin
    const verificationUrl = `${origin}/api/email/verify?token=${token}`

    console.log("[v0] Verification URL:", verificationUrl)

    // Send verification email using Resend
    console.log("[v0] Sending verification email via Resend")
    const emailResult = await resend.emails.send({
      from: "Piggy ID <noreply@piggydao.eth>",
      to: [email],
      subject: "Verify your email for Piggy ID",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin: 0;">Piggy ID</h1>
            <p style="color: #666; margin: 5px 0;">Email Verification</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
            <p style="color: #666; line-height: 1.6;">
              Click the button below to verify your email address and connect it to your Piggy ID account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-bottom: 0;">
              This link will expire in 15 minutes. If you didn't request this verification, you can safely ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #999; font-size: 12px;">
            <p>© 2024 Piggy DAO. All rights reserved.</p>
          </div>
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
      emailId: emailResult.data?.id,
    })
  } catch (error) {
    console.error("[v0] Email verification error:", error)
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 })
  }
}
