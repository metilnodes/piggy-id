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
    console.log("[v0] Checking NFTs for address:", owner)

    const balance = await withTimeout(
      client.readContract({
        address: CONTRACT,
        abi: ERC721_ABI,
        functionName: "balanceOf",
        args: [owner],
      }),
      5000, // 5 second timeout
    )

    console.log("[v0] Balance found:", balance.toString())
    if (balance === 0n) return []

    const ownedTokens: bigint[] = []
    const maxTokenId = 800 // Check more tokens to catch higher IDs like 164

    console.log("[v0] Checking token IDs 1 to", maxTokenId)

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
          console.log("[v0] Found owned token ID:", i)
          ownedTokens.push(BigInt(i))
        }
      } catch (e) {
        // Token doesn't exist or other error, continue
        continue
      }

      if (i % 20 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        console.log("[v0] Checked up to token ID:", i)
      }
    }

    console.log(
      "[v0] Final owned tokens:",
      ownedTokens.map((t) => t.toString()),
    )
    return ownedTokens
  } catch (e) {
    console.error("[v0] getOwnedTokenIds error:", e)
    return []
  }
}
