import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const codes = await sql`
      SELECT 
        ic.id,
        ic.code,
        ic.created_at,
        ic.updated_at,
        ca.discord_username as assigned_to,
        cu.player_name as used_by
      FROM superpoker_invite_codes ic
      LEFT JOIN superpoker_code_assignments ca ON ic.code = ca.invite_code
      LEFT JOIN superpoker_code_usage cu ON ic.code = cu.invite_code
      ORDER BY ic.created_at DESC
      LIMIT 100
    `

    return NextResponse.json({ codes })
  } catch (error) {
    console.error("Failed to get superpoker codes:", error)
    return NextResponse.json({ error: "Failed to get codes" }, { status: 500 })
  }
}
