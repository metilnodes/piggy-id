"use client"

import { useEffect, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { getOwnedTokenIds } from "@/lib/piggy/checkHolder"

type AuthStatus = "disconnected" | "verifying" | "no-nft" | "authorized"

interface UserSession {
  address: string
  tokenId: string
  timestamp: number
}

export default function PiggyVegasPage() {
  const { address, isConnected } = useAccount()
  const [authStatus, setAuthStatus] = useState<AuthStatus>("disconnected")
  const [tokenId, setTokenId] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      try {
        const sessionData = localStorage.getItem("piggyvegas_session")
        if (sessionData) {
          const session: UserSession = JSON.parse(sessionData)
          // Check if session is less than 24 hours old
          if (Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
            if (address && address.toLowerCase() === session.address.toLowerCase()) {
              setTokenId(BigInt(session.tokenId))
              setAuthStatus("authorized")
              // Small delay to show the success message before hiding overlay
              setTimeout(() => setShowOverlay(false), 1500)
              return
            }
          }
        }
      } catch (error) {
        console.error("Error checking session:", error)
      }

      // Clear invalid session
      localStorage.removeItem("piggyvegas_session")
    }

    if (isConnected && address) {
      checkSession()
    }
  }, [address, isConnected])

  // Auto re-check on wallet change
  useEffect(() => {
    if (isConnected && address) {
      // Clear session if wallet changed
      const sessionData = localStorage.getItem("piggyvegas_session")
      if (sessionData) {
        try {
          const session: UserSession = JSON.parse(sessionData)
          if (session.address.toLowerCase() !== address.toLowerCase()) {
            localStorage.removeItem("piggyvegas_session")
            setAuthStatus("disconnected")
            setShowOverlay(true)
            checkNFTOwnership()
          }
        } catch (error) {
          localStorage.removeItem("piggyvegas_session")
          checkNFTOwnership()
        }
      } else {
        checkNFTOwnership()
      }
    } else {
      setAuthStatus("disconnected")
      setShowOverlay(true)
      setTokenId(null)
    }
  }, [address, isConnected])

  const checkNFTOwnership = async () => {
    if (!isConnected || !address) {
      setAuthStatus("disconnected")
      return
    }

    setLoading(true)
    setAuthStatus("verifying")

    try {
      const ownedTokens = await getOwnedTokenIds(address)
      const firstToken = ownedTokens.length > 0 ? ownedTokens[0] : null

      if (firstToken !== null) {
        setTokenId(firstToken)
        setAuthStatus("authorized")

        // Save session
        const session: UserSession = {
          address: address.toLowerCase(),
          tokenId: firstToken.toString(),
          timestamp: Date.now(),
        }
        localStorage.setItem("piggyvegas_session", JSON.stringify(session))

        // Show success message then hide overlay
        setTimeout(() => setShowOverlay(false), 2000)
      } else {
        setTokenId(null)
        setAuthStatus("no-nft")
      }
    } catch (error) {
      console.error("Error checking NFT ownership:", error)
      setAuthStatus("no-nft")
    } finally {
      setLoading(false)
    }
  }

  const refreshCheck = () => {
    checkNFTOwnership()
  }

  return (
    <div className="min-h-screen bg-background cyber-grid relative">
      {/* Overlay Gate */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="cyber-card p-8 max-w-md w-full mx-4 text-center">
            <h2 className="text-2xl font-bold text-primary mb-6 font-mono glitch neon-text" data-text="PIGGY VEGAS">
              PIGGY VEGAS
            </h2>

            {authStatus === "disconnected" && (
              <div className="space-y-4">
                <p className="text-foreground font-mono">Connect wallet to enter Piggy Vegas</p>
                <div className="inline-block">
                  <ConnectButton.Custom>
                    {({ account, chain, openConnectModal, mounted }) => {
                      return (
                        <div
                          {...(!mounted && {
                            "aria-hidden": true,
                            style: {
                              opacity: 0,
                              pointerEvents: "none",
                              userSelect: "none",
                            },
                          })}
                        >
                          <button onClick={openConnectModal} className="cyber-button px-6 py-3 font-mono font-bold">
                            CONNECT WALLET
                          </button>
                        </div>
                      )
                    }}
                  </ConnectButton.Custom>
                </div>
              </div>
            )}

            {authStatus === "verifying" && (
              <div className="space-y-4">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-foreground font-mono">Checking your Piggy ID...</p>
              </div>
            )}

            {authStatus === "no-nft" && (
              <div className="space-y-4">
                <p className="text-foreground font-mono mb-4">You need a Piggy ID NFT to access Piggy Vegas</p>
                <a
                  href="http://id.piggyworld.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cyber-button inline-block px-6 py-3 font-mono font-bold mb-4"
                >
                  Mint Piggy ID to play
                </a>
                <div>
                  <button
                    onClick={refreshCheck}
                    disabled={loading}
                    className="border border-muted text-muted-foreground hover:text-foreground hover:border-foreground px-4 py-2 text-sm font-mono rounded transition-colors disabled:opacity-50"
                  >
                    {loading ? "Checking..." : "Refresh check"}
                  </button>
                </div>
              </div>
            )}

            {authStatus === "authorized" && (
              <div className="space-y-4">
                <div className="text-primary font-mono">
                  Your Piggy ID: <span className="text-accent-foreground">#{tokenId?.toString()}</span>
                </div>
                <p className="text-green-400 font-mono font-bold">Access granted — welcome to Piggy Vegas!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Lobby Content */}
      <div className="min-h-screen p-8">
        <header className="text-center mb-12">
          <h1 className="text-6xl font-bold text-primary glitch neon-text mb-4 font-mono" data-text="PIGGY VEGAS">
            PIGGY VEGAS
          </h1>
          <p className="text-xl text-muted-foreground font-mono">Choose your game and enter the action</p>
        </header>

        {/* Gaming Locations Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {/* Wheel of Fortune */}
          <div className="cyber-card p-6 hover:scale-105 transition-transform duration-300 group border-orange-500 hover:border-orange-400">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-orange-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🎡</span>
              </div>
              <h3 className="text-lg font-bold text-orange-400 font-mono">WHEEL OF</h3>
              <h3 className="text-lg font-bold text-orange-400 font-mono -mt-2">FORTUNE</h3>
              <div className="pt-2">
                <button
                  disabled
                  className="cyber-button inline-block px-6 py-2 font-mono font-bold opacity-50 cursor-not-allowed text-sm"
                >
                  COMING SOON
                </button>
              </div>
            </div>
          </div>

          {/* Slots */}
          <div className="cyber-card p-6 hover:scale-105 transition-transform duration-300 group border-yellow-500 hover:border-yellow-400">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🎰</span>
              </div>
              <h3 className="text-lg font-bold text-yellow-400 font-mono">SLOTS</h3>
              <div className="pt-6">
                <button
                  disabled
                  className="cyber-button inline-block px-6 py-2 font-mono font-bold opacity-50 cursor-not-allowed text-sm"
                >
                  COMING SOON
                </button>
              </div>
            </div>
          </div>

          {/* Dice */}
          <div className="cyber-card p-6 hover:scale-105 transition-transform duration-300 group border-green-500 hover:border-green-400">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🎲</span>
              </div>
              <h3 className="text-lg font-bold text-green-400 font-mono">DICE</h3>
              <div className="pt-6">
                <button
                  disabled
                  className="cyber-button inline-block px-6 py-2 font-mono font-bold opacity-50 cursor-not-allowed text-sm"
                >
                  COMING SOON
                </button>
              </div>
            </div>
          </div>

          {/* Blackjack */}
          <div className="cyber-card p-6 hover:scale-105 transition-transform duration-300 group border-blue-500 hover:border-blue-400">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🂡</span>
              </div>
              <h3 className="text-lg font-bold text-blue-400 font-mono">BLACKJACK</h3>
              <div className="pt-6">
                <button
                  disabled
                  className="cyber-button inline-block px-6 py-2 font-mono font-bold opacity-50 cursor-not-allowed text-sm"
                >
                  COMING SOON
                </button>
              </div>
            </div>
          </div>

          {/* Poker */}
          <div className="cyber-card p-6 hover:scale-105 transition-transform duration-300 group border-purple-500 hover:border-purple-400">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🎮</span>
              </div>
              <h3 className="text-lg font-bold text-purple-400 font-mono">POKER</h3>
              <p className="text-xs text-purple-300 font-mono">(FRI ONLY)</p>
              <div className="pt-2">
                <a
                  href="/poker"
                  className="cyber-button inline-block px-6 py-2 font-mono font-bold group-hover:scale-110 transition-transform text-sm"
                >
                  ENTER ROOM
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="max-w-md mx-auto flex justify-center gap-4 mt-16">
          <button className="cyber-card px-6 py-3 border-pink-500 hover:border-pink-400 transition-colors">
            <span className="text-pink-400 font-mono font-bold text-sm">LEADERBOARD</span>
          </button>

          <button className="cyber-card px-6 py-3 border-blue-500 hover:border-blue-400 transition-colors">
            <span className="text-blue-400 font-mono font-bold text-sm">RULES</span>
          </button>

          <button className="cyber-card px-6 py-3 border-orange-500 hover:border-orange-400 transition-colors">
            <span className="text-orange-400 font-mono font-bold text-sm">PIGGY PRIZES</span>
          </button>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-muted-foreground font-mono text-sm">
          <p>Powered by Piggy ID • Play Responsibly • 18+</p>
        </footer>
      </div>

      {/* Wallet Connection Button (Top Right) */}
      <div className="fixed top-4 right-4 z-40">
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
                        className="bg-background border border-primary text-primary font-mono text-sm px-4 py-2 rounded hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        CONNECT WALLET
                      </button>
                    )
                  }

                  if (chain.unsupported) {
                    return (
                      <button
                        onClick={openChainModal}
                        className="bg-background border border-destructive text-destructive font-mono text-sm px-4 py-2 rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        WRONG NETWORK
                      </button>
                    )
                  }

                  return (
                    <div className="flex gap-2">
                      <button
                        onClick={openChainModal}
                        className="bg-background border border-primary text-primary font-mono text-xs px-3 py-1 rounded hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        {chain.name}
                      </button>

                      <button
                        onClick={openAccountModal}
                        className="bg-background border border-primary text-primary font-mono text-xs px-3 py-1 rounded hover:bg-primary hover:text-primary-foreground transition-colors"
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
    </div>
  )
}
