export async function getProviderSafe(): Promise<any | null> {
  try {
    if (typeof window === "undefined") return null
    const anyWin = window as any
    const providers = anyWin.ethereum?.providers || (anyWin.ethereum ? [anyWin.ethereum] : [])
    const candidate =
      providers?.find((p: any) => p.isMetaMask || p.isCoinbaseWallet || p.isBraveWallet) || anyWin.ethereum || null
    return candidate ?? null
  } catch (e) {
    console.error("getProviderSafe error:", e)
    return null
  }
}
