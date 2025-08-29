"use client"

import { useEffect, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { getProviderSafe } from "@/lib/wallet/getProvider"
import { getOwnedTokenIds } from "@/lib/piggy/checkHolder"

type Status = "idle" | "checking" | "ready" | "error"

export default function PokerClientPage() {
  const { address, isConnected } = useAccount()
  const [status, setStatus] = useState<Status>("idle")
  const [error, setError] = useState<string>("")
  const [tokenId, setTokenId] = useState<bigint | null>(null)
  const [invite, setInvite] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tournamentUrl, setTournamentUrl] = useState<string>(
    "https://www.pokernow.club/mtt/piggy-summer-poker-NV9_BmueuR",
  )

  useEffect(() => {
    const loadTournamentUrl = async () => {
      try {
        const response = await fetch("/api/tournament-url")
        const data = await response.json()
        if (data.url) {
          setTournamentUrl(data.url)
        }
      } catch (error) {
        console.error("Failed to load tournament URL:", error)
        // Keep default URL if fetch fails
      }
    }

    loadTournamentUrl()
  }, [])

  // Safe wallet initialization
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setStatus("checking")
        const provider = await getProviderSafe()
        if (mounted) setStatus("ready")
      } catch (e: any) {
        console.error("Wallet init error:", e)
        if (mounted) {
          setError(e?.message || "Wallet init failed")
          setStatus("error")
        }
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  const fetchInviteCode = async (tokenId: number, walletAddress: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/poker/invite-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tokenId, walletAddress }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data.inviteCode
    } catch (error) {
      console.error("Error fetching invite code:", error)
      return null
    }
  }

  // NFT and invite code checking
  useEffect(() => {
    let active = true

    const checkNFTAndAssignCode = async () => {
      if (!isConnected || !address || status !== "ready") {
        setTokenId(null)
        setInvite(null)
        return
      }

      setLoading(true)
      setInvite(null)

      try {
        const ownedTokens = await getOwnedTokenIds(address)
        const firstToken = ownedTokens.length > 0 ? ownedTokens[0] : null

        if (!active) return
        setTokenId(firstToken)

        if (firstToken !== null) {
          setInvite("loading")
          const code = await fetchInviteCode(Number(firstToken), address)
          if (!active) return
          setInvite(code || "error")
        } else {
          setInvite(null)
        }
      } catch (error) {
        console.error("Error checking NFT ownership:", error)
        if (active) {
          setError("Failed to check NFT ownership")
          setInvite("error")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    checkNFTAndAssignCode()

    return () => {
      active = false
    }
  }, [address, isConnected, status])

  // Early returns for different states
  if (status === "checking") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-pink-500 font-mono text-xl">Initializing…</div>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="cyber-card rounded-lg p-8 text-center">
          <div className="text-red-500 font-mono text-xl mb-4">Wallet Error</div>
          <div className="text-pink-400 font-mono mb-6">Failed to init wallet: {error}</div>
          <button onClick={() => window.location.reload()} className="cyber-button px-6 py-2 font-mono font-bold">
            REFRESH & TRY AGAIN
          </button>
        </div>
      </div>
    )
  }

  // Header component with updated text
  const Header = () => (
    <header className="fixed top-0 right-0 p-4 z-50">
      <div className="cyber-button">
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const ready = mounted
            const connected = ready && account && chain

            return (
              <div
                {...(!ready && {
                  "aria-hidden": true,
                  style: {
                    opacity: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <button
                        onClick={openConnectModal}
                        className="bg-black border border-pink-500 text-pink-500 font-mono text-sm px-4 py-2 rounded hover:bg-pink-500 hover:text-black transition-colors"
                      >
                        CONNECT WALLET
                      </button>
                    )
                  }

                  if (chain.unsupported) {
                    return (
                      <button
                        onClick={openChainModal}
                        className="bg-black border border-red-500 text-red-500 font-mono text-sm px-4 py-2 rounded hover:bg-red-500 hover:text-black transition-colors"
                      >
                        WRONG NETWORK
                      </button>
                    )
                  }

                  return (
                    <div className="flex gap-2">
                      <button
                        onClick={openChainModal}
                        className="bg-black border border-pink-500 text-pink-500 font-mono text-xs px-3 py-1 rounded"
                      >
                        {chain.name}
                      </button>

                      <button
                        onClick={openAccountModal}
                        className="bg-black border border-pink-500 text-pink-500 font-mono text-xs px-3 py-1 rounded hover:bg-pink-500 hover:text-black transition-colors"
                      >
                        {account.displayName}
                      </button>
                    </div>
                  )
                })()}
              </div>
            )
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  )

  return (
    <div className="min-h-screen bg-black cyber-grid">
      <Header />

      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="text-center mb-8">
          <h1
            className="text-4xl md:text-6xl font-bold text-pink-500 glitch neon-text mb-4"
            data-text="PIGGY SUMMER POKER"
          >
            PIGGY SUMMER POKER
          </h1>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="cyber-card rounded-lg p-6">
            <h2 className="text-xl font-bold text-pink-500 mb-6 font-mono">
              POKER REGISTRATION &gt; INITIALIZE YOUR PIGGY ID
            </h2>

            {!isConnected ? (
              <div className="text-center py-8">
                <p className="text-pink-400 font-mono mb-4">{">"} CONNECT WALLET TO CONTINUE</p>
                <div className="cyber-button inline-block">
                  <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
                </div>
              </div>
            ) : loading ? (
              <div className="text-center py-8">
                <p className="text-pink-400 font-mono">{">"} CHECKING NFT OWNERSHIP...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border border-pink-500/30 rounded p-4 bg-black/50">
                  <h3 className="text-pink-500 font-mono font-bold mb-2">YOUR PIGGY ID</h3>
                  <div className="text-pink-400 font-mono">
                    {tokenId !== null ? (
                      <span className="text-pink-300">#{tokenId.toString()}</span>
                    ) : (
                      <span className="text-red-400">You don't have PIGGY ID</span>
                    )}
                  </div>
                </div>

                {tokenId !== null && (
                  <div className="border border-pink-500/30 rounded p-4 bg-black/50">
                    <h3 className="text-pink-500 font-mono font-bold mb-2">Your invite code</h3>
                    <div className="text-pink-400 font-mono">
                      {invite === "loading" ? (
                        <span className="text-yellow-400">Loading invite code...</span>
                      ) : invite === "error" ? (
                        <span className="text-red-400">Error loading invite code</span>
                      ) : invite ? (
                        <span className="text-green-400 bg-black/70 px-2 py-1 rounded border border-green-500/30">
                          {invite}
                        </span>
                      ) : (
                        <span className="text-yellow-400">Generating invite code...</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="text-center pt-4">
                  {tokenId !== null ? (
                    <a
                      href={tournamentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cyber-button inline-block px-8 py-3 text-lg font-mono font-bold hover:scale-105 transition-transform"
                    >
                      JOIN GAME
                    </a>
                  ) : (
                    <a
                      href="https://id.piggyworld.xyz/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cyber-button inline-block px-8 py-3 text-lg font-mono font-bold hover:scale-105 transition-transform"
                    >
                      Mint your Piggy ID
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
