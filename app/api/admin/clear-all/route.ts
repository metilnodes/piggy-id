import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST() {
  try {
    // Clear all data in correct order (due to foreign key constraints)
    await sql`DELETE FROM code_usage`
    await sql`DELETE FROM code_assignments`
    await sql`DELETE FROM invite_codes`

    return NextResponse.json({
      success: true,
      message: "All codes and assignments cleared successfully",
    })
  } catch (error) {
    console.error("Failed to clear codes:", error)
    return NextResponse.json({ error: "Failed to clear codes" }, { status: 500 })
  }
}
