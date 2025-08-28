// Script to fetch and setup poker invite codes data
const fs = require("fs").promises
const path = require("path")

async function fetchPokerData() {
  try {
    console.log("[v0] Fetching poker CSV data...")

    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/poker-xFpM9vUQ8VZKncNjAKBuf162ZREDIr.csv",
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const csvContent = await response.text()
    console.log("[v0] CSV content received:", csvContent.substring(0, 200) + "...")

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), "data")
    try {
      await fs.access(dataDir)
    } catch {
      await fs.mkdir(dataDir, { recursive: true })
      console.log("[v0] Created data directory")
    }

    // Save CSV file
    const csvPath = path.join(dataDir, "poker-invites.csv")
    await fs.writeFile(csvPath, csvContent)
    console.log("[v0] Saved poker invites CSV to:", csvPath)

    // Create assignments JSON file
    const assignmentsPath = path.join(dataDir, "poker-assignments.json")
    const initialAssignments = {}
    await fs.writeFile(assignmentsPath, JSON.stringify(initialAssignments, null, 2))
    console.log("[v0] Created poker assignments JSON at:", assignmentsPath)

    // Parse CSV and show stats
    const lines = csvContent.trim().split("\n")
    const headers = lines[0].split(",")
    const dataLines = lines.slice(1)

    console.log("[v0] CSV Stats:")
    console.log("- Headers:", headers)
    console.log("- Total invite codes:", dataLines.length)
    console.log(
      "- Sample codes:",
      dataLines.slice(0, 3).map((line) => line.split(",")[0]),
    )

    return {
      totalCodes: dataLines.length,
      sampleCodes: dataLines.slice(0, 5).map((line) => line.split(",")[0]),
    }
  } catch (error) {
    console.error("[v0] Error fetching poker data:", error)

    // Create fallback data if fetch fails
    console.log("[v0] Creating fallback data...")

    const fallbackCodes = [
      "xh4kHSOP_I",
      "mK9pLqR3_X",
      "nB7wEt5Y_Z",
      "vC2sAu8M_Q",
      "jF6dGh1N_P",
      "lH3xKm4R_S",
      "qW9yTn2V_U",
      "rE5bCf7G_J",
      "tY8pLk6M_A",
      "uI4nBv3X_D",
    ]

    const csvContent = "code,consumer_player\n" + fallbackCodes.map((code) => `${code},`).join("\n")

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), "data")
    try {
      await fs.access(dataDir)
    } catch {
      await fs.mkdir(dataDir, { recursive: true })
    }

    // Save fallback CSV
    const csvPath = path.join(dataDir, "poker-invites.csv")
    await fs.writeFile(csvPath, csvContent)

    // Create assignments JSON
    const assignmentsPath = path.join(dataDir, "poker-assignments.json")
    await fs.writeFile(assignmentsPath, JSON.stringify({}, null, 2))

    console.log("[v0] Created fallback data with", fallbackCodes.length, "codes")

    return {
      totalCodes: fallbackCodes.length,
      sampleCodes: fallbackCodes.slice(0, 5),
    }
  }
}

fetchPokerData()
  .then((result) => {
    console.log("[v0] Poker data setup complete:", result)
  })
  .catch(console.error)
