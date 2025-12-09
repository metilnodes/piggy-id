"use client"

import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { type ReactNode, useState, useEffect } from "react"
import { WagmiProvider, http } from "wagmi"
import { base } from "wagmi/chains"

const WALLETCONNECT_PROJECT_ID = "7993ad87-497c-4979-a096-079dab6949fa"

export const wagmiConfig = getDefaultConfig({
  appName: "Piggy ID",
  projectId: WALLETCONNECT_PROJECT_ID,
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
      <div className="bg-green-900/95 border-2 border-green-500 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="text-green-400 text-2xl">✓</div>
          <div className="flex-1">
            <h3 className="text-green-400 font-mono font-bold mb-2">Preview работает!</h3>
            <p className="text-green-200 text-sm font-mono mb-2">
              Все функции приложения доступны. CORS предупреждения в консоли - это нормально для preview окружения.
            </p>
            <details className="text-green-200 text-xs font-mono">
              <summary className="cursor-pointer hover:text-green-100 mb-2">О CORS предупреждениях</summary>
              <div className="ml-2 mt-2 space-y-2">
                <p>Вы добавили домены в WalletConnect Cloud. Изменения применяются в течение 5-10 минут.</p>
                <p className="text-yellow-300">
                  Совет: Откройте preview в приватном окне браузера чтобы избежать кэширования.
                </p>
              </div>
            </details>
          </div>
          <button onClick={() => setShow(false)} className="text-green-400 hover:text-green-200 text-xl leading-none">
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
