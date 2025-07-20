"use client"

import type React from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit"
import { base, baseSepolia } from "wagmi/chains"
import { injected, metaMask, coinbaseWallet } from "wagmi/connectors"

// Create a simple config without WalletConnect to avoid domain issues
const config = getDefaultConfig({
  appName: "Piggy ID",
  projectId: "piggy-id-app", // Simple project ID, not using WalletConnect
  chains: [base, baseSepolia],
  connectors: [injected(), metaMask(), coinbaseWallet({ appName: "Piggy ID" })],
  ssr: true,
})

const queryClient = new QueryClient()

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
