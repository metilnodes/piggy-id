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
  {
    type: "function",
    name: "tokenOfOwnerByIndex",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
    ],
  },
] as const

const transport = http("https://mainnet.base.org")
const publicClient = createPublicClient({ chain: base, transport })

export async function getTokenIdForOwner(owner: `0x${string}`): Promise<bigint | null> {
  try {
    // Try enumerable first
    const balance = (await publicClient.readContract({
      address: NFT_ADDRESS,
      abi: ERC721_MIN_ABI,
      functionName: "balanceOf",
      args: [owner],
    })) as bigint

    if (balance === 0n) return null

    const tokenId = (await publicClient.readContract({
      address: NFT_ADDRESS,
      abi: ERC721_MIN_ABI,
      functionName: "tokenOfOwnerByIndex",
      args: [owner, 0n],
    })) as bigint

    return tokenId
  } catch {
    // Fallback via logs if enumerable not supported
    try {
      const latest = await publicClient.getBlockNumber()
      const from = latest - 1000000n // Look back ~1M blocks

      const logs = await publicClient.getLogs({
        address: NFT_ADDRESS,
        event: {
          type: "event",
          name: "Transfer",
          inputs: [
            { indexed: true, name: "from", type: "address" },
            { indexed: true, name: "to", type: "address" },
            { indexed: true, name: "tokenId", type: "uint256" },
          ],
        } as any,
        fromBlock: from,
        toBlock: latest,
        args: { to: owner },
      })

      // Check ownership of most recent transfers first
      for (let i = logs.length - 1; i >= 0; i--) {
        const tokenId = logs[i].args?.tokenId as bigint
        try {
          const currentOwner = (await publicClient.readContract({
            address: NFT_ADDRESS,
            abi: ERC721_MIN_ABI,
            functionName: "ownerOf",
            args: [tokenId],
          })) as string

          if (currentOwner.toLowerCase() === owner.toLowerCase()) {
            return tokenId
          }
        } catch {
          // Token might be burned, continue
        }
      }
    } catch {
      // Fallback failed too
    }
  }

  return null
}
