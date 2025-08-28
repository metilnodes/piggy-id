import { createPublicClient, http, getAddress } from "viem"
import { base } from "viem/chains"

const CONTRACT = "0x7fa5212be2b53a0bf3ca6b06664232695625f108" as const
const client = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org"),
})

const ERC721_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs)),
  ])
}

export async function getOwnedTokenIds(address: string): Promise<bigint[]> {
  try {
    const owner = getAddress(address)

    const balance = await withTimeout(
      client.readContract({
        address: CONTRACT,
        abi: ERC721_ABI,
        functionName: "balanceOf",
        args: [owner],
      }),
      5000, // 5 second timeout
    )

    if (balance === 0n) return []

    const ownedTokens: bigint[] = []
    const maxTokenId = Math.min(1000, Number(balance) * 50) // Reasonable upper bound

    for (let i = 1; i <= maxTokenId && ownedTokens.length < Number(balance); i++) {
      try {
        const tokenOwner = await withTimeout(
          client.readContract({
            address: CONTRACT,
            abi: ERC721_ABI,
            functionName: "ownerOf",
            args: [BigInt(i)],
          }),
          3000, // 3 second timeout per call
        )

        if (tokenOwner.toLowerCase() === owner.toLowerCase()) {
          ownedTokens.push(BigInt(i))
        }
      } catch (e) {
        continue
      }

      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    return ownedTokens
  } catch (e) {
    console.error("getOwnedTokenIds error:", e)
    return []
  }
}
