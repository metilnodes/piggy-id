import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const { codes } = await request.json()

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json({ error: "No codes provided" }, { status: 400 })
    }

    let addedCount = 0

    for (const code of codes) {
      if (code && code.trim()) {
        try {
          await sql`
            INSERT INTO superpoker_invite_codes (code, created_at, updated_at)
            VALUES (${code.trim()}, NOW(), NOW())
            ON CONFLICT (code) DO NOTHING
          `
          addedCount++
        } catch (error) {
          console.error(`Failed to add superpoker code ${code}:`, error)
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: addedCount,
      message: `Successfully added ${addedCount} superpoker codes`,
    })
  } catch (error) {
    console.error("Failed to add superpoker codes:", error)
    return NextResponse.json({ error: "Failed to add codes" }, { status: 500 })
  }
}
