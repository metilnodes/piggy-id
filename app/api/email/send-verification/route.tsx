export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Email verification request started")

    const { email, walletAddress } = await request.json()
    console.log("[v0] Email verification for:", email, "Wallet:", walletAddress)

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log("[v0] Invalid email format:", email)
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Check if email is already verified by another wallet
    const existingEmail = await sql`
      SELECT wallet_address, verified FROM email_verifications 
      WHERE email = ${email} AND verified = true
    `

    if (existingEmail.length > 0 && existingEmail[0].wallet_address !== walletAddress) {
      console.log("[v0] Email already connected to another wallet")
      return NextResponse.json(
        {
          error: "This email is already connected to another wallet",
        },
        { status: 400 },
      )
    }

    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    console.log("[v0] Generated token:", verificationToken)

    // Store verification token (use ON CONFLICT with verification_token)
    await sql`
      INSERT INTO email_verifications (email, wallet_address, verification_token, expires_at)
      VALUES (${email}, ${walletAddress}, ${verificationToken}, ${expiresAt})
      ON CONFLICT (email) DO UPDATE SET 
        verification_token = ${verificationToken},
        expires_at = ${expiresAt},
        verified = false,
        updated_at = NOW()
    `

    console.log("[v0] Token stored in database")

    // Create verification URL
    const origin = request.nextUrl.origin
    const verificationUrl = `${origin}/api/email/verify?token=${verificationToken}`

    console.log("[v0] Verification URL:", verificationUrl)

    // Send email using Resend with piggyworld.xyz domain
    const emailResult = await resend.emails.send({
      from: `noreply@piggyworld.xyz`, // Using piggyworld.xyz domain
      to: [email],
      subject: "Verify your email for Piggy ID",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Verify Your Email Address</h2>
          <p>Click the button below to verify your email address for Piggy ID:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007cba; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 15 minutes. If you didn't request this verification, 
            you can safely ignore this email.
          </p>
          <p style="color: #666; font-size: 12px;">
            If the button doesn't work, copy and paste this link: ${verificationUrl}
          </p>
        </div>
      `,
    })

    console.log("[v0] Resend API response:", emailResult)

    if (emailResult.error) {
      console.error("[v0] Resend API error:", emailResult.error)
      return NextResponse.json(
        {
          error: "Failed to send verification email. Please check domain configuration.",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Verification email sent successfully")
    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully",
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
