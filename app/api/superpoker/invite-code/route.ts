import { type NextRequest, NextResponse } from "next/server"
import { getOrAssignSuperPokerInviteCode } from "@/lib/superpoker-invite-db"

export async function POST(request: NextRequest) {
  try {
    const { discordId, discordUsername } = await request.json()

    if (!discordId || !discordUsername) {
      return NextResponse.json({ error: "Discord ID and username are required" }, { status: 400 })
    }

    const inviteCode = await getOrAssignSuperPokerInviteCode(discordId, discordUsername)

    return NextResponse.json({ inviteCode })
  } catch (error) {
    console.error("Error in superpoker invite code API:", error)
    return NextResponse.json({ error: "Failed to get invite code" }, { status: 500 })
  }
}
