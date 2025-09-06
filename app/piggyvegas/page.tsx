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
                <div className="cyber-button inline-block">
                  <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
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
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Poker Room */}
          <div className="cyber-card p-6 hover:scale-105 transition-transform duration-300 group">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🃏</span>
              </div>
              <h3 className="text-2xl font-bold text-primary font-mono">POKER ROOM</h3>
              <p className="text-muted-foreground font-mono text-sm">
                High-stakes Texas Hold'em tournaments and cash games
              </p>
              <div className="pt-4">
                <a
                  href="/poker"
                  className="cyber-button inline-block px-8 py-3 font-mono font-bold group-hover:scale-110 transition-transform"
                >
                  ENTER ROOM
                </a>
              </div>
            </div>
          </div>

          {/* Slots Casino */}
          <div className="cyber-card p-6 hover:scale-105 transition-transform duration-300 group">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-secondary/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🎰</span>
              </div>
              <h3 className="text-2xl font-bold text-primary font-mono">SLOTS CASINO</h3>
              <p className="text-muted-foreground font-mono text-sm">
                Spin the reels on our exclusive Piggy-themed slot machines
              </p>
              <div className="pt-4">
                <button
                  disabled
                  className="cyber-button inline-block px-8 py-3 font-mono font-bold opacity-50 cursor-not-allowed"
                >
                  COMING SOON
                </button>
              </div>
            </div>
          </div>

          {/* Blackjack Tables */}
          <div className="cyber-card p-6 hover:scale-105 transition-transform duration-300 group">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-accent/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🂡</span>
              </div>
              <h3 className="text-2xl font-bold text-primary font-mono">BLACKJACK</h3>
              <p className="text-muted-foreground font-mono text-sm">
                Beat the dealer in classic 21 with crypto stakes
              </p>
              <div className="pt-4">
                <button
                  disabled
                  className="cyber-button inline-block px-8 py-3 font-mono font-bold opacity-50 cursor-not-allowed"
                >
                  COMING SOON
                </button>
              </div>
            </div>
          </div>

          {/* Roulette Wheel */}
          <div className="cyber-card p-6 hover:scale-105 transition-transform duration-300 group">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🎡</span>
              </div>
              <h3 className="text-2xl font-bold text-primary font-mono">ROULETTE</h3>
              <p className="text-muted-foreground font-mono text-sm">
                Place your bets on red, black, or your lucky numbers
              </p>
              <div className="pt-4">
                <button
                  disabled
                  className="cyber-button inline-block px-8 py-3 font-mono font-bold opacity-50 cursor-not-allowed"
                >
                  COMING SOON
                </button>
              </div>
            </div>
          </div>

          {/* Sports Betting */}
          <div className="cyber-card p-6 hover:scale-105 transition-transform duration-300 group">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-secondary/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">🏈</span>
              </div>
              <h3 className="text-2xl font-bold text-primary font-mono">SPORTSBOOK</h3>
              <p className="text-muted-foreground font-mono text-sm">Bet on your favorite teams and sporting events</p>
              <div className="pt-4">
                <button
                  disabled
                  className="cyber-button inline-block px-8 py-3 font-mono font-bold opacity-50 cursor-not-allowed"
                >
                  COMING SOON
                </button>
              </div>
            </div>
          </div>

          {/* VIP Lounge */}
          <div className="cyber-card p-6 hover:scale-105 transition-transform duration-300 group">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-accent/20 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl">👑</span>
              </div>
              <h3 className="text-2xl font-bold text-primary font-mono">VIP LOUNGE</h3>
              <p className="text-muted-foreground font-mono text-sm">
                Exclusive high-roller games and premium experiences
              </p>
              <div className="pt-4">
                <button
                  disabled
                  className="cyber-button inline-block px-8 py-3 font-mono font-bold opacity-50 cursor-not-allowed"
                >
                  COMING SOON
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-muted-foreground font-mono text-sm">
          <p>Powered by Piggy ID • Play Responsibly • 18+</p>
        </footer>
      </div>

      {/* Wallet Connection Button (Top Right) */}
      <div className="fixed top-4 right-4 z-40">
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
                          className="bg-background border border-primary text-primary font-mono text-xs px-3 py-1 rounded"
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
    </div>
  )
}
