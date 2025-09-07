"use client"

import { useEffect, useState } from "react"
import { useAccount } from "wagmi"
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
    { rank: 5, player: "PixelMaster", score: 14200, reward: "50 PIGGY", rewardType: "points" },
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

        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-pink-500/20 to-pink-600/20 border-2 border-pink-500 text-pink-400 font-mono text-lg py-4 rounded-lg hover:bg-pink-500/30 hover:text-pink-300 transition-all duration-300 shadow-lg shadow-pink-500/20"
          >
            ← BACK TO LOBBY
          </button>
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
        const response = await fetch(`/api/user-identity/get?address=${address}`)
        const data = await response.json()

        if (data.success && data.identity) {
          setIdentity(data.identity)
        } else {
          // If no identity found, try the old API for backward compatibility
          const fallbackResponse = await fetch(`/api/identity?address=${address}`)
          const fallbackData = await fallbackResponse.json()
          setIdentity(fallbackData.identity)
        }
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-6xl mx-4 bg-black border-2 border-pink-500 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-pink-500/30">
          <h1
            className="text-3xl font-bold text-pink-500 glitch neon-text font-mono"
            data-text="PIGGY VEGAS PROFILE > INITIALIZE YOUR PIGGY ID"
          >
            PIGGY VEGAS PROFILE &gt; INITIALIZE YOUR PIGGY ID
          </h1>
          <button
            onClick={onClose}
            className="p-2 text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Piggy ID */}
          <div className="space-y-6">
            <div className="cyber-card p-6 border-pink-500/30">
              <h3 className="text-lg font-bold text-pink-400 font-mono mb-4">YOUR PIGGY ID</h3>
              {identityLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full"></div>
                  <span className="text-gray-400 font-mono">Loading...</span>
                </div>
              ) : identity?.token_id ? (
                <div className="text-3xl font-bold text-white font-mono">#{identity.token_id}</div>
              ) : (
                <div className="text-gray-400 font-mono">No Piggy ID found</div>
              )}
            </div>
          </div>

          {/* Right Column - Connections */}
          <div className="space-y-6">
            <div className="cyber-card p-6 border-pink-500/30">
              <h3 className="text-lg font-bold text-pink-400 font-mono mb-4">CONNECTIONS</h3>

              {/* Primary Identity */}
              <div className="mb-6">
                <h4 className="text-pink-400 font-mono mb-2">Primary Identity</h4>
                <div className="text-sm text-gray-400 font-mono">EVM</div>
                <div className="text-white font-mono break-all text-sm">{address || "Not connected"}</div>
              </div>

              {/* Secondary Identities */}
              <div className="space-y-4">
                <h4 className="text-pink-400 font-mono">Secondary Identities</h4>

                {/* Discord */}
                <div className="flex items-center justify-between p-3 bg-black/50 rounded border border-pink-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">D</span>
                    </div>
                    <div>
                      <div className="font-bold text-white font-mono text-sm">Discord</div>
                      {identity?.discord_username ? (
                        <div className="text-xs text-green-400 font-mono flex items-center">
                          {identity.discord_username} <span className="ml-1 w-2 h-2 bg-green-400 rounded-full"></span>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 font-mono">Not connected</div>
                      )}
                    </div>
                  </div>
                  {identity?.discord_username ? (
                    <button
                      onClick={() => disconnectPlatform("discord")}
                      disabled={identityLoading}
                      className="px-3 py-1 text-xs border border-red-500 text-red-400 hover:bg-red-500/10 rounded font-mono transition-colors disabled:opacity-50"
                    >
                      DISCONNECT
                    </button>
                  ) : (
                    <button
                      onClick={connectDiscord}
                      disabled={identityLoading}
                      className="px-3 py-1 text-xs border border-pink-500 text-pink-400 hover:bg-pink-500/10 rounded font-mono transition-colors disabled:opacity-50"
                    >
                      CONNECT
                    </button>
                  )}
                </div>

                {/* Twitter */}
                <div className="flex items-center justify-between p-3 bg-black/50 rounded border border-pink-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">T</span>
                    </div>
                    <div>
                      <div className="font-bold text-white font-mono text-sm">Twitter</div>
                      {identity?.twitter_username ? (
                        <div className="text-xs text-gray-400 font-mono">@{identity.twitter_username}</div>
                      ) : (
                        <div className="text-xs text-gray-500 font-mono">Not connected</div>
                      )}
                    </div>
                  </div>
                  {identity?.twitter_username ? (
                    <button
                      onClick={() => disconnectPlatform("twitter")}
                      disabled={identityLoading}
                      className="px-3 py-1 text-xs border border-red-500 text-red-400 hover:bg-red-500/10 rounded font-mono transition-colors disabled:opacity-50"
                    >
                      DISCONNECT
                    </button>
                  ) : (
                    <button
                      onClick={connectTwitter}
                      disabled={identityLoading}
                      className="px-3 py-1 text-xs border border-pink-500 text-pink-400 hover:bg-pink-500/10 rounded font-mono transition-colors disabled:opacity-50"
                    >
                      CONNECT
                    </button>
                  )}
                </div>

                {/* Farcaster */}
                <div className="flex items-center justify-between p-3 bg-black/50 rounded border border-pink-500/20">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">F</span>
                    </div>
                    <div>
                      <div className="font-bold text-white font-mono text-sm">Farcaster</div>
                      {identity?.farcaster_username ? (
                        <div className="text-xs text-gray-400 font-mono">@{identity.farcaster_username}</div>
                      ) : (
                        <div className="text-xs text-gray-500 font-mono">Not connected</div>
                      )}
                    </div>
                  </div>
                  {identity?.farcaster_username ? (
                    <button
                      onClick={() => disconnectPlatform("farcaster")}
                      disabled={identityLoading}
                      className="px-3 py-1 text-xs border border-red-500 text-red-400 hover:bg-red-500/10 rounded font-mono transition-colors disabled:opacity-50"
                    >
                      DISCONNECT
                    </button>
                  ) : (
                    <button
                      onClick={connectFarcaster}
                      disabled={identityLoading}
                      className="px-3 py-1 text-xs border border-pink-500 text-pink-400 hover:bg-pink-500/10 rounded font-mono transition-colors disabled:opacity-50"
                    >
                      CONNECT
                    </button>
                  )}
                </div>

                {/* Email */}
                <div className="p-3 bg-black/50 rounded border border-pink-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-white font-mono text-sm">Email</div>
                    {identity?.email && !emailEditing && (
                      <button
                        onClick={editEmail}
                        disabled={identityLoading}
                        className="px-3 py-1 text-xs border border-pink-500 text-pink-400 hover:bg-pink-500/10 rounded font-mono transition-colors disabled:opacity-50"
                      >
                        EDIT
                      </button>
                    )}
                  </div>

                  {emailEditing ? (
                    <div className="space-y-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full px-3 py-2 bg-black border border-pink-500/30 text-white font-mono rounded focus:border-pink-500 focus:outline-none text-sm mb-2"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={connectEmail}
                          disabled={identityLoading || !email.trim()}
                          className="px-3 py-1 text-xs border border-pink-500 text-pink-400 hover:bg-pink-500/10 rounded font-mono transition-colors disabled:opacity-50"
                        >
                          CONNECT
                        </button>
                        <button
                          onClick={cancelEmailEdit}
                          disabled={identityLoading}
                          className="px-3 py-1 text-xs border border-gray-500 text-gray-400 hover:bg-gray-500/10 rounded font-mono transition-colors disabled:opacity-50"
                        >
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : identity?.email ? (
                    <div className="text-xs text-gray-400 font-mono">{identity.email}</div>
                  ) : emailVerificationPending ? (
                    <div className="text-xs text-yellow-400 font-mono">Verification email sent. Check your inbox.</div>
                  ) : (
                    <div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full px-3 py-2 bg-black border border-pink-500/30 text-white font-mono rounded focus:border-pink-500 focus:outline-none text-sm mb-2"
                      />
                      <button
                        onClick={connectEmail}
                        disabled={identityLoading || !email.trim()}
                        className="px-3 py-1 text-xs border border-pink-500 text-pink-400 hover:bg-pink-500/10 rounded font-mono transition-colors disabled:opacity-50"
                      >
                        CONNECT
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-pink-500/20 to-pink-600/20 border-2 border-pink-500 text-pink-400 font-mono text-lg py-4 rounded-lg hover:bg-pink-500/30 hover:text-pink-300 transition-all duration-300 shadow-lg shadow-pink-500/20"
          >
            ← BACK TO LOBBY
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 p-4 rounded-lg border-2 ${
              toast.type === "success"
                ? "bg-green-500/20 border-green-500 text-green-400"
                : "bg-red-500/20 border-red-500 text-red-400"
            } font-mono text-sm z-60`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-pink-500 to-pink-600">
      <h1 className="text-5xl font-bold text-white glitch neon-text mb-8 font-mono" data-text="PIGGY VEGAS">
        PIGGY VEGAS
      </h1>
      <DailyCountdown />
      {/* Other components can be added here */}
    </div>
  )
}
