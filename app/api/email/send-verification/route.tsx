import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import crypto from "crypto"

export const runtime = "nodejs"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  try {
    console.log("[v0] Send verification endpoint called")

    const { email, walletAddress } = await request.json()
    console.log("[v0] Request data:", { email, walletAddress })

    if (!email || !walletAddress) {
      console.log("[v0] Missing required fields")
      return NextResponse.json({ error: "Email and wallet address are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      console.log("[v0] Invalid email format")
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    const emailLc = email.toLowerCase()
    const walletLc = walletAddress.toLowerCase()

    console.log("[v0] Normalized data:", { emailLc, walletLc })

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
    const expires = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    console.log("[v0] Generated token:", { token: token.substring(0, 8) + "...", expires })

    // Store verification token
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

    console.log("[v0] Stored verification token in database")

    // Get the origin for the verification link
    const origin = request.nextUrl.origin
    const verificationUrl = `${origin}/api/email/verify?token=${token}`

    console.log("[v0] Verification URL:", verificationUrl)

    // Send verification email using Resend
    const emailResult = await resend.emails.send({
      from: "noreply@piggyworld.xyz",
      to: [email],
      subject: "Verify your email address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Please click the button below to verify your email address and connect it to your account.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center;">
            This link will expire in 15 minutes. If you didn't request this verification, please ignore this email.
          </p>
          <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}" style="color: #007bff; word-break: break-all;">${verificationUrl}</a>
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
      emailId: emailResult.data?.id,
    })
  } catch (error) {
    console.error("[v0] Send verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
