import { type NextRequest, NextResponse } from "next/server"
import { assignInviteCode } from "@/lib/server/invites-file"

/**
 * POST /api/poker/invite
 * Body: { tokenId: string | number }
 * Returns: { code: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { tokenId } = await req.json()
    if (tokenId === undefined || tokenId === null) {
      return NextResponse.json({ error: "tokenId is required" }, { status: 400 })
    }

    const code = await assignInviteCode(BigInt(tokenId))

    if (!code) {
      return NextResponse.json({ error: "No available invite codes" }, { status: 409 })
    }

    return NextResponse.json({ code })
  } catch (err: any) {
    console.error("Invite API error:", err)
    return NextResponse.json({ error: err?.message ?? "Internal error" }, { status: 500 })
  }
}
