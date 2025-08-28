export async function getOrAssignInviteCode(tokenId: bigint): Promise<string | null> {
  try {
    const res = await fetch("/api/poker/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId: tokenId.toString() }),
    })

    if (!res.ok) {
      return null
    }

    const json = (await res.json()) as { code?: string }
    return json.code ?? null
  } catch {
    return null
  }
}
