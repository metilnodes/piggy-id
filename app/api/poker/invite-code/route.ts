import { type NextRequest, NextResponse } from "next/server"
import { getOrAssignInviteCode } from "@/lib/invite-db"

export async function POST(request: NextRequest) {
  try {
    const { tokenId, walletAddress } = await request.json()

    if (!tokenId || !walletAddress) {
      return NextResponse.json({ error: "Token ID and wallet address are required" }, { status: 400 })
    }

    const inviteCode = await getOrAssignInviteCode(tokenId, walletAddress)

    return NextResponse.json({ inviteCode })
  } catch (error) {
    console.error("Error in invite code API:", error)
    return NextResponse.json({ error: "Failed to get invite code" }, { status: 500 })
  }
}
