import { NextResponse } from "next/server"
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
    // Return default URL if database fails
    return NextResponse.json({
      url: "https://www.pokernow.club/mtt/piggy-summer-poker-NV9_BmueuR",
    })
  }
}
