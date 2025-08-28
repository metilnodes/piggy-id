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
    // Support either "CODE" or "CODE,used" - take first cell
    const first = row.split(",")[0]?.trim()
    if (first) out.push(first)
  }
  return Array.from(new Set(out)) // de-dupe
}

async function loadCodesFromCsv(): Promise<string[]> {
  const raw = await fs.readFile(CSV_PATH, "utf8")
  const lines = raw.split("\n")
  return normalizeCodes(lines)
}

export async function assignInviteCode(tokenId: bigint): Promise<string | null> {
  // 1) Load assignments JSON
  const assignments = await ensureDefaults()
  const key = tokenId.toString()

  // 2) If token already mapped – return existing code
  const existing = assignments.byTokenId[key]
  if (existing) return existing

  // 3) Otherwise iterate available CSV codes and pick first free
  const allCodes = await loadCodesFromCsv()
  const free = allCodes.find((c) => !assignments.usedCodes[c])
  if (!free) return null

  // 4) Persist mapping
  assignments.byTokenId[key] = free
  assignments.usedCodes[free] = true
  await fs.writeFile(JSON_PATH, JSON.stringify(assignments, null, 2), "utf8")

  return free
}
