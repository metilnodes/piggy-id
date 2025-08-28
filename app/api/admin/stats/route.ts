import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    // Get total codes
    const totalCodesResult = await sql`
      SELECT COUNT(*) as count FROM invite_codes
    `
    const totalCodes = Number.parseInt(totalCodesResult[0].count)

    // Get assigned codes
    const assignedCodesResult = await sql`
      SELECT COUNT(DISTINCT invite_code) as count FROM code_assignments
    `
    const assignedCodes = Number.parseInt(assignedCodesResult[0].count)

    // Get used codes
    const usedCodesResult = await sql`
      SELECT COUNT(DISTINCT invite_code) as count FROM code_usage
    `
    const usedCodes = Number.parseInt(usedCodesResult[0].count)

    // Calculate available codes
    const availableCodes = totalCodes - assignedCodes

    return NextResponse.json({
      totalCodes,
      assignedCodes,
      usedCodes,
      availableCodes,
    })
  } catch (error) {
    console.error("Failed to get stats:", error)
    return NextResponse.json({ error: "Failed to get statistics" }, { status: 500 })
  }
}
