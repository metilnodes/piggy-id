import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())

    // Skip header if present
    const dataLines = lines[0].toLowerCase().includes("code") ? lines.slice(1) : lines

    const codes = dataLines
      .map((line) => {
        const [code] = line.split(",")
        return code?.trim()
      })
      .filter((code) => code && code.length > 0)

    if (codes.length === 0) {
      return NextResponse.json({ error: "No valid codes found in CSV" }, { status: 400 })
    }

    // Clear existing codes and assignments
    await sql`DELETE FROM code_usage`
    await sql`DELETE FROM code_assignments`
    await sql`DELETE FROM invite_codes`

    // Insert new codes
    for (const code of codes) {
      await sql`
        INSERT INTO invite_codes (code, created_at, updated_at)
        VALUES (${code}, NOW(), NOW())
        ON CONFLICT (code) DO NOTHING
      `
    }

    return NextResponse.json({
      success: true,
      count: codes.length,
      message: `Successfully uploaded ${codes.length} codes`,
    })
  } catch (error) {
    console.error("Failed to upload CSV:", error)
    return NextResponse.json({ error: "Failed to process CSV file" }, { status: 500 })
  }
}
