"use client"

import { useEffect, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { getProviderSafe } from "@/lib/wallet/getProvider"
import { getOwnedTokenIds } from "@/lib/piggy/checkHolder"

type Status = "idle" | "checking" | "ready" | "error"

interface UserIdentity {
  wallet_address: string
  token_id?: number
  discord_id?: string
  discord_username?: string
  twitter_id?: string
  twitter_username?: string
  email?: string
}

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
  const [tournamentName, setTournamentName] = useState<string>("PIGGY SUMMER POKER")

  const [identity, setIdentity] = useState<UserIdentity | null>(null)
  const [email, setEmail] = useState<string>("")
  const [identityLoading, setIdentityLoading] = useState(false)

  useEffect(() => {
    const loadTournamentInfo = async () => {
      try {
        const response = await fetch("/api/tournament-info")
        const data = await response.json()
        if (data.url) {
          setTournamentUrl(data.url)
        }
        if (data.name) {
          setTournamentName(data.name)
        }
      } catch (error) {
        console.error("Failed to load tournament info:", error)
      }
    }

    loadTournamentInfo()
  }, [])

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

  useEffect(() => {
    const loadIdentity = async () => {
      if (!address || !isConnected) {
        setIdentity(null)
        return
      }

      try {
        const response = await fetch(`/api/identity?address=${address}`)
        const data = await response.json()
        setIdentity(data.identity)
      } catch (error) {
        console.error("Error loading identity:", error)
      }
    }

    loadIdentity()
  }, [address, isConnected])

  const connectDiscord = async () => {
    if (!address || !tokenId) return

    setIdentityLoading(true)
    try {
      // Simulate Discord OAuth (in real implementation, this would redirect to Discord OAuth)
      const mockDiscordData = {
        id: "123456789",
        username: "user#1234",
      }

      const response = await fetch("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          tokenId: Number(tokenId),
          type: "discord",
          data: mockDiscordData,
        }),
      })

      if (response.ok) {
        setIdentity((prev) =>
          prev
            ? {
                ...prev,
                discord_id: mockDiscordData.id,
                discord_username: mockDiscordData.username,
              }
            : null,
        )
      }
    } catch (error) {
      console.error("Error connecting Discord:", error)
    } finally {
      setIdentityLoading(false)
    }
  }

  const connectTwitter = async () => {
    if (!address || !tokenId) return

    setIdentityLoading(true)
    try {
      // Simulate Twitter OAuth (in real implementation, this would redirect to Twitter OAuth)
      const mockTwitterData = {
        id: "987654321",
        username: "@username",
      }

      const response = await fetch("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          tokenId: Number(tokenId),
          type: "twitter",
          data: mockTwitterData,
        }),
      })

      if (response.ok) {
        setIdentity((prev) =>
          prev
            ? {
                ...prev,
                twitter_id: mockTwitterData.id,
                twitter_username: mockTwitterData.username,
              }
            : null,
        )
      }
    } catch (error) {
      console.error("Error connecting Twitter:", error)
    } finally {
      setIdentityLoading(false)
    }
  }

  const connectEmail = async () => {
    if (!address || !tokenId || !email.trim()) return

    setIdentityLoading(true)
    try {
      const response = await fetch("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          tokenId: Number(tokenId),
          type: "email",
          data: { email: email.trim() },
        }),
      })

      if (response.ok) {
        setIdentity((prev) =>
          prev
            ? {
                ...prev,
                email: email.trim(),
              }
            : null,
        )
        setEmail("")
      }
    } catch (error) {
      console.error("Error connecting email:", error)
    } finally {
      setIdentityLoading(false)
    }
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
          <h1 className="text-4xl md:text-6xl font-bold text-pink-500 glitch neon-text mb-4" data-text={tournamentName}>
            {tournamentName}
          </h1>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Existing Poker Registration Window */}
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

          <div className="cyber-card rounded-lg p-6">
            <h2 className="text-xl font-bold text-pink-500 mb-6 font-mono">CONNECTION</h2>

            {!isConnected ? (
              <div className="text-center py-8">
                <p className="text-pink-400 font-mono mb-4">{">"} CONNECT WALLET TO CONTINUE</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Primary Identity */}
                <div className="border border-pink-500/30 rounded p-4 bg-black/50">
                  <h3 className="text-pink-500 font-mono font-bold mb-2">Primary Identity</h3>
                  <div className="text-pink-400 font-mono text-sm">
                    <div className="mb-1">EVM</div>
                    <div className="text-pink-300 break-all">{address}</div>
                  </div>
                </div>

                {/* Secondary Identities */}
                <div className="border border-pink-500/30 rounded p-4 bg-black/50">
                  <h3 className="text-pink-500 font-mono font-bold mb-4">Secondary Identities</h3>

                  <div className="space-y-4">
                    {/* Discord */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-pink-400 font-mono text-sm">Discord</div>
                        {identity?.discord_username && (
                          <div className="text-green-400 font-mono text-xs">{identity.discord_username}</div>
                        )}
                      </div>
                      <button
                        onClick={connectDiscord}
                        disabled={identityLoading || !tokenId}
                        className="cyber-button px-4 py-1 text-sm font-mono disabled:opacity-50"
                      >
                        {identity?.discord_id ? "Connected" : "Connect"}
                      </button>
                    </div>

                    {/* Twitter */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-pink-400 font-mono text-sm">Twitter</div>
                        {identity?.twitter_username && (
                          <div className="text-green-400 font-mono text-xs">{identity.twitter_username}</div>
                        )}
                      </div>
                      <button
                        onClick={connectTwitter}
                        disabled={identityLoading || !tokenId}
                        className="cyber-button px-4 py-1 text-sm font-mono disabled:opacity-50"
                      >
                        {identity?.twitter_id ? "Connected" : "Connect"}
                      </button>
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="text-pink-400 font-mono text-sm mb-1">Email</div>
                        {identity?.email ? (
                          <div className="text-green-400 font-mono text-xs">{identity.email}</div>
                        ) : (
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            className="w-full bg-black border border-pink-500/30 text-pink-300 font-mono text-sm px-2 py-1 rounded focus:border-pink-500 focus:outline-none"
                          />
                        )}
                      </div>
                      <button
                        onClick={connectEmail}
                        disabled={identityLoading || !tokenId || (!email.trim() && !identity?.email)}
                        className="cyber-button px-4 py-1 text-sm font-mono disabled:opacity-50"
                      >
                        {identity?.email ? "Connected" : "Connect"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
