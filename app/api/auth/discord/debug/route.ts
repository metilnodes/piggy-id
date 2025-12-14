import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function GET() {
  const diagnostics = {
    env_vars: {
      DISCORD_CLIENT_ID: process.env.DISCORD_CLIENT_ID ? "✓ SET" : "✗ MISSING",
      DISCORD_CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET ? "✓ SET" : "✗ MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "✓ SET" : "✗ MISSING",
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || "NOT SET (using window.location.origin)",
    },
    database: {
      connection: "unknown",
      user_identities_table: "unknown",
    },
  }

  try {
    // Test database connection
    const result = await sql`SELECT 1 as test`
    diagnostics.database.connection = result.length > 0 ? "✓ OK" : "✗ FAILED"

    // Check user_identities table structure
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'user_identities' 
      ORDER BY ordinal_position
    `
    diagnostics.database.user_identities_table =
      tableInfo.length > 0 ? `✓ OK (${tableInfo.length} columns)` : "✗ NOT FOUND"
  } catch (error) {
    diagnostics.database.connection = `✗ ERROR: ${error instanceof Error ? error.message : String(error)}`
  }

  return NextResponse.json(diagnostics, { status: 200 })
}
