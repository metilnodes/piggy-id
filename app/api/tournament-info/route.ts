import { NextResponse } from "next/server"
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

    const info = result[0] || {
      url: "https://www.pokernow.club/mtt/piggy-summer-poker-NV9_BmueuR",
      name: "PIGGY SUMMER POKER",
    }

    return NextResponse.json(info)
  } catch (error) {
    console.error("Failed to get tournament info:", error)
    // Return default values if database fails
    return NextResponse.json({
      url: "https://www.pokernow.club/mtt/piggy-summer-poker-NV9_BmueuR",
      name: "PIGGY SUMMER POKER",
    })
  }
}
