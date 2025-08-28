import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

// Функция для полной замены кодов
export async function resetAndSyncCodes() {
  try {
    // Очищаем все старые данные
    await sql`DELETE FROM code_usage`
    await sql`DELETE FROM code_assignments`
    await sql`DELETE FROM invite_codes`

    console.log("Старые коды очищены. Новые коды будут загружены при следующем обращении.")
    return { success: true }
  } catch (error) {
    console.error("Ошибка при сбросе кодов:", error)
    return { success: false, error }
  }
}

// Функция для добавления новых кодов (без удаления старых)
export async function addNewCodes() {
  try {
    const response = await fetch(
      "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/poker-now-mtt-tests2-q2jy6PkRdD-invites-PCx5hDbJvozLcZNT3TuFILSQiyiWV4.csv",
    )
    const csvText = await response.text()

    const lines = csvText.split("\n").slice(1) // Пропускаем заголовок
    let addedCount = 0

    for (const line of lines) {
      if (line.trim()) {
        const [code] = line.split(",")
        if (code) {
          // Добавляем только если код еще не существует
          const existing = await sql`
            SELECT id FROM invite_codes WHERE code = ${code.trim()}
          `

          if (existing.length === 0) {
            await sql`
              INSERT INTO invite_codes (code, is_available) 
              VALUES (${code.trim()}, true)
            `
            addedCount++
          }
        }
      }
    }

    console.log(`Добавлено ${addedCount} новых кодов`)
    return { success: true, addedCount }
  } catch (error) {
    console.error("Ошибка при добавлении кодов:", error)
    return { success: false, error }
  }
}
