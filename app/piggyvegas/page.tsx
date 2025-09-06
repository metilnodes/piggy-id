"use client"

import { useEffect, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
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
  const [piggyId, setPiggyId] = useState<number | null>(null)
  const [piggyIdLoading, setPiggyIdLoading] = useState(false)

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
    const loadPiggyId = async () => {
      if (!address || !isConnected || !isOpen) {
        setPiggyId(null)
        return
      }

      setPiggyIdLoading(true)

      try {
        const response = await fetch(`/api/user-identity/get?wallet=${address}`)
        if (response.ok) {
          const data = await response.json()
          setPiggyId(data.user.token_id)
        } else {
          setPiggyId(null)
        }
      } catch (error) {
        console.error("Error loading Piggy ID:", error)
        setPiggyId(null)
      } finally {
        setPiggyIdLoading(false)
      }
    }

    loadPiggyId()
  }, [address, isConnected, isOpen])

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-6xl mx-4 bg-black border-2 border-pink-500 rounded-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-pink-500/30">
          <h1 className="text-3xl font-bold text-pink-500 glitch neon-text font-mono" data-text="PIGGY PROFILE">
            PIGGY PROFILE
          </h1>
          <button
            onClick={onClose}
            className="p-2 text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div
            className={`absolute top-20 right-6 z-10 p-4 rounded-lg border font-mono text-sm max-w-sm ${
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

        {/* Content */}
        <div className="p-6">
          {!isConnected ? (
            <div className="text-center py-8">
              <p className="text-pink-400 font-mono mb-4">{">"} CONNECT WALLET TO CONTINUE</p>
              <div className="cyber-button inline-block">
                <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Profile Info Panel */}
              <div className="cyber-card rounded-lg p-6">
                <h2 className="text-xl font-bold text-pink-500 mb-6 font-mono">PROFILE INFO &gt; YOUR PIGGY ID</h2>

                <div className="space-y-6">
                  <div className="border border-pink-500/30 rounded p-4 bg-black/50">
                    <h3 className="text-pink-500 font-mono font-bold mb-2">YOUR PIGGY ID</h3>
                    <div className="text-pink-400 font-mono">
                      {identity?.token_id ? (
                        <span className="text-pink-300">#{identity.token_id}</span>
                      ) : (
                        <span className="text-yellow-400">Loading...</span>
                      )}
                    </div>
                  </div>

                  <div className="border border-pink-500/30 rounded p-4 bg-black/50">
                    <h3 className="text-pink-500 font-mono font-bold mb-2">Wallet Address</h3>
                    <div className="text-pink-400 font-mono text-sm break-all">{address}</div>
                  </div>
                </div>
              </div>

              {/* Connections Panel */}
              <div className="cyber-card rounded-lg p-6">
                <h2 className="text-xl font-bold text-pink-500 mb-6 font-mono">CONNECTIONS</h2>

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
                          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 1.114.077.077 0 0 0 3.598 1.15C1.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-pink-400 font-mono text-sm">Discord</div>
                            {identity?.discord_username ? (
                              <div className="text-pink-300 font-mono text-xs">{identity.discord_username}</div>
                            ) : (
                              <div className="text-gray-500 font-mono text-xs">Not connected</div>
                            )}
                          </div>
                        </div>
                        {identity?.discord_username ? (
                          <button
                            onClick={() => disconnectPlatform("discord")}
                            disabled={identityLoading}
                            className="px-3 py-1 text-xs font-mono bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/30 disabled:opacity-50"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={connectDiscord}
                            disabled={identityLoading}
                            className="px-3 py-1 text-xs font-mono bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 rounded hover:bg-indigo-600/30 disabled:opacity-50"
                          >
                            Connect
                          </button>
                        )}
                      </div>

                      {/* Twitter */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-pink-400 font-mono text-sm">Twitter</div>
                            {identity?.twitter_username ? (
                              <div className="text-pink-300 font-mono text-xs">@{identity.twitter_username}</div>
                            ) : (
                              <div className="text-gray-500 font-mono text-xs">Not connected</div>
                            )}
                          </div>
                        </div>
                        {identity?.twitter_username ? (
                          <button
                            onClick={() => disconnectPlatform("twitter")}
                            disabled={identityLoading}
                            className="px-3 py-1 text-xs font-mono bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/30 disabled:opacity-50"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={connectTwitter}
                            disabled={identityLoading}
                            className="px-3 py-1 text-xs font-mono bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded hover:bg-blue-600/30 disabled:opacity-50"
                          >
                            Connect
                          </button>
                        )}
                      </div>

                      {/* Email */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-pink-400 font-mono text-sm">Email</div>
                            {identity?.email ? (
                              <div className="text-pink-300 font-mono text-xs">{identity.email}</div>
                            ) : emailVerificationPending ? (
                              <div className="text-yellow-400 font-mono text-xs">Verification pending</div>
                            ) : (
                              <div className="text-gray-500 font-mono text-xs">Not connected</div>
                            )}
                          </div>
                        </div>
                        {identity?.email ? (
                          <div className="flex gap-2">
                            <button
                              onClick={editEmail}
                              disabled={identityLoading}
                              className="px-3 py-1 text-xs font-mono bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded hover:bg-blue-600/30 disabled:opacity-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => disconnectPlatform("email")}
                              disabled={identityLoading}
                              className="px-3 py-1 text-xs font-mono bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/30 disabled:opacity-50"
                            >
                              Disconnect
                            </button>
                          </div>
                        ) : emailEditing ? (
                          <div className="flex gap-2">
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Enter email"
                              className="px-2 py-1 text-xs font-mono bg-black border border-pink-500/30 rounded text-pink-300 placeholder-gray-500 w-32"
                            />
                            <button
                              onClick={connectEmail}
                              disabled={identityLoading || !email.trim()}
                              className="px-3 py-1 text-xs font-mono bg-green-600/20 text-green-400 border border-green-600/30 rounded hover:bg-green-600/30 disabled:opacity-50"
                            >
                              Send
                            </button>
                            <button
                              onClick={cancelEmailEdit}
                              disabled={identityLoading}
                              className="px-3 py-1 text-xs font-mono bg-gray-600/20 text-gray-400 border border-gray-600/30 rounded hover:bg-gray-600/30 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEmailEditing(true)}
                            disabled={identityLoading}
                            className="px-3 py-1 text-xs font-mono bg-green-600/20 text-green-400 border border-green-600/30 rounded hover:bg-green-600/30 disabled:opacity-50"
                          >
                            Connect
                          </button>
                        )}
                      </div>

                      {/* Farcaster */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-pink-400 font-mono text-sm">Farcaster</div>
                            {identity?.farcaster_username ? (
                              <div className="text-pink-300 font-mono text-xs">@{identity.farcaster_username}</div>
                            ) : (
                              <div className="text-gray-500 font-mono text-xs">Not connected</div>
                            )}
                          </div>
                        </div>
                        {identity?.farcaster_username ? (
                          <button
                            onClick={() => disconnectPlatform("farcaster")}
                            disabled={identityLoading}
                            className="px-3 py-1 text-xs font-mono bg-red-600/20 text-red-400 border border-red-600/30 rounded hover:bg-red-600/30 disabled:opacity-50"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={connectFarcaster}
                            disabled={identityLoading}
                            className="px-3 py-1 text-xs font-mono bg-purple-600/20 text-purple-400 border border-purple-600/30 rounded hover:bg-purple-600/30 disabled:opacity-50"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Back to Lobby Button */}
        <div className="p-6 pt-0 border-t border-pink-500/30">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-lg font-mono font-bold hover:bg-pink-500/30 hover:text-pink-300 transition-all"
          >
            &lt; BACK TO LOBBY
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PiggyVegasPage() {
  const { address, isConnected } = useAccount()
  const [authStatus, setAuthStatus] = useState<AuthStatus>("disconnected")
  const [tokenId, setTokenId] = useState<bigint | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOverlay, setShowOverlay] = useState(true)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

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
      const { getOwnedTokenIds } = await import("@/lib/piggy/checkHolder")
      const ownedTokens = await getOwnedTokenIds(address)
      const firstToken = ownedTokens.length > 0 ? ownedTokens[0] : null

      if (firstToken !== null) {
        setTokenId(firstToken)
        setAuthStatus("authorized")

        try {
          await fetch("/api/user-identity/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              walletAddress: address,
              tokenId: Number(firstToken),
            }),
          })
        } catch (dbError) {
          console.error("Error saving user to database:", dbError)
        }

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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="text-center space-y-8 p-8">
            {authStatus === "disconnected" && (
              <>
                <h2 className="text-4xl font-bold text-pink-500 glitch neon-text font-mono" data-text="ACCESS REQUIRED">
                  ACCESS REQUIRED
                </h2>
                <p className="text-xl text-muted-foreground font-mono">
                  Connect your wallet to verify Piggy ID ownership
                </p>
                <div className="cyber-button">
                  <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
                </div>
              </>
            )}

            {authStatus === "verifying" && (
              <>
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-pink-500 mx-auto"></div>
                <h2 className="text-4xl font-bold text-pink-500 glitch neon-text font-mono" data-text="VERIFYING">
                  VERIFYING
                </h2>
                <p className="text-xl text-muted-foreground font-mono">Checking your Piggy ID...</p>
              </>
            )}

            {authStatus === "no-nft" && (
              <>
                <h2 className="text-4xl font-bold text-red-500 glitch neon-text font-mono" data-text="ACCESS DENIED">
                  ACCESS DENIED
                </h2>
                <p className="text-xl text-muted-foreground font-mono">You need a Piggy ID NFT to access Piggy Vegas</p>
                <div className="space-y-4">
                  <button
                    onClick={() => window.open("https://opensea.io/collection/piggy-id", "_blank")}
                    className="block w-full py-3 px-6 bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-lg font-mono font-bold hover:bg-pink-500/30 hover:text-pink-300 transition-all"
                  >
                    MINT PIGGY ID TO PLAY
                  </button>
                  <button
                    onClick={refreshCheck}
                    disabled={loading}
                    className="block w-full py-3 px-6 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg font-mono font-bold hover:bg-cyan-500/30 hover:text-cyan-300 transition-all disabled:opacity-50"
                  >
                    REFRESH CHECK
                  </button>
                </div>
              </>
            )}

            {authStatus === "authorized" && (
              <>
                <div className="text-6xl mb-4">🐷</div>
                <h2 className="text-4xl font-bold text-green-500 glitch neon-text font-mono" data-text="ACCESS GRANTED">
                  ACCESS GRANTED
                </h2>
                <p className="text-xl text-muted-foreground font-mono">Welcome, Piggy ID #{tokenId?.toString()}!</p>
                <div className="animate-pulse text-pink-400 font-mono">Entering Piggy Vegas...</div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Casino Lobby */}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1
            className="text-6xl md:text-8xl font-bold text-pink-500 glitch neon-text font-mono mb-4"
            data-text="PIGGY VEGAS"
          >
            PIGGY VEGAS
          </h1>
          <DailyCountdown />
        </div>

        {/* Gaming Locations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
          {/* Wheel of Fortune */}
          <button className="group cyber-card p-8 text-center hover:scale-105 transition-all duration-300 border-2 border-orange-500/50 hover:border-orange-400 hover:shadow-lg hover:shadow-orange-400/20">
            <div className="text-4xl mb-4 group-hover:animate-spin">🎡</div>
            <h3 className="text-xl font-bold text-orange-400 font-mono mb-2">WHEEL OF</h3>
            <h3 className="text-xl font-bold text-orange-400 font-mono">FORTUNE</h3>
          </button>

          {/* Slots */}
          <button className="group cyber-card p-8 text-center hover:scale-105 transition-all duration-300 border-2 border-yellow-500/50 hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-400/20">
            <div className="text-4xl mb-4 group-hover:animate-pulse">🎰</div>
            <h3 className="text-xl font-bold text-yellow-400 font-mono">SLOTS</h3>
          </button>

          {/* Dice */}
          <button className="group cyber-card p-8 text-center hover:scale-105 transition-all duration-300 border-2 border-green-500/50 hover:border-green-400 hover:shadow-lg hover:shadow-green-400/20">
            <div className="text-4xl mb-4 group-hover:animate-bounce">🎲</div>
            <h3 className="text-xl font-bold text-green-400 font-mono">DICE</h3>
          </button>

          {/* Blackjack */}
          <button className="group cyber-card p-8 text-center hover:scale-105 transition-all duration-300 border-2 border-blue-500/50 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-400/20">
            <div className="text-4xl mb-4 group-hover:animate-pulse">🃏</div>
            <h3 className="text-xl font-bold text-blue-400 font-mono">BLACKJACK</h3>
          </button>

          {/* Poker */}
          <button className="group cyber-card p-8 text-center hover:scale-105 transition-all duration-300 border-2 border-purple-500/50 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-400/20">
            <div className="text-4xl mb-4 group-hover:animate-pulse">🎮</div>
            <h3 className="text-xl font-bold text-purple-400 font-mono mb-2">POKER</h3>
            <h3 className="text-sm font-bold text-purple-400 font-mono">(FRI ONLY)</h3>
          </button>
        </div>

        {/* Bottom Navigation */}
        <div className="flex justify-center space-x-6">
          <button
            onClick={() => setShowLeaderboard(true)}
            className="cyber-button px-8 py-4 bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-lg font-mono font-bold hover:bg-pink-500/30 hover:text-pink-300 transition-all"
          >
            LEADERBOARD
          </button>
          <button className="cyber-button px-8 py-4 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg font-mono font-bold hover:bg-blue-500/30 hover:text-blue-300 transition-all">
            RULES
          </button>
          <button className="cyber-button px-8 py-4 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg font-mono font-bold hover:bg-orange-500/30 hover:text-orange-300 transition-all">
            PRIZES
          </button>
          <button
            onClick={() => setShowProfile(true)}
            className="cyber-button px-8 py-4 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg font-mono font-bold hover:bg-cyan-500/30 hover:text-cyan-300 transition-all"
          >
            PROFILE
          </button>
        </div>
      </div>

      {/* Modals */}
      <LeaderboardModal isOpen={showLeaderboard} onClose={() => setShowLeaderboard(false)} />
      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  )
}
