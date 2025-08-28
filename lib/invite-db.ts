import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

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

// Fetch and sync invite codes from CSV to database
export async function syncInviteCodesFromCSV(): Promise<void> {
  try {
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/poker-now-mtt-tests2-q2jy6PkRdD-invites-PCx5hDbJvozLcZNT3TuFILSQiyiWV4.csv",
    )
    const csvText = await response.text()

    const lines = csvText.trim().split("\n")
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

// Get or assign invite code for a token ID
export async function getOrAssignInviteCode(tokenId: number, walletAddress: string): Promise<string | null> {
  try {
    // First, sync codes from CSV if needed
    await syncInviteCodesFromCSV()

    // Check if this token already has an assigned code
    const existingAssignment = await sql`
      SELECT invite_code 
      FROM code_assignments 
      WHERE token_id = ${tokenId}
    `

    if (existingAssignment.length > 0) {
      return existingAssignment[0].invite_code
    }

    // Find an available code (not assigned and not used)
    const availableCode = await sql`
      SELECT ic.code 
      FROM invite_codes ic
      LEFT JOIN code_assignments ca ON ic.code = ca.invite_code
      LEFT JOIN code_usage cu ON ic.code = cu.invite_code
      WHERE ca.invite_code IS NULL AND cu.invite_code IS NULL
      LIMIT 1
    `

    if (availableCode.length === 0) {
      return null // No available codes
    }

    const code = availableCode[0].code

    // Assign the code to this token
    await sql`
      INSERT INTO code_assignments (token_id, invite_code, wallet_address)
      VALUES (${tokenId}, ${code}, ${walletAddress})
    `

    return code
  } catch (error) {
    console.error("Error getting/assigning invite code:", error)
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
