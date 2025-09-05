import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  try {
    const discordId = req.cookies.get("superpoker_discord_id")?.value

    if (!discordId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const users = await sql`
      SELECT discord_id, discord_username, created_at
      FROM superpoker_users 
      WHERE discord_id = ${discordId}
    `

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(users[0])
  } catch (error) {
    console.error("Get superpoker user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
