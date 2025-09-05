import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL!
const sql = neon(DATABASE_URL)

export interface SuperPokerInviteCode {
  code: string
  consumer_player?: string | null
}

export interface SuperPokerCodeAssignment {
  id: number
  discord_id: string
  invite_code: string
  discord_username: string
  assigned_at: string
}

export async function syncSuperPokerInviteCodesFromCSV(csvContent: string): Promise<void> {
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

    // Insert codes into superpoker database
    for (const code of codes) {
      await sql`
        INSERT INTO superpoker_invite_codes (code) 
        VALUES (${code}) 
        ON CONFLICT (code) DO NOTHING
      `
    }
  } catch (error) {
    console.error("Error syncing superpoker invite codes:", error)
    throw error
  }
}

// Get or assign invite code for a Discord user
export async function getOrAssignSuperPokerInviteCode(
  discordId: string,
  discordUsername: string,
): Promise<string | null> {
  try {
    console.log("[v0] Getting superpoker invite code for discordId:", discordId, "username:", discordUsername)

    // Check if this Discord user already has an assigned code
    const existingAssignment = await sql`
      SELECT invite_code 
      FROM superpoker_code_assignments 
      WHERE discord_id = ${discordId}
    `

    if (existingAssignment.length > 0) {
      console.log("[v0] Found existing superpoker assignment:", existingAssignment[0].invite_code)
      return existingAssignment[0].invite_code
    }

    // Find an available code (not assigned and not used)
    const availableCode = await sql`
      SELECT ic.code 
      FROM superpoker_invite_codes ic
      LEFT JOIN superpoker_code_assignments ca ON ic.code = ca.invite_code
      LEFT JOIN superpoker_code_usage cu ON ic.code = cu.invite_code
      WHERE ca.invite_code IS NULL AND cu.invite_code IS NULL
      LIMIT 1
    `

    if (availableCode.length === 0) {
      console.log("[v0] No available superpoker codes found")
      return null
    }

    const code = availableCode[0].code
    console.log("[v0] Assigning superpoker code:", code, "to discordId:", discordId)

    // Assign the code to this Discord user
    await sql`
      INSERT INTO superpoker_code_assignments (discord_id, invite_code, discord_username)
      VALUES (${discordId}, ${code}, ${discordUsername})
    `

    return code
  } catch (error) {
    console.error("[v0] Error getting/assigning superpoker invite code:", error)
    return null
  }
}

// Mark a superpoker code as used
export async function markSuperPokerCodeAsUsed(code: string, playerName?: string): Promise<boolean> {
  try {
    await sql`
      INSERT INTO superpoker_code_usage (invite_code, player_name)
      VALUES (${code}, ${playerName || null})
      ON CONFLICT (invite_code) DO UPDATE SET
        player_name = ${playerName || null},
        used_at = NOW()
    `
    return true
  } catch (error) {
    console.error("Error marking superpoker code as used:", error)
    return false
  }
}

// Get superpoker assignment info for a Discord user
export async function getSuperPokerCodeAssignment(discordId: string): Promise<SuperPokerCodeAssignment | null> {
  try {
    const result = await sql`
      SELECT * FROM superpoker_code_assignments 
      WHERE discord_id = ${discordId}
    `
    return result.length > 0 ? (result[0] as SuperPokerCodeAssignment) : null
  } catch (error) {
    console.error("Error getting superpoker code assignment:", error)
    return null
  }
}

// Check if a superpoker code has been used
export async function isSuperPokerCodeUsed(code: string): Promise<boolean> {
  try {
    const result = await sql`
      SELECT 1 FROM superpoker_code_usage 
      WHERE invite_code = ${code}
    `
    return result.length > 0
  } catch (error) {
    console.error("Error checking superpoker code usage:", error)
    return false
  }
}
