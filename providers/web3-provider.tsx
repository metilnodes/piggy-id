"use client"

import type React from "react"

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useState, useEffect } from "react"
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

function isV0Preview() {
  if (typeof window === "undefined") return false
  return window.location.hostname.includes("vusercontent.net") || window.location.hostname.includes("v0.app")
}

function V0PreviewWarning() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(isV0Preview())
  }, [])

  if (!show) return null

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4">
      <div className="bg-yellow-900/95 border-2 border-yellow-500 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="text-yellow-400 text-2xl">⚠️</div>
          <div className="flex-1">
            <h3 className="text-yellow-400 font-mono font-bold mb-2">V0 Preview Mode</h3>
            <p className="text-yellow-200 text-sm font-mono mb-2">
              WalletConnect may not work due to CORS restrictions in preview environment.
            </p>
            <details className="text-yellow-200 text-xs font-mono">
              <summary className="cursor-pointer hover:text-yellow-100 mb-2">How to fix for production</summary>
              <ol className="list-decimal list-inside space-y-1 ml-2 mt-2">
                <li>
                  Go to{" "}
                  <a
                    href="https://cloud.walletconnect.com/app/project?projectId=7993ad87-497c-4979-a096-079dab6949fa"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    WalletConnect Cloud Dashboard
                  </a>
                </li>
                <li>
                  Add these origins:
                  <ul className="list-disc list-inside ml-4 mt-1">
                    <li>https://*.vusercontent.net (for v0 preview)</li>
                    <li>http://localhost:* (for local dev)</li>
                    <li>Your production domain</li>
                  </ul>
                </li>
                <li>This only affects preview - production will work fine</li>
              </ol>
            </details>
          </div>
          <button onClick={() => setShow(false)} className="text-yellow-400 hover:text-yellow-200 text-xl leading-none">
            ×
          </button>
        </div>
      </div>
    </div>
  )
}

export function Web3Provider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">
          <V0PreviewWarning />
          {children}
        </RainbowKitProvider>
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
            <V0PreviewWarning />
            <Component {...props} />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    )
  }
}
