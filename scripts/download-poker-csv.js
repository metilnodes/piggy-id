import { writeFileSync } from "fs"
import { join } from "path"

async function downloadPokerCSV() {
  try {
    console.log("[v0] Starting download of poker.csv...")

    const csvUrl = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/poker-Rpf2Up3zmdmxYDLQXrjBO4k56ILRUt.csv"

    const response = await fetch(csvUrl)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const csvContent = await response.text()
    console.log("[v0] Downloaded CSV content, size:", csvContent.length, "characters")

    // Save to public directory
    const publicPath = join(process.cwd(), "public", "poker.csv")
    writeFileSync(publicPath, csvContent, "utf8")

    console.log("[v0] Successfully saved poker.csv to public directory")

    // Show first few lines for verification
    const lines = csvContent.split("\n").slice(0, 5)
    console.log("[v0] First 5 lines of CSV:")
    lines.forEach((line, index) => {
      console.log(`[v0] ${index + 1}: ${line}`)
    })

    // Count total codes
    const totalLines = csvContent.split("\n").length - 1 // -1 for header
    console.log(`[v0] Total invite codes available: ${totalLines}`)
  } catch (error) {
    console.error("[v0] Error downloading poker.csv:", error.message)
  }
}

downloadPokerCSV()
