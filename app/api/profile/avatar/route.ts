import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

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

    const pinataForm = new FormData()
    // Field name MUST be "file" for Pinata API
    pinataForm.append("file", file, file.name)

    const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT!}`,
        // Don't set Content-Type - fetch sets it automatically for FormData
      },
      body: pinataForm,
    })

    if (!pinataRes.ok) {
      const text = await pinataRes.text()
      console.error("[avatar] Pinata error response:", text)
      return NextResponse.json({ error: "Pinata upload failed" }, { status: 500 })
    }

    const pinataJson = (await pinataRes.json()) as {
      IpfsHash: string
      PinSize: number
      Timestamp: string
    }

    const cid = pinataJson.IpfsHash
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL ?? "https://olive-familiar-gerbil-797.mypinata.cloud"
    const avatarUrl = `${gatewayUrl}/ipfs/${cid}`

    await sql`
      UPDATE user_identities
      SET avatar_url = ${avatarUrl},
          avatar_cid = ${cid},
          avatar_updated_at = NOW(),
          updated_at = NOW()
      WHERE wallet_address = ${walletAddress}
    `

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
