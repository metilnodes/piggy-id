import { createPublicClient, http, formatUnits } from "viem"
import { base } from "viem/chains"

const PIGGY_TOKEN_ADDRESS = "0xe3CF8dBcBDC9B220ddeaD0bD6342E245DAFF934d"
const PIGGY_DECIMALS = 18

// Create a singleton public client for Base network
let publicClient: ReturnType<typeof createPublicClient> | null = null

function getPublicClient() {
  if (!publicClient) {
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org"
    publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    })
  }
  return publicClient
}

export async function getPiggyBalance(address: string): Promise<string> {
  try {
    const client = getPublicClient()

    const balance = await client.readContract({
      address: PIGGY_TOKEN_ADDRESS as `0x${string}`,
      abi: [
        {
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        },
      ],
      functionName: "balanceOf",
      args: [address as `0x${string}`],
    })

    return formatUnits(balance as bigint, PIGGY_DECIMALS)
  } catch (error) {
    console.error("[v0] Error fetching PIGGY balance:", error)
    return "0"
  }
}

export async function getEthBalance(address: string): Promise<string> {
  try {
    const client = getPublicClient()
    const balance = await client.getBalance({
      address: address as `0x${string}`,
    })

    return formatUnits(balance, 18)
  } catch (error) {
    console.error("[v0] Error fetching ETH balance:", error)
    return "0"
  }
}

export function shortenAddress(address: string): string {
  if (!address) return ""
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function getBasescanUrl(address: string): string {
  return `https://basescan.org/address/${address}`
}
