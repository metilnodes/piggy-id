"use client"

import { useEffect, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { getOwnedTokenIds } from "@/lib/piggy/checkHolder"
import { X, Trophy, Medal, Star, Crown } from "lucide-react"

type AuthStatus = "disconnected" | "verifying" | "no-nft" | "authorized"

interface UserSession {
  address: string
  tokenId: string
  timestamp: number
}

interface UserIdentity {
  wallet_address: string
  token_id?: number
  discord_id?: string
  discord_username?: string
  twitter_id?: string
  twitter_username?: string
  email?: string
  farcaster_id?: string
  farcaster_username?: string
  farcaster_display_name?: string
  farcaster_avatar_url?: string
}

interface LeaderboardEntry {
  rank: number
  player: string
  score: number
  reward: string
  rewardType: "gold" | "silver" | "bronze" | "points"
}

const mockData: Record<string, LeaderboardEntry[]> = {
  day1: [
    { rank: 1, player: "CyberPig#1337", score: 15420, reward: "1000 PIGGY", rewardType: "gold" },
    { rank: 2, player: "NeonGamer", score: 12850, reward: "500 PIGGY", rewardType: "silver" },
    { rank: 3, player: "PixelMaster", score: 11200, reward: "250 PIGGY", rewardType: "bronze" },
    { rank: 4, player: "GlitchKing", score: 9800, reward: "100 PIGGY", rewardType: "points" },
    { rank: 5, player: "DataRunner", score: 8500, reward: "50 PIGGY", rewardType: "points" },
  ],
  day2: [
    { rank: 1, player: "NeonGamer", score: 18200, reward: "1000 PIGGY", rewardType: "gold" },
    { rank: 2, player: "CyberPig#1337", score: 16800, reward: "500 PIGGY", rewardType: "silver" },
    { rank: 3, player: "QuantumHacker", score: 14500, reward: "250 PIGGY", rewardType: "bronze" },
    { rank: 4, player: "PixelMaster", score: 12900, reward: "100 PIGGY", rewardType: "points" },
    { rank: 5, player: "VoidWalker", score: 11200, reward: "50 PIGGY", rewardType: "points" },
  ],
  day3: [
    { rank: 1, player: "QuantumHacker", score: 22100, reward: "1000 PIGGY", rewardType: "gold" },
    { rank: 2, player: "NeonGamer", score: 19500, reward: "500 PIGGY", rewardType: "silver" },
    { rank: 3, player: "CyberPig#1337", score: 18200, reward: "250 PIGGY", rewardType: "bronze" },
    { rank: 4, player: "GlitchKing", score: 15800, reward: "100 PIGGY", rewardType: "points" },
    { rank: 5, player: "DataRunner", score: 14200, reward: "50 PIGGY", rewardType: "points" },
  ],
  day4: [
    { rank: 1, player: "CyberPig#1337", score: 25800, reward: "1000 PIGGY", rewardType: "gold" },
    { rank: 2, player: "QuantumHacker", score: 23400, reward: "500 PIGGY", rewardType: "silver" },
    { rank: 3, player: "NeonGamer", score: 21100, reward: "250 PIGGY", rewardType: "bronze" },
    { rank: 4, player: "VoidWalker", score: 18900, reward: "100 PIGGY", rewardType: "points" },
    { rank: 5, player: "PixelMaster", score: 17200, reward: "50 PIGGY", rewardType: "points" },
  ],
  day5: [
    { rank: 1, player: "NeonGamer", score: 28900, reward: "1000 PIGGY", rewardType: "gold" },
    { rank: 2, player: "CyberPig#1337", score: 27200, reward: "500 PIGGY", rewardType: "silver" },
    { rank: 3, player: "QuantumHacker", score: 25600, reward: "250 PIGGY", rewardType: "bronze" },
    { rank: 4, player: "GlitchKing", score: 22800, reward: "100 PIGGY", rewardType: "points" },
    { rank: 5, player: "PixelMaster", score: 20400, reward: "50 PIGGY", rewardType: "points" },
  ],
  summary: [
    { rank: 1, player: "CyberPig#1337", score: 98420, reward: "5000 PIGGY + NFT", rewardType: "gold" },
    { rank: 2, player: "NeonGamer", score: 92550, reward: "3000 PIGGY", rewardType: "silver" },
    { rank: 3, player: "QuantumHacker", score: 85600, reward: "2000 PIGGY", rewardType: "bronze" },
    { rank: 4, player: "GlitchKing", score: 67300, reward: "1000 PIGGY", rewardType: "points" },
    { rank: 5, player: "PixelMaster", score: 61300, reward: "500 PIGGY", rewardType: "points" },
  ],
}

const getRewardIcon = (type: string) => {
  switch (type) {
    case "gold":
      return <Crown className="w-5 h-5 text-yellow-400" />
    case "silver":
      return <Trophy className="w-5 h-5 text-gray-300" />
    case "bronze":
      return <Medal className="w-5 h-5 text-amber-600" />
    default:
      return <Star className="w-5 h-5 text-pink-400" />
  }
}

function DailyCountdown() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0 })
  const [dayNumber, setDayNumber] = useState(1)

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000)

      // Calculate next 4 PM GMT
      const next4PM = new Date(utcNow)
      next4PM.setUTCHours(16, 0, 0, 0) // 4 PM GMT

      // If it's already past 4 PM today, move to tomorrow
      if (utcNow.getTime() >= next4PM.getTime()) {
        next4PM.setUTCDate(next4PM.getUTCDate() + 1)
      }

      const timeDiff = next4PM.getTime() - utcNow.getTime()
      const hours = Math.floor(timeDiff / (1000 * 60 * 60))
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

      setTimeLeft({ hours, minutes })

      // Calculate day number (you can adjust this logic based on your start date)
      const startDate = new Date("2024-01-01T16:00:00Z") // Adjust this to your actual start date
      const daysSinceStart = Math.floor((utcNow.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      setDayNumber(Math.max(1, daysSinceStart))
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <p className="text-xl text-muted-foreground font-mono">
      Day {dayNumber} ends in {timeLeft.hours}h {timeLeft.minutes.toString().padStart(2, "0")}m
    </p>
  )
}

function LeaderboardModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("day1")

  const tabs = [
    { id: "day1", label: "Day 1" },
    { id: "day2", label: "Day 2" },
    { id: "day3", label: "Day 3" },
    { id: "day4", label: "Day 4" },
    { id: "day5", label: "Day 5" },
    { id: "summary", label: "Summary", isSpecial: true },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 bg-black border-2 border-pink-500 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-pink-500/30">
          <h1 className="text-3xl font-bold text-pink-500 glitch neon-text font-mono" data-text="LEADERBOARD">
            LEADERBOARD
          </h1>
          <button
            onClick={onClose}
            className="p-2 text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="p-6 pb-0">
          <div className="flex space-x-1 overflow-x-auto scrollbar-thin scrollbar-thumb-pink-500 scrollbar-track-transparent">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium font-mono rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? tab.isSpecial
                      ? "bg-yellow-500/20 text-yellow-400 border-yellow-400 shadow-lg shadow-yellow-400/20"
                      : "bg-pink-500/20 text-pink-400 border-pink-400 shadow-lg shadow-pink-400/20"
                    : "text-gray-400 border-transparent hover:text-pink-400 hover:border-pink-400/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-pink-500 scrollbar-track-transparent">
          <div className="space-y-2">
            {mockData[activeTab]?.map((entry, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border transition-all hover:shadow-lg ${
                  entry.rank === 1
                    ? "bg-yellow-500/10 border-yellow-400/30 hover:shadow-yellow-400/20"
                    : entry.rank === 2
                      ? "bg-gray-300/10 border-gray-300/30 hover:shadow-gray-300/20"
                      : entry.rank === 3
                        ? "bg-amber-600/10 border-amber-600/30 hover:shadow-amber-600/20"
                        : "bg-pink-500/5 border-pink-500/20 hover:shadow-pink-500/20"
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full font-bold font-mono ${
                      entry.rank === 1
                        ? "bg-yellow-400 text-black"
                        : entry.rank === 2
                          ? "bg-gray-300 text-black"
                          : entry.rank === 3
                            ? "bg-amber-600 text-white"
                            : "bg-pink-500 text-white"
                    }`}
                  >
                    {entry.rank}
                  </div>
                  <div>
                    <div className="font-medium text-white font-mono">{entry.player}</div>
                    <div className="text-sm text-gray-400 font-mono">{entry.score.toLocaleString()} points</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getRewardIcon(entry.rewardType)}
                  <span
                    className={`font-medium font-mono ${
                      entry.rewardType === "gold"
                        ? "text-yellow-400"
                        : entry.rewardType === "silver"
                          ? "text-gray-300"
                          : entry.rewardType === "bronze"
                            ? "text-amber-600"
                            : "text-pink-400"
                    }`}
                  >
                    {entry.reward}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 text-center">
          <p className="text-sm text-gray-400 font-mono">Rankings update every hour • Next update in 23 minutes</p>
        </div>
      </div>
    </div>
  )
}

function ProfileModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { address, isConnected } = useAccount()
  const [identity, setIdentity] = useState<UserIdentity | null>(null)
  const [email, setEmail] = useState<string>("")
  const [emailEditing, setEmailEditing] = useState<boolean>(false)
  const [emailVerificationPending, setEmailVerificationPending] = useState<boolean>(false)
  const [identityLoading, setIdentityLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)
  const [authStatus, setAuthStatus] = useState<AuthStatus>("disconnected")
  const [loading, setLoading] = useState<boolean>(false)
  const [tokenId, setTokenId] = useState<string | null>(null)
  const [showOverlay, setShowOverlay] = useState<boolean>(true)
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false)
  const [showProfile, setShowProfile] = useState<boolean>(false)

  // Load Neynar SIWN script on component mount
  useEffect(() => {
    if (!isOpen) return

    const script = document.createElement("script")
    script.src = "https://neynarxyz.github.io/siwn/raw/1.2.0/index.js"
    script.async = true
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [isOpen])

  useEffect(() => {
    const loadIdentity = async () => {
      if (!address || !isConnected || !isOpen) {
        setIdentity(null)
        return
      }

      setIdentityLoading(true)

      try {
        const response = await fetch(`/api/identity?address=${address}`)
        const data = await response.json()
        setIdentity(data.identity)
      } catch (error) {
        console.error("Error loading identity:", error)
      } finally {
        setIdentityLoading(false)
      }
    }

    loadIdentity()
  }, [address, isConnected, isOpen])

  // Handle URL parameters for OAuth callbacks
  useEffect(() => {
    if (!isOpen) return

    const urlParams = new URLSearchParams(window.location.search)

    if (urlParams.get("success") === "email_verified") {
      setEmailVerificationPending(false)
      setEmailEditing(false)
      setEmail("")
      setToast({
        message: "Email successfully verified and connected to your account!",
        type: "success",
      })

      if (address && isConnected) {
        const loadIdentity = async () => {
          try {
            await new Promise((resolve) => setTimeout(resolve, 1000))
            const response = await fetch(`/api/identity?address=${address}`)
            const data = await response.json()
            setIdentity(data.identity)
          } catch (error) {
            console.error("Error loading identity:", error)
          }
        }
        loadIdentity()
      }
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (urlParams.get("success") === "discord_verified") {
      setToast({
        message: "Discord successfully connected to your account!",
        type: "success",
      })

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
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (urlParams.get("success") === "twitter_verified") {
      setToast({
        message: "Twitter successfully connected to your account!",
        type: "success",
      })

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
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (urlParams.get("farcaster_connected") === "true") {
      setToast({
        message: "Farcaster successfully connected to your account!",
        type: "success",
      })

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
      window.history.replaceState({}, document.title, window.location.pathname)
    }

    if (urlParams.get("error")) {
      const error = urlParams.get("error")
      let errorMessage = "Connection failed. Please try again."

      if (error === "discord_already_connected") {
        errorMessage = "This Discord account is already connected to another wallet."
      } else if (error === "twitter_already_connected") {
        errorMessage = "This Twitter account is already connected to another wallet."
      } else if (error === "farcaster_already_connected") {
        errorMessage = "This Farcaster account is already connected to another wallet."
      }

      setToast({
        message: errorMessage,
        type: "error",
      })

      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [address, isConnected, isOpen])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  const connectDiscord = async () => {
    if (!address) return
    window.location.href = `/api/auth/discord?wallet=${encodeURIComponent(address)}`
  }

  const connectTwitter = async () => {
    if (!address) return
    window.location.href = `/api/auth/twitter?wallet=${encodeURIComponent(address)}`
  }

  const connectFarcaster = async () => {
    if (!address) return
    window.location.href = `/api/auth/farcaster?wallet=${encodeURIComponent(address)}`
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

        try {
          await fetch("/api/identity", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              walletAddress: address,
              tokenId: firstToken.toString(),
              type: "piggyvegas_auth",
              data: { timestamp: Date.now() },
            }),
          })
        } catch (error) {
          console.error("Failed to save authentication to database:", error)
        }

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
          <DailyCountdown />
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
          <button
            onClick={() => setShowLeaderboard(true)}
            className="cyber-card px-6 py-3 border-pink-500 hover:border-pink-400 transition-colors"
          >
            <span className="text-pink-400 font-mono font-bold text-sm">LEADERBOARD</span>
          </button>

          <button className="cyber-card px-6 py-3 border-blue-500 hover:border-blue-400 transition-colors">
            <span className="text-blue-400 font-mono font-bold text-sm">RULES</span>
          </button>

          <button className="cyber-card px-6 py-3 border-orange-500 hover:border-orange-400 transition-colors">
            <span className="text-orange-400 font-mono font-bold text-sm">PRIZES</span>
          </button>

          <button
            onClick={() => setShowProfile(true)}
            className="cyber-card px-6 py-3 border-cyan-500 hover:border-cyan-400 transition-colors"
          >
            <span className="text-cyan-400 font-mono font-bold text-sm">PROFILE</span>
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

      {/* Leaderboard Modal */}
      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />

      {/* Profile Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

          {/* Modal */}
          <div className="relative w-full max-w-4xl mx-4 bg-black border-2 border-pink-500 rounded-lg shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-pink-500/30">
              <h1 className="text-3xl font-bold text-pink-500 glitch neon-text font-mono" data-text="PROFILE">
                PROFILE
              </h1>
              <button
                onClick={onClose}
                className="p-2 text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {identityLoading && (
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              )}
              {!identityLoading && (
                <div className="space-y-6">
                  <div className="border border-pink-500/30 rounded p-4 bg-black/50">
                    <h3 className="text-pink-500 font-mono font-bold mb-2">YOUR PIGGY ID</h3>
                    <div className="text-pink-400 font-mono">
                      {identityLoading ? (
                        <span className="text-yellow-400">Loading...</span>
                      ) : identity?.token_id ? (
                        <span className="text-pink-300">#{identity.token_id}</span>
                      ) : (
                        <span className="text-gray-400">No Piggy ID found</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-primary font-mono">
                      Your Wallet Address: <span className="text-accent-foreground">{address}</span>
                    </div>
                    {identity && (
                      <div className="space-y-2">
                        {identity.token_id && (
                          <div className="text-primary font-mono">
                            Your Piggy ID: <span className="text-accent-foreground">#{identity.token_id}</span>
                          </div>
                        )}
                        {identity.discord_username && (
                          <div className="text-primary font-mono">
                            Discord Username:{" "}
                            <span className="text-accent-foreground">{identity.discord_username}</span>
                          </div>
                        )}
                        {identity.twitter_username && (
                          <div className="text-primary font-mono">
                            Twitter Username:{" "}
                            <span className="text-accent-foreground">{identity.twitter_username}</span>
                          </div>
                        )}
                        {identity.email && (
                          <div className="text-primary font-mono">
                            Email: <span className="text-accent-foreground">{identity.email}</span>
                          </div>
                        )}
                        {identity.farcaster_username && (
                          <div className="text-primary font-mono">
                            Farcaster Username:{" "}
                            <span className="text-accent-foreground">{identity.farcaster_username}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {!identity && <div className="text-primary font-mono">No connected identity found.</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 pt-0 text-center">
              <p className="text-sm text-gray-400 font-mono">Connect your social accounts for more features!</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Page() {
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  return (
    <div className="min-h-screen bg-background cyber-grid relative">
      {/* Main Lobby Content */}
      <div className="min-h-screen p-8">
        <header className="text-center mb-12">
          <h1 className="text-6xl font-bold text-primary glitch neon-text mb-4 font-mono" data-text="PIGGY VEGAS">
            PIGGY VEGAS
          </h1>
          <DailyCountdown />
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
          <button
            onClick={() => setShowLeaderboard(true)}
            className="cyber-card px-6 py-3 border-pink-500 hover:border-pink-400 transition-colors"
          >
            <span className="text-pink-400 font-mono font-bold text-sm">LEADERBOARD</span>
          </button>

          <button className="cyber-card px-6 py-3 border-blue-500 hover:border-blue-400 transition-colors">
            <span className="text-blue-400 font-mono font-bold text-sm">RULES</span>
          </button>

          <button className="cyber-card px-6 py-3 border-orange-500 hover:border-orange-400 transition-colors">
            <span className="text-orange-400 font-mono font-bold text-sm">PRIZES</span>
          </button>

          <button
            onClick={() => setShowProfile(true)}
            className="cyber-card px-6 py-3 border-cyan-500 hover:border-cyan-400 transition-colors"
          >
            <span className="text-cyan-400 font-mono font-bold text-sm">PROFILE</span>
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

      {/* Leaderboard Modal */}
      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />

      {/* Profile Modal */}
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  )
}
