import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(request: NextRequest) {
  try {
    const { codeId } = await request.json()

    if (!codeId) {
      return NextResponse.json({ error: "Code ID is required" }, { status: 400 })
    }

    // Get the code first to clean up related records
    const codeResult = await sql`
      SELECT code FROM superpoker_invite_codes WHERE id = ${codeId}
    `

    if (codeResult.length === 0) {
      return NextResponse.json({ error: "Code not found" }, { status: 404 })
    }

    const code = codeResult[0].code

    // Delete related records first
    await sql`DELETE FROM superpoker_code_usage WHERE invite_code = ${code}`
    await sql`DELETE FROM superpoker_code_assignments WHERE invite_code = ${code}`
    await sql`DELETE FROM superpoker_invite_codes WHERE id = ${codeId}`

    return NextResponse.json({
      success: true,
      message: "Code deleted successfully",
    })
  } catch (error) {
    console.error("Failed to delete superpoker code:", error)
    return NextResponse.json({ error: "Failed to delete code" }, { status: 500 })
  }
}
