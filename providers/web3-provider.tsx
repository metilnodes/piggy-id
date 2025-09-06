"use client"

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useState } from "react"
import { WagmiProvider, http } from "wagmi"
import { mainnet, polygon, optimism, arbitrum, base } from "wagmi/chains"

// Configure supported chains
const config = getDefaultConfig({
  appName: "Piggy ID",
  projectId: "7993ad87-497c-4979-a096-079dab6949fa", // Get one from https://cloud.walletconnect.com
  chains: [mainnet, polygon, optimism, arbitrum, base],
  transports: {
    [mainnet.id]: http("https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID"),
    [polygon.id]: http("https://polygon-mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID"),
    [optimism.id]: http("https://optimism-mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID"),
    [arbitrum.id]: http("https://arbitrum-mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID"),
    [base.id]: http("https://mainnet.base.org"),
  },
})

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
