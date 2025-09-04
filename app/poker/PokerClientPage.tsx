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
  const [emailEditing, setEmailEditing] = useState<boolean>(false)
  const [emailVerificationPending, setEmailVerificationPending] = useState<boolean>(false)
  const [identityLoading, setIdentityLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

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

      console.log("[v0] Loading identity for address:", address)
      setIdentityLoading(true)

      try {
        const response = await fetch(`/api/identity?address=${address}`)
        const data = await response.json()

        console.log("[v0] Identity API response:", data)
        console.log("[v0] Identity data:", data.identity)
        console.log("[v0] Email field in identity:", data.identity?.email)
        console.log("[v0] Identity object keys:", data.identity ? Object.keys(data.identity) : "null")

        setIdentity(data.identity)
      } catch (error) {
        console.error("[v0] Error loading identity:", error)
      } finally {
        setIdentityLoading(false)
      }
    }

    loadIdentity()
  }, [address, isConnected])

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)

    if (urlParams.get("success") === "email_verified") {
      setEmailVerificationPending(false)
      setEmailEditing(false)
      setEmail("")
      setToast({
        message: "Email successfully verified and connected to your account!",
        type: "success",
      })

      // Reload identity data after successful email verification
      if (address && isConnected) {
        const loadIdentity = async () => {
          try {
            console.log("[v0] Reloading identity after email verification...")
            await new Promise((resolve) => setTimeout(resolve, 1000))
            const response = await fetch(`/api/identity?address=${address}`)
            const data = await response.json()
            console.log("[v0] Updated identity data after email verification:", data.identity)
            console.log("[v0] Email field after verification:", data.identity?.email)
            console.log("[v0] All identity fields:", JSON.stringify(data.identity, null, 2))
            setIdentity(data.identity)
          } catch (error) {
            console.error("Error loading identity:", error)
          }
        }
        loadIdentity()
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (urlParams.get("success") === "discord_verified") {
      const username = urlParams.get("username")
      setToast({
        message: "Discord successfully connected to your account!",
        type: "success",
      })

      // Reload identity data after successful Discord connection
      if (address && isConnected) {
        const loadIdentity = async () => {
          try {
            const response = await fetch(`/api/identity?address=${address}`)
            const data = await response.json()
            setIdentity(data.identity)
          } catch (error) {
            console.error("Error loading identity:", error)
          }
        }
        loadIdentity()
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (urlParams.get("success") === "twitter_verified") {
      const username = urlParams.get("username")
      setToast({
        message: "Twitter successfully connected to your account!",
        type: "success",
      })

      // Reload identity data after successful Twitter connection
      if (address && isConnected) {
        const loadIdentity = async () => {
          try {
            const response = await fetch(`/api/identity?address=${address}`)
            const data = await response.json()
            setIdentity(data.identity)
          } catch (error) {
            console.error("Error loading identity:", error)
          }
        }
        loadIdentity()
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (urlParams.get("error")) {
      const error = urlParams.get("error")
      const help = urlParams.get("help")
      const step = urlParams.get("step")
      let errorMessage = "Connection failed. Please try again."

      if (error === "discord_already_connected") {
        errorMessage = "This Discord account is already connected to another wallet."
      } else if (error === "twitter_already_connected") {
        errorMessage = "This Twitter account is already connected to another wallet."
      } else if (error === "discord_auth_failed") {
        errorMessage = "Discord authorization failed. Please try again."
      } else if (error === "twitter_auth_failed") {
        errorMessage = "Twitter authorization failed. Please try again."
      } else if (error === "twitter_invalid_client") {
        errorMessage =
          help === "check_oauth2_credentials"
            ? "Twitter connection failed: Invalid credentials. Make sure you're using OAuth 2.0 Client ID/Secret (not OAuth 1.0a API Key/Secret) and they're set correctly in your environment variables."
            : "Twitter connection failed: Invalid client credentials."
      } else if (error === "twitter_invalid_grant") {
        errorMessage =
          help === "check_callback_url"
            ? "Twitter connection failed: Callback URL mismatch. Verify the callback URL in your X Developer Portal matches exactly: " +
              window.location.origin +
              "/api/auth/twitter/callback"
            : "Twitter connection failed: Invalid authorization grant."
      } else if (error === "twitter_unauthorized") {
        errorMessage =
          help === "check_dev_portal_settings"
            ? "Twitter connection failed: Unauthorized client. Enable 'User authentication settings' in your X Developer Portal and ensure your app has the required permissions."
            : "Twitter connection failed: Unauthorized client."
      } else if (error === "twitter_invalid_request") {
        errorMessage =
          help === "check_parameters"
            ? "Twitter connection failed: Invalid request parameters. Check your X Developer Portal configuration and callback URL format."
            : "Twitter connection failed: Invalid request."
      } else if (error === "twitter_400_error") {
        errorMessage =
          help === "check_configuration"
            ? "Twitter connection failed: Bad request (400). Common causes: wrong OAuth credentials, callback URL mismatch, or incorrect app configuration in X Developer Portal."
            : "Twitter connection failed: Bad request."
      } else if (error === "twitter_profile_forbidden") {
        errorMessage =
          help === "check_scopes_and_account"
            ? "Twitter connection failed: Profile access forbidden. Ensure 'users.read' scope is granted and your developer account has the required access level."
            : "Twitter connection failed: Profile access forbidden."
      } else if (error === "twitter_config_missing") {
        errorMessage =
          "Twitter connection failed: Missing configuration. TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET must be set in environment variables."
      } else if (error === "twitter_invalid_client_format") {
        errorMessage =
          "Twitter connection failed: Invalid Client ID format. Make sure you're using OAuth 2.0 Client ID (not OAuth 1.0a API Key)."
      } else if (error === "invalid_token") {
        errorMessage = "Invalid verification token. Please request a new verification email."
        setEmailVerificationPending(false)
      } else if (error === "token_expired") {
        errorMessage = "Verification token expired. Please request a new verification email."
        setEmailVerificationPending(false)
      } else if (error === "verification_failed") {
        errorMessage = "Email verification failed. Please try again."
        setEmailVerificationPending(false)
      }

      setToast({
        message: errorMessage,
        type: "error",
      })

      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [address, isConnected])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

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

  const connectDiscord = async () => {
    if (!address) return

    console.log("[v0] Discord Connect button clicked")
    console.log("[v0] Wallet address:", address)
    console.log("[v0] Redirecting to Discord OAuth...")

    // Redirect to Discord OAuth
    window.location.href = `/api/auth/discord?wallet=${encodeURIComponent(address)}`
  }

  const connectTwitter = async () => {
    if (!address) return

    // Redirect to Twitter OAuth
    window.location.href = `/api/auth/twitter?wallet=${encodeURIComponent(address)}`
  }

  const connectEmail = async () => {
    if (!address || !email.trim()) return

    setIdentityLoading(true)
    try {
      const response = await fetch("/api/email/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          email: email.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setEmailVerificationPending(true)
        setEmail("")
        setToast({
          message: "Verification email sent! Please check your inbox and click the verification link.",
          type: "success",
        })
      } else {
        setToast({
          message: data.error || "Failed to send verification email. Please try again.",
          type: "error",
        })
      }
    } catch (error) {
      console.error("Error sending verification email:", error)
      setToast({
        message: "Failed to send verification email. Please try again.",
        type: "error",
      })
    } finally {
      setIdentityLoading(false)
    }
  }

  const editEmail = () => {
    setEmailEditing(true)
    setEmail(identity?.email || "")
  }

  const cancelEmailEdit = () => {
    setEmailEditing(false)
    setEmail("")
  }

  const disconnectPlatform = async (platform: string) => {
    if (!address) return

    setIdentityLoading(true)
    try {
      const response = await fetch("/api/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          platform: platform,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setToast({
          message: `${platform.charAt(0).toUpperCase() + platform.slice(1)} successfully disconnected!`,
          type: "success",
        })

        // Reload identity data
        const identityResponse = await fetch(`/api/identity?address=${address}`)
        const identityData = await identityResponse.json()
        setIdentity(identityData.identity)
      } else {
        setToast({
          message: data.error || `Failed to disconnect ${platform}. Please try again.`,
          type: "error",
        })
      }
    } catch (error) {
      console.error(`Error disconnecting ${platform}:`, error)
      setToast({
        message: `Failed to disconnect ${platform}. Please try again.`,
        type: "error",
      })
    } finally {
      setIdentityLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black cyber-grid">
      <Header />

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg border font-mono text-sm max-w-sm ${
            toast.type === "success"
              ? "bg-green-900/90 border-green-500 text-green-100"
              : "bg-red-900/90 border-red-500 text-red-100"
          }`}
        >
          <div className="flex items-start gap-2">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
              }`}
            >
              {toast.type === "success" ? "✓" : "✕"}
            </div>
            <div className="flex-1">
              {toast.type === "success" && <div className="font-bold mb-1">Successfully signed in!</div>}
              <div>{toast.message}</div>
            </div>
            <button onClick={() => setToast(null)} className="text-gray-400 hover:text-white">
              ✕
            </button>
          </div>
        </div>
      )}

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
            <h2 className="text-xl font-bold text-pink-500 mb-6 font-mono">CONNECTIONS</h2>

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
                      <div className="flex items-center gap-3 flex-1">
                        {/* Add Discord logo */}
                        <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.037-.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-pink-400 font-mono text-sm">Discord</div>
                          {identity?.discord_username && (
                            <div className="flex items-center gap-2">
                              <div className="text-green-400 font-mono text-xs">{identity.discord_username}</div>
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                      {identity?.discord_username ? (
                        <button
                          onClick={() => disconnectPlatform("discord")}
                          disabled={identityLoading}
                          className="border border-red-500 text-red-400 hover:text-white hover:border-white px-4 py-1 text-sm font-mono rounded transition-colors disabled:opacity-50"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={connectDiscord}
                          disabled={identityLoading || !tokenId}
                          className="cyber-button px-4 py-1 text-sm font-mono disabled:opacity-50"
                        >
                          Connect
                        </button>
                      )}
                    </div>

                    {/* Twitter */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {/* Add Twitter logo */}
                        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-pink-400 font-mono text-sm">Twitter</div>
                          {identity?.twitter_username && (
                            <div className="flex items-center gap-2">
                              <div className="text-green-400 font-mono text-xs">{identity.twitter_username}</div>
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                      {identity?.twitter_id ? (
                        <button
                          onClick={() => disconnectPlatform("twitter")}
                          disabled={identityLoading}
                          className="border border-red-500 text-red-400 hover:text-white hover:border-white px-4 py-1 text-sm font-mono rounded transition-colors disabled:opacity-50"
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          onClick={connectTwitter}
                          disabled={identityLoading || !tokenId}
                          className="cyber-button px-4 py-1 text-sm font-mono disabled:opacity-50"
                        >
                          Connect
                        </button>
                      )}
                    </div>

                    {/* Email */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="text-pink-400 font-mono text-sm mb-1">Email</div>
                        {(() => {
                          console.log("[v0] Email display logic - identity?.email:", identity?.email)
                          console.log("[v0] Email display logic - emailEditing:", emailEditing)
                          console.log("[v0] Email display logic - emailVerificationPending:", emailVerificationPending)

                          if (identity?.email && !emailEditing) {
                            return (
                              <div className="text-green-400 bg-black/70 px-2 py-1 rounded border border-green-500/30 font-mono text-xs">
                                {identity.email}
                              </div>
                            )
                          } else if (emailVerificationPending) {
                            return (
                              <div className="text-yellow-400 bg-black/70 px-2 py-1 rounded border border-yellow-500/30 font-mono text-xs">
                                Verification pending - check your email
                              </div>
                            )
                          } else {
                            return (
                              <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full bg-black border border-pink-500/30 text-pink-300 font-mono text-sm px-2 py-1 rounded focus:border-pink-500 focus:outline-none"
                              />
                            )
                          }
                        })()}
                      </div>
                      <div className="flex gap-2">
                        {identity?.email && !emailEditing ? (
                          <>
                            <button onClick={editEmail} className="cyber-button px-4 py-1 text-sm font-mono">
                              Edit
                            </button>
                            <button
                              onClick={() => disconnectPlatform("email")}
                              disabled={identityLoading}
                              className="border border-red-500 text-red-400 hover:text-white hover:border-white px-4 py-1 text-sm font-mono rounded transition-colors disabled:opacity-50"
                            >
                              Disconnect
                            </button>
                          </>
                        ) : emailVerificationPending ? (
                          <button
                            onClick={() => {
                              setEmailVerificationPending(false)
                              setEmail("")
                            }}
                            className="border border-yellow-500 text-yellow-400 hover:text-white hover:border-white px-4 py-1 text-sm font-mono rounded transition-colors"
                          >
                            Resend
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={connectEmail}
                              disabled={identityLoading || !email.trim()}
                              className="cyber-button px-4 py-1 text-sm font-mono disabled:opacity-50"
                            >
                              {identityLoading ? "Sending..." : "Connect"}
                            </button>
                            {emailEditing && (
                              <button
                                onClick={cancelEmailEdit}
                                className="border border-gray-500 text-gray-400 hover:text-white hover:border-white px-4 py-1 text-sm font-mono rounded transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </>
                        )}
                      </div>
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
