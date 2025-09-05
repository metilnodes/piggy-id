import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Clear all superpoker data
    await sql`DELETE FROM superpoker_code_usage`
    await sql`DELETE FROM superpoker_code_assignments`
    await sql`DELETE FROM superpoker_invite_codes`

    return NextResponse.json({
      success: true,
      message: "All superpoker codes and assignments cleared",
    })
  } catch (error) {
    console.error("Failed to clear superpoker codes:", error)
    return NextResponse.json({ error: "Failed to clear codes" }, { status: 500 })
  }
}
