import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const discordId = req.cookies.get("superpoker_discord_id")?.value

    if (!discordId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Remove user from superpoker_users table
    await sql`
      DELETE FROM superpoker_users 
      WHERE discord_id = ${discordId}
    `

    // Clear session cookie
    const response = NextResponse.json({ success: true })
    response.cookies.delete("superpoker_discord_id")

    return response
  } catch (error) {
    console.error("Superpoker disconnect error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
