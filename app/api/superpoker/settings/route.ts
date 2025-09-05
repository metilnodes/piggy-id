import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  try {
    const settings = await sql`
      SELECT setting_key, setting_value 
      FROM superpoker_settings
    `

    const settingsObj = settings.reduce((acc: any, setting: any) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {})

    return NextResponse.json(settingsObj)
  } catch (error) {
    console.error("Failed to fetch superpoker settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { setting_key, setting_value } = await request.json()

    if (!setting_key || setting_value === undefined) {
      return NextResponse.json({ error: "Missing setting_key or setting_value" }, { status: 400 })
    }

    await sql`
      INSERT INTO superpoker_settings (setting_key, setting_value)
      VALUES (${setting_key}, ${setting_value})
      ON CONFLICT (setting_key) 
      DO UPDATE SET setting_value = ${setting_value}, updated_at = CURRENT_TIMESTAMP
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to update superpoker setting:", error)
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 })
  }
}
