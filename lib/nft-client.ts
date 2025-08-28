import { createPublicClient, http } from "viem"
import { base } from "viem/chains"

const NFT_ADDRESS = "0x7fa5212be2b53a0bf3ca6b06664232695625f108" as const

export const ERC721_MIN_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const

const publicClient = createPublicClient({
  chain: base,
  transport: http("https://base.llamarpc.com"),
})

export async function getTokenIdForOwner(owner: `0x${string}`): Promise<bigint | null> {
  try {
    console.log("[v0] Checking NFT balance for owner:", owner)

    // First check if user has any NFTs
    const balance = (await publicClient.readContract({
      address: NFT_ADDRESS,
      abi: ERC721_MIN_ABI,
      functionName: "balanceOf",
      args: [owner],
    })) as bigint

    console.log("[v0] NFT balance:", balance.toString())

    if (balance === 0n) {
      console.log("[v0] No NFTs found for this address")
      return null
    }

    const knownTokenIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] // Common early tokenIds

    console.log("[v0] Found", balance.toString(), "NFTs, checking known tokenIds first...")

    // Check known tokenIds first
    for (const tokenId of knownTokenIds) {
      try {
        const tokenOwner = (await publicClient.readContract({
          address: NFT_ADDRESS,
          abi: ERC721_MIN_ABI,
          functionName: "ownerOf",
          args: [BigInt(tokenId)],
        })) as string

        console.log("[v0] TokenId", tokenId, "owner:", tokenOwner)

        if (tokenOwner.toLowerCase() === owner.toLowerCase()) {
          console.log("[v0] Found owned tokenId:", tokenId)
          return BigInt(tokenId)
        }
      } catch (error) {
        console.log("[v0] TokenId", tokenId, "doesn't exist or error:", error)
        continue
      }
    }

    console.log("[v0] Not found in known range, doing broader search...")

    for (let tokenId = 11; tokenId <= 1000; tokenId++) {
      try {
        const tokenOwner = (await publicClient.readContract({
          address: NFT_ADDRESS,
          abi: ERC721_MIN_ABI,
          functionName: "ownerOf",
          args: [BigInt(tokenId)],
        })) as string

        if (tokenOwner.toLowerCase() === owner.toLowerCase()) {
          console.log("[v0] Found owned tokenId:", tokenId)
          return BigInt(tokenId)
        }
      } catch (error) {
        // Token doesn't exist, continue
        continue
      }
    }

    console.log("[v0] No owned tokens found")
    return null
  } catch (error) {
    console.error("[v0] Error in getTokenIdForOwner:", error)
    throw error
  }
}
