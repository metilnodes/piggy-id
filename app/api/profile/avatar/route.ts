import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { pinata } from "@/utils/pinata-config"

const sql = neon(process.env.DATABASE_URL!)

// POST - Upload/change avatar
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("avatar") as File
    const walletAddress = formData.get("walletAddress") as string

    if (!file || !walletAddress) {
      return NextResponse.json({ error: "Missing file or wallet address" }, { status: 400 })
    }

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed" }, { status: 400 })
    }

    // Validate file size (max 3MB)
    const maxSize = 3 * 1024 * 1024 // 3MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: "File too large. Maximum size is 3MB" }, { status: 400 })
    }

    // Create a simple resize using canvas (basic implementation)
    // In production, you might want to use sharp or similar library
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Pinata
    const upload = await pinata.upload.file(new File([buffer], file.name, { type: file.type }))

    const cid = upload.cid
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://olive-familiar-gerbil-797.mypinata.cloud"
    const avatarUrl = `${gatewayUrl}/ipfs/${cid}`

    // Save to database
    await sql`
      UPDATE user_identities
      SET avatar_url = ${avatarUrl},
          avatar_cid = ${cid},
          avatar_updated_at = NOW(),
          updated_at = NOW()
      WHERE wallet_address = ${walletAddress}
    `

    return NextResponse.json({
      avatarUrl: avatarUrl,
      cid: cid,
    })
  } catch (error) {
    console.error("Error uploading avatar:", error)
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

    // Update database to clear avatar fields
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
    console.error("Error deleting avatar:", error)
    return NextResponse.json({ error: "Failed to delete avatar" }, { status: 500 })
  }
}
