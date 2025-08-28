"use client"

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useState } from "react"
import { WagmiProvider, http } from "wagmi"
import { base } from "wagmi/chains"

// Configure supported chains
const config = getDefaultConfig({
  appName: "Piggy ID",
  projectId: "7993ad87-497c-4979-a096-079dab6949fa", // Get one from https://cloud.walletconnect.com
  chains: [base],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: true,
})

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      }),
  )

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
