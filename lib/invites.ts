interface InviteCode {
  code: string
  consumer_player: string | null
}

const CSV_URL =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/poker-now-mtt-tests2-q2jy6PkRdD-invites-PCx5hDbJvozLcZNT3TuFILSQiyiWV4.csv"

// In-memory storage for assigned codes (in production, use a database)
const assignedCodes = new Map<string, string>() // tokenId -> inviteCode

export async function getInviteCodeForTokenId(tokenId: string): Promise<string | null> {
  try {
    console.log("[v0] Getting invite code for tokenId:", tokenId)

    // Check if this tokenId already has an assigned code
    if (assignedCodes.has(tokenId)) {
      const existingCode = assignedCodes.get(tokenId)!
      console.log("[v0] Found existing code for tokenId:", tokenId, "->", existingCode)
      return existingCode
    }

    // Fetch available codes from CSV
    const response = await fetch(CSV_URL)
    if (!response.ok) {
      throw new Error(`Failed to fetch invite codes: ${response.status}`)
    }

    const csvText = await response.text()
    const lines = csvText.trim().split("\n")

    // Skip header row
    const dataLines = lines.slice(1)

    const availableCodes: InviteCode[] = []

    for (const line of dataLines) {
      // Parse CSV line (handle potential commas in values)
      const [code, consumer_player] = line.split(",").map(
        (field) => field.trim().replace(/^"(.*)"$/, "$1"), // Remove quotes if present
      )

      if (code) {
        availableCodes.push({
          code,
          consumer_player: consumer_player || null,
        })
      }
    }

    console.log("[v0] Found", availableCodes.length, "total codes")

    // Find an unused code (consumer_player is null or empty)
    const unusedCodes = availableCodes.filter(
      (invite) => !invite.consumer_player || invite.consumer_player.trim() === "",
    )

    console.log("[v0] Found", unusedCodes.length, "unused codes")

    // Check if any codes are already assigned to other tokenIds
    const usedCodes = new Set(assignedCodes.values())
    const availableUnusedCodes = unusedCodes.filter((invite) => !usedCodes.has(invite.code))

    console.log("[v0] Found", availableUnusedCodes.length, "available unused codes")

    if (availableUnusedCodes.length === 0) {
      console.log("[v0] No available invite codes")
      return null
    }

    // Assign the first available code to this tokenId
    const assignedCode = availableUnusedCodes[0].code
    assignedCodes.set(tokenId, assignedCode)

    console.log("[v0] Assigned code", assignedCode, "to tokenId", tokenId)
    return assignedCode
  } catch (error) {
    console.error("[v0] Error getting invite code:", error)
    return null
  }
}

export async function getOrAssignInviteCode(tokenId: bigint): Promise<string | null> {
  return getInviteCodeForTokenId(tokenId.toString())
}

export function getAssignedCodes(): Map<string, string> {
  return new Map(assignedCodes)
}

export function clearAssignedCodes(): void {
  assignedCodes.clear()
}
