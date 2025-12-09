"use client"

import type React from "react"

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useState } from "react"
import { WagmiProvider, http } from "wagmi"
import { base } from "wagmi/chains"

export const wagmiConfig = getDefaultConfig({
  appName: "Piggy ID",
  projectId: "7993ad87-497c-4979-a096-079dab6949fa",
  chains: [base],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: true,
})

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

// Use this to wrap page content when testing in v0.app
export function withWeb3Provider<P extends object>(Component: React.ComponentType<P>): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    const [queryClient] = useState(() => new QueryClient())

    return (
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider modalSize="compact">
            <Component {...props} />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    )
  }
}
