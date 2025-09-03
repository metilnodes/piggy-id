import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const result = await sql`
      SELECT setting_value as url, tournament_name as name 
      FROM tournament_settings 
      WHERE setting_key = 'tournament_url' 
      LIMIT 1
    `

    const info = result[0] || { url: "", name: "PIGGY SUMMER POKER" }

    return NextResponse.json(info)
  } catch (error) {
    console.error("Failed to get tournament info:", error)
    return NextResponse.json({ error: "Failed to get tournament info" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, name } = await request.json()

    if (!url || !name) {
      return NextResponse.json({ error: "Tournament URL and name are required" }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Update or insert tournament info
    await sql`
      INSERT INTO tournament_settings (setting_key, setting_value, tournament_name)
      VALUES ('tournament_url', ${url}, ${name})
      ON CONFLICT (setting_key) 
      DO UPDATE SET 
        setting_value = ${url},
        tournament_name = ${name},
        updated_at = CURRENT_TIMESTAMP
    `

    return NextResponse.json({
      success: true,
      message: "Tournament info updated successfully",
    })
  } catch (error) {
    console.error("Failed to update tournament info:", error)
    return NextResponse.json({ error: "Failed to update tournament info" }, { status: 500 })
  }
}
