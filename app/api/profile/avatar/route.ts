import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { pinata } from "@/utils/pinata-config"

const sql = neon(process.env.DATABASE_URL!)

// POST - Upload/change avatar
export async function POST(req: NextRequest) {
  try {
    console.log("[v0] Avatar upload started")

    const formData = await req.formData()
    const file = formData.get("avatar") as File
    const walletAddress = formData.get("walletAddress") as string

    console.log("[v0] File:", file?.name, file?.type, file?.size)
    console.log("[v0] Wallet address:", walletAddress)

    if (!file || !walletAddress) {
      console.log("[v0] Missing file or wallet address")
      return NextResponse.json({ error: "Missing file or wallet address" }, { status: 400 })
    }

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      console.log("[v0] Invalid file type:", file.type)
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed" }, { status: 400 })
    }

    // Validate file size (max 3MB)
    const maxSize = 3 * 1024 * 1024 // 3MB
    if (file.size > maxSize) {
      console.log("[v0] File too large:", file.size)
      return NextResponse.json({ error: "File too large. Maximum size is 3MB" }, { status: 400 })
    }

    console.log("[v0] Converting file to buffer...")
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log("[v0] Uploading to Pinata...")
    console.log("[v0] PINATA_JWT exists:", !!process.env.PINATA_JWT)
    console.log("[v0] Gateway URL:", process.env.NEXT_PUBLIC_GATEWAY_URL)

    // Upload to Pinata
    const upload = await pinata.upload.file(new File([buffer], file.name, { type: file.type }))

    console.log("[v0] Upload successful, CID:", upload.cid)

    const cid = upload.cid
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://olive-familiar-gerbil-797.mypinata.cloud"
    const avatarUrl = `${gatewayUrl}/ipfs/${cid}`

    console.log("[v0] Avatar URL:", avatarUrl)
    console.log("[v0] Updating database...")

    // Save to database
    await sql`
      UPDATE user_identities
      SET avatar_url = ${avatarUrl},
          avatar_cid = ${cid},
          avatar_updated_at = NOW(),
          updated_at = NOW()
      WHERE wallet_address = ${walletAddress}
    `

    console.log("[v0] Database updated successfully")

    return NextResponse.json({
      avatarUrl: avatarUrl,
      cid: cid,
    })
  } catch (error) {
    console.error("[v0] Error uploading avatar:", error)
    if (error instanceof Error) {
      console.error("[v0] Error message:", error.message)
      console.error("[v0] Error stack:", error.stack)
    }
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
