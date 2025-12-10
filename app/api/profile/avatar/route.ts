import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { pinata } from "@/utils/pinata-config"

export const runtime = "nodejs"

const sql = neon(process.env.DATABASE_URL!)

// POST - Upload/change avatar
export async function POST(req: NextRequest) {
  try {
    console.log("[avatar] upload started")

    const formData = await req.formData()
    const file = formData.get("avatar")
    const walletAddress = formData.get("walletAddress") as string | null

    console.log("[avatar] wallet:", walletAddress)
    console.log("[avatar] file:", file)

    if (!walletAddress || !(file instanceof File)) {
      console.log("[avatar] missing file or wallet")
      return NextResponse.json({ error: "Missing file or wallet address" }, { status: 400 })
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      console.log("[avatar] invalid type:", file.type)
      return NextResponse.json({ error: "Invalid file type. Only JPEG, PNG, and WebP are allowed" }, { status: 400 })
    }

    const maxSize = 3 * 1024 * 1024
    if (file.size > maxSize) {
      console.log("[avatar] file too large:", file.size)
      return NextResponse.json({ error: "File too large. Maximum size is 3MB" }, { status: 400 })
    }

    console.log("[avatar] PINATA_JWT exists:", !!process.env.PINATA_JWT)

    const upload = await pinata.upload.file(file)
    console.log("[avatar] pinata result:", upload)

    const cid = upload.cid
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "https://olive-familiar-gerbil-797.mypinata.cloud"
    const avatarUrl = `${gatewayUrl}/ipfs/${cid}`

    console.log("[avatar] avatarUrl:", avatarUrl)

    await sql`
      UPDATE user_identities
      SET avatar_url = ${avatarUrl},
          avatar_cid = ${cid},
          avatar_updated_at = NOW(),
          updated_at = NOW()
      WHERE wallet_address = ${walletAddress}
    `

    console.log("[avatar] DB updated")

    return NextResponse.json({ avatarUrl, cid })
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
