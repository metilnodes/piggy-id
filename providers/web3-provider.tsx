"use client"

import type React from "react"

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useState, useEffect } from "react"
import { WagmiProvider, http } from "wagmi"
import { base } from "wagmi/chains"

const DISABLE_WALLETCONNECT_IN_PREVIEW = true // Set to false to enable WalletConnect

function isV0Preview() {
  if (typeof window === "undefined") return false
  return window.location.hostname.includes("vusercontent.net") || window.location.hostname.includes("v0.app")
}

export const wagmiConfig = getDefaultConfig({
  appName: "Piggy ID",
  projectId:
    DISABLE_WALLETCONNECT_IN_PREVIEW && isV0Preview()
      ? "" // Empty projectId disables WalletConnect
      : "7993ad87-497c-4979-a096-079dab6949fa",
  chains: [base],
  transports: {
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: true,
})

function V0PreviewWarning() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(DISABLE_WALLETCONNECT_IN_PREVIEW && isV0Preview())
  }, [])

  if (!show) return null

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 max-w-2xl w-full mx-4">
      <div className="bg-blue-900/95 border-2 border-blue-500 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="text-blue-400 text-2xl">ℹ️</div>
          <div className="flex-1">
            <h3 className="text-blue-400 font-mono font-bold mb-2">V0 Preview Mode</h3>
            <p className="text-blue-200 text-sm font-mono mb-2">
              WalletConnect временно отключен для корректного отображения preview.
            </p>
            <details className="text-blue-200 text-xs font-mono">
              <summary className="cursor-pointer hover:text-blue-100 mb-2">Как включить обратно</summary>
              <div className="ml-2 mt-2 space-y-2">
                <p>
                  В файле <code className="bg-blue-950 px-1">providers/web3-provider.tsx</code>:
                </p>
                <pre className="bg-blue-950 p-2 rounded text-xs overflow-x-auto">
                  const DISABLE_WALLETCONNECT_IN_PREVIEW = false
                </pre>
                <p className="mt-2">Или добавьте домены в WalletConnect Cloud:</p>
                <ul className="list-disc list-inside ml-2">
                  <li>https://*.vusercontent.net</li>
                  <li>http://localhost:*</li>
                </ul>
              </div>
            </details>
          </div>
          <button onClick={() => setShow(false)} className="text-blue-400 hover:text-blue-200 text-xl leading-none">
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
