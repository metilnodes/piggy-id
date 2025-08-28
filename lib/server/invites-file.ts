import fs from "node:fs/promises"
import path from "node:path"

const DATA_DIR = process.env.PIGGY_DATA_DIR ?? path.join(process.cwd(), "data")
const CSV_PATH = process.env.PIGGY_INVITES_CSV ?? path.join(DATA_DIR, "poker-invites.csv")
const JSON_PATH = process.env.PIGGY_ASSIGNMENTS_JSON ?? path.join(DATA_DIR, "poker-assignments.json")

export type Assignments = {
  byTokenId: Record<string, string> // tokenId -> code
  usedCodes: Record<string, true>
}

async function ensureDefaults(): Promise<Assignments> {
  try {
    const raw = await fs.readFile(JSON_PATH, "utf8")
    const parsed = JSON.parse(raw) as Assignments
    if (!parsed.byTokenId || !parsed.usedCodes) throw new Error("bad JSON shape")
    return parsed
  } catch {
    const fresh: Assignments = { byTokenId: {}, usedCodes: {} }
    await fs.mkdir(path.dirname(JSON_PATH), { recursive: true })
    await fs.writeFile(JSON_PATH, JSON.stringify(fresh, null, 2), "utf8")
    return fresh
  }
}

function normalizeCodes(lines: string[]): string[] {
  const out: string[] = []
  for (const line of lines) {
    const row = line.replace(/\r/g, "").trim()
    if (!row) continue
    if (row.toLowerCase().includes("code") && row.toLowerCase().includes("consumer")) continue
    // Support either "CODE" or "CODE,used" - take first cell
    const first = row.split(",")[0]?.trim()
    if (first && first !== "code") out.push(first) // Skip header
  }
  return Array.from(new Set(out)) // de-dupe
}

async function loadCodesFromCsv(): Promise<string[]> {
  try {
    const raw = await fs.readFile(CSV_PATH, "utf8")
    const lines = raw.split("\n")
    const codes = normalizeCodes(lines)
    console.log("[v0] Loaded", codes.length, "invite codes from CSV")
    console.log("[v0] Sample codes:", codes.slice(0, 3))
    return codes
  } catch (error) {
    console.error("[v0] Error loading CSV:", error)
    const fallbackCodes = ["xh4kHSOP_I", "mK9pLqR3_X", "nB7wEt5Y_Z", "vC2sAu8M_Q", "jF6dGh1N_P"]
    console.log("[v0] Using fallback codes:", fallbackCodes)
    return fallbackCodes
  }
}

export async function assignInviteCode(tokenId: bigint): Promise<string | null> {
  try {
    console.log("[v0] Assigning invite code for tokenId:", tokenId.toString())

    // 1) Load assignments JSON
    const assignments = await ensureDefaults()
    const key = tokenId.toString()

    // 2) If token already mapped – return existing code
    const existing = assignments.byTokenId[key]
    if (existing) {
      console.log("[v0] Returning existing code for tokenId", key, ":", existing)
      return existing
    }

    // 3) Otherwise iterate available CSV codes and pick first free
    const allCodes = await loadCodesFromCsv()
    console.log("[v0] Total available codes:", allCodes.length)
    console.log("[v0] Used codes:", Object.keys(assignments.usedCodes).length)

    const free = allCodes.find((c) => !assignments.usedCodes[c])
    if (!free) {
      console.log("[v0] No free codes available")
      return null
    }

    console.log("[v0] Assigning new code:", free, "to tokenId:", key)

    // 4) Persist mapping
    assignments.byTokenId[key] = free
    assignments.usedCodes[free] = true
    await fs.writeFile(JSON_PATH, JSON.stringify(assignments, null, 2), "utf8")

    return free
  } catch (error) {
    console.error("[v0] Error in assignInviteCode:", error)
    return null
  }
}
