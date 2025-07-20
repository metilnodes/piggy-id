import { type NextRequest, NextResponse } from "next/server"
import { createPiggyIDMetadata } from "@/utils/nft-utils"

const PINATA_API_URL = "https://api.pinata.cloud"
const PINATA_JWT = process.env.PINATA_JWT

if (!PINATA_JWT) {
  console.error("PINATA_JWT environment variable is not set")
}

export async function POST(request: NextRequest) {
  try {
    if (!PINATA_JWT) {
      return NextResponse.json({ error: "Pinata JWT not configured" }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const metadataString = formData.get("metadata") as string

    if (!file || !metadataString) {
      return NextResponse.json({ error: "File and metadata are required" }, { status: 400 })
    }

    const metadata = JSON.parse(metadataString)

    // Upload image to Pinata
    const imageFormData = new FormData()
    imageFormData.append("file", file)
    imageFormData.append(
      "pinataMetadata",
      JSON.stringify({
        name: `piggy-id-${metadata.passportNumber}.png`,
        description: `Piggy ID image for ${metadata.firstName} ${metadata.surname}`,
      }),
    )

    const imageResponse = await fetch(`${PINATA_API_URL}/pinning/pinFileToIPFS`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: imageFormData,
    })

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text()
      console.error("Pinata image upload error:", errorText)
      throw new Error(`Failed to upload image: ${imageResponse.status} ${errorText}`)
    }

    const imageResult = await imageResponse.json()
    const imageUrl = `ipfs://${imageResult.IpfsHash}`

    // Create NFT metadata
    const nftMetadata = createPiggyIDMetadata({
      ...metadata,
      imageUrl,
    })

    // Upload metadata to Pinata
    const metadataResponse = await fetch(`${PINATA_API_URL}/pinning/pinJSONToIPFS`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: nftMetadata,
        pinataMetadata: {
          name: `piggy-id-metadata-${metadata.passportNumber}.json`,
          description: `Piggy ID metadata for ${metadata.firstName} ${metadata.surname}`,
        },
      }),
    })

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text()
      console.error("Pinata metadata upload error:", errorText)
      throw new Error(`Failed to upload metadata: ${metadataResponse.status} ${errorText}`)
    }

    const metadataResult = await metadataResponse.json()
    const metadataUrl = `ipfs://${metadataResult.IpfsHash}`

    return NextResponse.json({
      success: true,
      imageUrl,
      metadataUrl,
      imageHash: imageResult.IpfsHash,
      metadataHash: metadataResult.IpfsHash,
    })
  } catch (error: any) {
    console.error("Upload API error:", error)
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 })
  }
}
