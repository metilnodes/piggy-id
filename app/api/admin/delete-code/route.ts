import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(request: NextRequest) {
  try {
    const { codeId } = await request.json()

    if (!codeId) {
      return NextResponse.json({ error: "Code ID is required" }, { status: 400 })
    }

    // Delete the code and its assignments
    await sql`DELETE FROM code_usage WHERE code_id = ${codeId}`
    await sql`DELETE FROM code_assignments WHERE code_id = ${codeId}`
    await sql`DELETE FROM invite_codes WHERE id = ${codeId}`

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting code:", error)
    return NextResponse.json({ error: "Failed to delete code" }, { status: 500 })
  }
}
