import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL!
console.log("[v0] Database URL (first 50 chars):", DATABASE_URL.substring(0, 50) + "...")

const sql = neon(DATABASE_URL)

async function testDatabaseConnection(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as test`
    console.log("[v0] Database connection test successful:", result)
    return true
  } catch (error) {
    console.error("[v0] Database connection test failed:", error)
    return false
  }
}

export interface InviteCode {
  code: string
  consumer_player?: string | null
}

export interface CodeAssignment {
  id: number
  token_id: number
  invite_code: string
  wallet_address: string
  assigned_at: string
}

// Fetch and sync invite codes from CSV content to database
export async function syncInviteCodesFromCSV(csvContent: string): Promise<void> {
  try {
    const lines = csvContent.trim().split("\n")
    const headers = lines[0].split(",")

    const codes: string[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",")
      const codeIndex = headers.indexOf("code")
      if (codeIndex !== -1 && values[codeIndex]) {
        codes.push(values[codeIndex].trim().replace(/"/g, ""))
      }
    }

    // Insert codes into database (ignore duplicates)
    for (const code of codes) {
      await sql`
        INSERT INTO invite_codes (code) 
        VALUES (${code}) 
        ON CONFLICT (code) DO NOTHING
      `
    }
  } catch (error) {
    console.error("Error syncing invite codes:", error)
    throw error
  }
}

// Get or assign invite code for a token ID (without auto-sync)
export async function getOrAssignInviteCode(tokenId: number, walletAddress: string): Promise<string | null> {
  try {
    console.log("[v0] Getting invite code for tokenId:", tokenId, "wallet:", walletAddress)

    const connectionOk = await testDatabaseConnection()
    if (!connectionOk) {
      console.error("[v0] Database connection failed, aborting")
      return null
    }

    const totalCodes = await sql`SELECT COUNT(*) as count FROM invite_codes`
    console.log("[v0] Total invite codes in database:", totalCodes[0]?.count || 0)

    // Check if this token already has an assigned code
    const existingAssignment = await sql`
      SELECT invite_code 
      FROM code_assignments 
      WHERE token_id = ${tokenId}
    `

    console.log("[v0] Existing assignment check result:", existingAssignment)

    if (existingAssignment.length > 0) {
      console.log("[v0] Found existing assignment:", existingAssignment[0].invite_code)
      return existingAssignment[0].invite_code
    }

    console.log("[v0] Searching for available codes...")
    const assignedCodes = await sql`SELECT COUNT(*) as count FROM code_assignments`
    const usedCodes = await sql`SELECT COUNT(*) as count FROM code_usage`
    console.log("[v0] Assigned codes count:", assignedCodes[0]?.count || 0)
    console.log("[v0] Used codes count:", usedCodes[0]?.count || 0)

    // Find an available code (not assigned and not used)
    const availableCode = await sql`
      SELECT ic.code 
      FROM invite_codes ic
      LEFT JOIN code_assignments ca ON ic.code = ca.invite_code
      LEFT JOIN code_usage cu ON ic.code = cu.invite_code
      WHERE ca.invite_code IS NULL AND cu.invite_code IS NULL
      LIMIT 1
    `

    console.log("[v0] Available codes query result:", availableCode)

    if (availableCode.length === 0) {
      console.log("[v0] No available codes found - need to upload codes via admin panel")
      return null // No available codes - admin needs to upload more
    }

    const code = availableCode[0].code
    console.log("[v0] Assigning code:", code, "to tokenId:", tokenId)

    // Assign the code to this token
    const insertResult = await sql`
      INSERT INTO code_assignments (token_id, invite_code, wallet_address)
      VALUES (${tokenId}, ${code}, ${walletAddress})
      RETURNING *
    `

    console.log("[v0] Insert result:", insertResult)

    const verifyInsert = await sql`
      SELECT * FROM code_assignments 
      WHERE token_id = ${tokenId} AND invite_code = ${code}
    `
    console.log("[v0] Verification of inserted record:", verifyInsert)

    if (verifyInsert.length > 0) {
      console.log("[v0] Successfully assigned and verified code:", code)
      return code
    } else {
      console.error("[v0] Code assignment failed - record not found after insert")
      return null
    }
  } catch (error) {
    console.error("[v0] Error getting/assigning invite code:", error)
    console.error("[v0] Error details:", error.message, error.stack)
    return null
  }
}

// Mark a code as used (can be called manually or via webhook)
export async function markCodeAsUsed(code: string, playerName?: string): Promise<boolean> {
  try {
    await sql`
      INSERT INTO code_usage (invite_code, player_name)
      VALUES (${code}, ${playerName || null})
      ON CONFLICT (invite_code) DO UPDATE SET
        player_name = ${playerName || null},
        used_at = NOW()
    `
    return true
  } catch (error) {
    console.error("Error marking code as used:", error)
    return false
  }
}

// Get assignment info for a token
export async function getCodeAssignment(tokenId: number): Promise<CodeAssignment | null> {
  try {
    const result = await sql`
      SELECT * FROM code_assignments 
      WHERE token_id = ${tokenId}
    `
    return result.length > 0 ? (result[0] as CodeAssignment) : null
  } catch (error) {
    console.error("Error getting code assignment:", error)
    return null
  }
}

// Check if a code has been used
export async function isCodeUsed(code: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1 FROM code_usage 
      WHERE invite_code = ${code}
    `
    return result.length > 0
  } catch (error) {
    console.error("Error checking code usage:", error)
    return false
  }
}
