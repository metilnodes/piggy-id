import { NextResponse } from "next/server"

export async function GET() {
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=piggy-2&vs_currencies=usd", {
      // кешируем на 60 секунд, чтобы не долбить API
      next: { revalidate: 60 },
    })

    if (!res.ok) {
      throw new Error(`CG error: ${res.status}`)
    }

    const data = await res.json()
    const priceUsd = data["piggy-2"]?.usd

    if (!priceUsd) {
      throw new Error("No price in response")
    }

    return NextResponse.json({ usd: priceUsd })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "failed to fetch price" }, { status: 500 })
  }
}
