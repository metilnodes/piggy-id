import { unlinkSync, existsSync, statSync } from "fs"
import { join } from "path"

const problematicFiles = [
  "background-id-old.png",
  "background-id-old2.png",
  "background-id-old3.png",
  "bottom-section.png",
  "favicon.png",
  "piggy-logo.png",
  "placeholder-logo.png",
  "placeholder-logo.svg",
  "placeholder-user.jpg",
  "placeholder.jpg",
]

console.log("[v0] Starting cleanup of problematic files in /public directory...")

let cleanedCount = 0
let errorCount = 0

for (const filename of problematicFiles) {
  const filePath = join(process.cwd(), "public", filename)

  try {
    if (existsSync(filePath)) {
      const stats = statSync(filePath)

      if (stats.isFile()) {
        unlinkSync(filePath)
        console.log(`[v0] ✓ Removed file: ${filename}`)
        cleanedCount++
      } else if (stats.isDirectory()) {
        console.log(`[v0] ⚠ Skipping directory: ${filename} (use rmdir to remove directories)`)
      }
    } else {
      console.log(`[v0] - File not found: ${filename}`)
    }
  } catch (error) {
    console.error(`[v0] ✗ Error processing ${filename}:`, error.message)
    errorCount++
  }
}

console.log(`[v0] Cleanup complete: ${cleanedCount} files removed, ${errorCount} errors`)

if (cleanedCount > 0) {
  console.log("[v0] The EISDIR errors should now be resolved.")
} else {
  console.log("[v0] No files were removed. The EISDIR errors may be caused by other processes.")
}
