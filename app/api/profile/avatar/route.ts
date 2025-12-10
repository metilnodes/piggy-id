import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { put, del } from "@vercel/blob"

export const runtime = "nodejs"

const sql = neon(process.env.DATABASE_URL!)

// POST - Upload/change avatar
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("avatar")
    const walletAddress = formData.get("walletAddress") as string | null

    if (!walletAddress || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file or wallet address" }, { status: 400 })
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed" }, { status: 400 })
    }

    const maxSize = 3 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 3MB" }, { status: 400 })
    }

    // Use .webp extension for consistency, file path includes wallet address
    const blob = await put(`avatars/${walletAddress}.webp`, file, {
      access: "public",
    })

    const avatarUrl = blob.url

    await sql`
      UPDATE user_identities
      SET avatar_url = ${avatarUrl},
          avatar_cid = NULL,
          avatar_updated_at = NOW(),
          updated_at = NOW()
      WHERE wallet_address = ${walletAddress}
    `

    return NextResponse.json({ avatarUrl })
  } catch (error) {
    console.error("[avatar] Error:", error)
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 })
  }
}

// DELETE - Remove avatar
export async function DELETE(req: NextRequest) {
  try {
    const { walletAddress } = await req.json()

    if (!walletAddress) {
      return NextResponse.json({ error: "Missing wallet address" }, { status: 400 })
    }

    const result = await sql`
      SELECT avatar_url FROM user_identities
      WHERE wallet_address = ${walletAddress}
    `

    // Delete from Vercel Blob if exists
    if (result[0]?.avatar_url) {
      try {
        await del(result[0].avatar_url)
      } catch (err) {
        console.warn("[avatar] Failed to delete from Blob storage:", err)
      }
    }

    await sql`
      UPDATE user_identities
      SET avatar_url = NULL,
          avatar_cid = NULL,
          avatar_updated_at = NULL,
          updated_at = NOW()
      WHERE wallet_address = ${walletAddress}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[avatar] delete error:", error)
    return NextResponse.json({ error: "Failed to delete avatar" }, { status: 500 })
  }
}
