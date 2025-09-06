import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const result = await sql`
      SELECT setting_value as url 
      FROM tournament_settings 
      WHERE setting_key = 'tournament_url'
      LIMIT 1
    `

    const url = result[0]?.url || "https://www.pokernow.club/mtt/piggy-summer-poker-NV9_BmueuR"

    return NextResponse.json({ url })
  } catch (error) {
    console.error("Error fetching tournament URL:", error)
    return NextResponse.json({ error: "Failed to fetch tournament URL" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Valid URL is required" }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
    }

    // Update or insert tournament URL
    await sql`
      INSERT INTO tournament_settings (setting_key, setting_value)
      VALUES ('tournament_url', ${url})
      ON CONFLICT (setting_key) 
      DO UPDATE SET 
        setting_value = ${url},
        updated_at = CURRENT_TIMESTAMP
    `

    return NextResponse.json({
      success: true,
      message: "Tournament URL updated successfully",
    })
  } catch (error) {
    console.error("Error updating tournament URL:", error)
    return NextResponse.json({ error: "Failed to update tournament URL" }, { status: 500 })
  }
}
