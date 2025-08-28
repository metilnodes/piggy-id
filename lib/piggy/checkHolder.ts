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

export async function getOwnedTokenIds(address: string): Promise<bigint[]> {
  try {
    const owner = getAddress(address)

    // Get balance first
    const balance = await client.readContract({
      address: CONTRACT,
      abi: ERC721_ABI,
      functionName: "balanceOf",
      args: [owner],
    })

    if (balance === 0n) return []

    const ownedTokens: bigint[] = []
    for (let i = 1; i <= 1000; i++) {
      try {
        const tokenOwner = await client.readContract({
          address: CONTRACT,
          abi: ERC721_ABI,
          functionName: "ownerOf",
          args: [BigInt(i)],
        })

        if (tokenOwner.toLowerCase() === owner.toLowerCase()) {
          ownedTokens.push(BigInt(i))
        }
      } catch (e) {
        // Token doesn't exist or other error, continue
        continue
      }
    }

    return ownedTokens
  } catch (e) {
    console.error("getOwnedTokenIds error:", e)
    return []
  }
}
