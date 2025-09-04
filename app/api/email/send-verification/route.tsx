import { type NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { neon } from "@neondatabase/serverless"
import crypto from "crypto"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Email verification request received")

    const { email, walletAddress } = await request.json()

    if (!email || !walletAddress) {
      console.log("[v0] Missing email or wallet address")
      return NextResponse.json({ error: "Email and wallet address are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log("[v0] Invalid email format:", email)
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check if email is already connected to another wallet
    const existingEmail = await sql`
      SELECT wallet_address FROM user_identities 
      WHERE email = ${email} AND wallet_address != ${walletAddress}
    `

    if (existingEmail.length > 0) {
      console.log("[v0] Email already connected to another wallet")
      return NextResponse.json({ error: "Email already connected to another account" }, { status: 400 })
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    console.log("[v0] Generated verification token for:", email)

    // Store verification record
    await sql`
      INSERT INTO email_verifications (wallet_address, email, verification_token, expires_at, created_at, updated_at)
      VALUES (${walletAddress}, ${email}, ${verificationToken}, ${expiresAt}, NOW(), NOW())
      ON CONFLICT (wallet_address) DO UPDATE SET
        email = ${email},
        verification_token = ${verificationToken},
        expires_at = ${expiresAt},
        verified = FALSE,
        updated_at = NOW()
    `

    // Create verification URL
    const origin = new URL(request.url).origin
    const verificationUrl = `${origin}/api/email/verify?token=${verificationToken}`

    console.log("[v0] Sending verification email to:", email)

    // Send verification email using Resend
    const emailResult = await resend.emails.send({
      from: "Piggy ID <noreply@piggydao.eth>",
      to: [email],
      subject: "Verify your email for Piggy ID",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #333; margin-bottom: 10px;">Verify Your Email</h1>
            <p style="color: #666; font-size: 16px;">Complete your Piggy ID connection</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">
              You requested to connect this email address to your Piggy ID account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              This link will expire in 15 minutes for security reasons.
            </p>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
            <p style="color: #999; font-size: 12px;">
              If you didn't request this verification, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
      text: `
        Verify Your Email for Piggy ID
        
        You requested to connect this email address to your Piggy ID account.
        
        Click the link below to verify your email:
        ${verificationUrl}
        
        This link will expire in 15 minutes for security reasons.
        
        If you didn't request this verification, you can safely ignore this email.
      `,
    })

    console.log("[v0] Email sent successfully:", emailResult.data?.id)

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully",
      emailId: emailResult.data?.id,
    })
  } catch (error) {
    console.error("[v0] Email verification error:", error)
    return NextResponse.json(
      {
        error: "Failed to send verification email",
      },
      { status: 500 },
    )
  }
}
