// Script to clean up problematic files in public directory that cause EISDIR errors
const fs = require("fs").promises
const path = require("path")

const PROBLEMATIC_FILES = [
  "background-id-old.png",
  "background-id-old2.png",
  "background-id-old3.png",
  "bottom-section.png",
  "favicon.png",
  "placeholder-logo.png",
  "placeholder-logo.svg",
  "placeholder-user.jpg",
  "placeholder.jpg",
  "placeholder.svg",
]

async function cleanupPublicFiles() {
  console.log("[v0] Starting cleanup of problematic public files...")

  const publicDir = path.join(process.cwd(), "public")
  let cleanedCount = 0
  let errorCount = 0

  for (const filename of PROBLEMATIC_FILES) {
    const filePath = path.join(publicDir, filename)

    try {
      // Check if file/directory exists
      const stats = await fs.stat(filePath)

      if (stats.isDirectory()) {
        console.log(`[v0] Removing directory: ${filename}`)
        await fs.rmdir(filePath, { recursive: true })
        cleanedCount++
      } else if (stats.isFile()) {
        console.log(`[v0] Removing file: ${filename}`)
        await fs.unlink(filePath)
        cleanedCount++
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log(`[v0] File not found (already clean): ${filename}`)
      } else {
        console.error(`[v0] Error processing ${filename}:`, error.message)
        errorCount++
      }
    }
  }

  console.log(`[v0] Cleanup complete: ${cleanedCount} items removed, ${errorCount} errors`)

  // Verify public directory still has necessary files
  try {
    const remainingFiles = await fs.readdir(publicDir)
    console.log("[v0] Remaining files in public directory:", remainingFiles)
  } catch (error) {
    console.error("[v0] Error reading public directory:", error.message)
  }
}

cleanupPublicFiles()
  .then(() => {
    console.log("[v0] Public directory cleanup finished successfully")
  })
  .catch((error) => {
    console.error("[v0] Cleanup failed:", error)
    process.exit(1)
  })
