"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { getOwnedTokenIds } from "@/lib/piggy/checkHolder"
import { X, Trophy, Medal, Star, Crown, Search } from "lucide-react"
import { PrizesModal } from "./PrizesModal"

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
  const [activeTab, setActiveTab] = useState<"oinkers" | "piggyMakers">("oinkers")
  const [searchQuery, setSearchQuery] = useState("")
  const [piggyPrice, setPiggyPrice] = useState<number | null>(null)

  useEffect(() => {
    fetch("/api/piggy-price")
      .then((res) => res.json())
      .then((data) => {
        if (data.usd) {
          setPiggyPrice(data.usd)
        }
      })
      .catch((err) => console.error("Error fetching PIGGY price:", err))
  }, [])

  // Mock data for Oinkers (formerly Earners)
  const oinkersData = [
    {
      rank: 1,
      user: "0xmoti.eth",
      avatar: "/diverse-user-avatars.png",
      hasFarcaster: true,
      hasX: true,
      completedTasks: 3117,
      claimedUsd: 680.11,
    },
    {
      rank: 2,
      user: "foisai1",
      avatar: "/diverse-user-avatar-set-2.png",
      hasFarcaster: true,
      hasX: true,
      completedTasks: 4766,
      claimedUsd: 516.02,
    },
    {
      rank: 3,
      user: "m--",
      avatar: "/diverse-user-avatars-3.png",
      hasFarcaster: true,
      hasX: true,
      completedTasks: 3370,
      claimedUsd: 461.73,
    },
    {
      rank: 4,
      user: "jumpbox.eth",
      avatar: "/user-avatar-4.png",
      hasFarcaster: true,
      hasX: true,
      completedTasks: 3160,
      claimedUsd: 346.07,
    },
    {
      rank: 5,
      user: "beneto",
      avatar: "/user-avatar-5.png",
      hasFarcaster: true,
      hasX: true,
      completedTasks: 3657,
      claimedUsd: 325.16,
    },
  ]

  // Mock data for Piggy Makers (formerly Creators)
  const piggyMakersData = [
    {
      rank: 1,
      user: "0xBb26...7F06",
      avatar: "/creator-avatar.png",
      created: 978,
      totalSpent: 9798.5,
    },
    {
      rank: 2,
      user: "BizarreBeasts",
      avatar: "/creator-avatar-2.jpg",
      hasFarcaster: true,
      hasX: true,
      created: 182,
      totalSpent: 2608.97,
    },
    {
      rank: 3,
      user: "jumpbox",
      avatar: "/creator-avatar-3.jpg",
      hasFarcaster: true,
      hasX: true,
      created: 100,
      totalSpent: 1192.07,
    },
  ]

  const filteredOinkers = oinkersData.filter((oinker) => oinker.user.toLowerCase().includes(searchQuery.toLowerCase()))

  const filteredPiggyMakers = piggyMakersData.filter((maker) =>
    maker.user.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-6xl mx-4 bg-black border-2 border-pink-500 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-pink-500/30">
          <h1 className="text-3xl font-bold text-white font-mono tracking-wider">LEADERBOARD</h1>
          <button
            onClick={onClose}
            className="p-2 text-pink-500 hover:text-pink-400 hover:bg-pink-500/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab("oinkers")}
            className={`flex-1 px-6 py-4 text-sm font-bold font-mono tracking-wider transition-all ${
              activeTab === "oinkers"
                ? "bg-pink-600/30 text-pink-400 border-b-2 border-pink-500"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-900/50"
            }`}
          >
            OINKERS
          </button>
          <button
            onClick={() => setActiveTab("piggyMakers")}
            className={`flex-1 px-6 py-4 text-sm font-bold font-mono tracking-wider transition-all ${
              activeTab === "piggyMakers"
                ? "bg-pink-600/30 text-pink-400 border-b-2 border-pink-500"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-900/50"
            }`}
          >
            PIGGY MAKERS
          </button>
        </div>

        {/* Search */}
        <div className="p-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder={activeTab === "oinkers" ? "SEARCH FOR OINKER..." : "SEARCH FOR PIGGY MAKER..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-12 py-3 bg-gray-900/50 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 font-mono uppercase text-sm"
            />
          </div>

          {activeTab === "oinkers" && (
            <div className="mt-6 space-y-4">
              <div className="text-gray-500 text-sm font-mono">
                Showing {filteredOinkers.length} of total {oinkersData.length} oinkers
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-[2fr,1fr,1fr] gap-4 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider font-mono border-b border-gray-800">
                <div>OINKER</div>
                <div className="text-center">COMPLETED</div>
                <div className="text-right">EARNED</div>
              </div>

              {/* Table Content */}
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-pink-500 scrollbar-track-transparent">
                {filteredOinkers.map((oinker) => {
                  const piggyAmount = piggyPrice ? (oinker.claimedUsd / piggyPrice).toFixed(2) : "..."

                  return (
                    <div
                      key={oinker.rank}
                      className="grid grid-cols-[2fr,1fr,1fr] gap-4 items-center px-4 py-4 bg-gray-900/30 hover:bg-gray-900/50 rounded-lg border border-gray-800/50 transition-all"
                    >
                      {/* Left: User Info */}
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={oinker.avatar || "/placeholder.svg"}
                            alt={oinker.user}
                            className="w-12 h-12 rounded-full border-2 border-pink-500/50"
                          />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                            {oinker.rank}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{oinker.user}</span>
                            {oinker.hasFarcaster && (
                              <div className="w-4 h-4 bg-purple-500 rounded flex items-center justify-center text-[10px]">
                                F
                              </div>
                            )}
                            {oinker.hasX && (
                              <div className="w-4 h-4 bg-white rounded flex items-center justify-center">
                                <X className="w-3 h-3 text-black" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Center: Completed Tasks */}
                      <div className="text-center">
                        <div className="text-white font-bold text-lg">{oinker.completedTasks}</div>
                      </div>

                      <div className="flex flex-col items-end">
                        <div className="text-white font-bold text-xl">${oinker.claimedUsd.toFixed(2)}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-4 h-4 bg-pink-500 rounded-full"></div>
                          <span className="text-pink-400 font-mono text-sm">{piggyAmount} $PIGGY</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {activeTab === "piggyMakers" && (
            <div className="mt-6 space-y-4">
              {/* Info Text */}
              <div className="text-gray-500 text-sm font-mono">
                Showing {filteredPiggyMakers.length} of total {piggyMakersData.length} piggy makers
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-[2fr,1fr,1fr] gap-4 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider font-mono border-b border-gray-800">
                <div>PIGGY MAKER</div>
                <div className="text-center">CREATED</div>
                <div className="text-right">TOTAL SPENT</div>
              </div>

              {/* Table Content */}
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-pink-500 scrollbar-track-transparent">
                {filteredPiggyMakers.map((maker) => {
                  const piggyAmount = piggyPrice ? (maker.totalSpent / piggyPrice).toFixed(2) : "..."

                  return (
                    <div
                      key={maker.rank}
                      className="grid grid-cols-[2fr,1fr,1fr] gap-4 items-center px-4 py-4 bg-gray-900/30 hover:bg-gray-900/50 rounded-lg border border-gray-800/50 transition-all"
                    >
                      {/* Left: Piggy Maker Info */}
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={maker.avatar || "/placeholder.svg"}
                            alt={maker.user}
                            className="w-12 h-12 rounded-full border-2 border-pink-500/50"
                          />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                            {maker.rank}
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{maker.user}</span>
                            {maker.hasFarcaster && (
                              <div className="w-4 h-4 bg-purple-500 rounded flex items-center justify-center text-[10px]">
                                F
                              </div>
                            )}
                            {maker.hasX && (
                              <div className="w-4 h-4 bg-white rounded flex items-center justify-center">
                                <X className="w-3 h-3 text-black" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Center: Created (oinks count) */}
                      <div className="text-center">
                        <div className="text-white font-bold text-lg">{maker.created}</div>
                      </div>

                      <div className="flex flex-col items-end">
                        <div className="text-white font-bold text-xl">${maker.totalSpent.toFixed(2)}</div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="w-4 h-4 bg-pink-500 rounded-full"></div>
                          <span className="text-pink-400 font-mono text-sm">{piggyAmount} $PIGGY</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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
    window.location.href = `/api/auth/discord?wallet=${encodeURIComponent(address)}&source=market`
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
          source: "market",
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

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Piggy ID */}
            <div className="cyber-card rounded-lg p-6">
              <h2 className="text-xl font-bold text-pink-500 mb-6 font-mono">
                MARKET PROFILE &gt; INITIALIZE YOUR PIGGY ID
              </h2>

              {!isConnected ? (
                <div className="text-center py-8">
                  <p className="text-pink-400 font-mono mb-4">{">"} CONNECT WALLET TO CONTINUE</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Styled YOUR PIGGY ID section to match poker page layout exactly */}
                  <div className="border border-pink-500/30 rounded p-4 bg-black/50">
                    <h3 className="text-pink-500 font-mono font-bold mb-2">YOUR PIGGY ID</h3>
                    <div className="text-pink-400 font-mono text-lg">
                      {identity?.token_id ? (
                        <span className="text-pink-300">#{identity.token_id.toString()}</span>
                      ) : identityLoading ? (
                        <span className="text-yellow-400">Loading...</span>
                      ) : (
                        <span className="text-red-400">No Piggy ID found</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Connections */}
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
                          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.041-.106 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .078.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
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
                            disabled={identityLoading}
                            className="cyber-button px-4 py-1 text-sm font-mono disabled:opacity-50"
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
                              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63a9.935 9.935 0 002.4 -4.59z" />
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
                            disabled={identityLoading}
                            className="cyber-button px-4 py-1 text-sm font-mono disabled:opacity-50"
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
                              <path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zM12.186 5.062c-3.36 0-6.186 2.494-6.186 5.625 0 1.124.372 2.16 1.003 3.002l-.75 2.249 2.25-.75c.842.631 1.878 1.003 3.002 1.003h.362c3.36 0 6.186-2.494 6.186-5.625s-2.826-5.625-6.186-5.625h-.681zm3.372 7.5c-.186.186-.434.279-.681.279s-.495-.093-.681-.279l-1.5-1.5c-.186-.186-.434-.434-.279-.681s.093-.495.279-.681.434-.279.681-.279.495.093.681.279l.819.819 2.319-2.319c.186-.186.434-.279.681-.279s.495.093.681.279-.279.434-.279.681-.093.495-.279.681l-3 3z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-pink-400 font-mono text-sm">Farcaster</div>
                            {identity?.farcaster_username && (
                              <div className="flex items-center gap-2">
                                <div className="text-green-400 font-mono text-xs">{identity.farcaster_username}</div>
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              </div>
                            )}
                          </div>
                        </div>
                        {identity?.farcaster_id ? (
                          <button
                            onClick={() => disconnectPlatform("farcaster")}
                            disabled={identityLoading}
                            className="border border-red-500 text-red-400 hover:text-white hover:border-white px-4 py-1 text-sm font-mono rounded transition-colors disabled:opacity-50"
                          >
                            Disconnect
                          </button>
                        ) : (
                          <button
                            onClick={connectFarcaster}
                            disabled={identityLoading}
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

        {/* Footer */}
        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-pink-500/20 to-pink-600/20 border-2 border-pink-500 text-pink-400 font-mono py-4 rounded-lg hover:bg-pink-500/30 hover:text-pink-300 transition-all duration-300 shadow-lg shadow-pink-500/20"
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

function PrizePool({ amountPiggy }: { amountPiggy: number }) {
  const [piggyPriceUsd, setPiggyPriceUsd] = useState<number | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch("/api/piggy-price")
      .then((res) => res.json())
      .then((data) => {
        if (data.usd) setPiggyPriceUsd(data.usd)
        else setError(true)
      })
      .catch((e) => {
        console.error(e)
        setError(true)
      })
  }, [])

  const usdValue = piggyPriceUsd !== null ? amountPiggy * piggyPriceUsd : null

  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center">
        <span className="text-sm">🪙</span>
      </div>
      <div>
        <div className="font-mono font-bold text-white">{amountPiggy.toLocaleString()} $PIGGY</div>
        {error && <div className="text-xs text-red-400">Price error</div>}
        {!error && usdValue !== null ? (
          <div className="text-xs text-neutral-400">${usdValue.toFixed(2)}</div>
        ) : (
          !error && <div className="text-xs text-neutral-500">Loading...</div>
        )}
      </div>
    </div>
  )
}

// The lint error indicates that `useRouter` is being imported twice.
// The first import is from 'next/navigation', which is correct.
// The second import is also from 'next/navigation', which is redundant.
// We should remove the second import to resolve the lint error.
// import { useRouter } from 'next/navigation' // REMOVED DUPLICATE IMPORT

export default function Page() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const [authStatus, setAuthStatus] = useState<AuthStatus>("disconnected")
  const [loading, setLoading] = useState<boolean>(false)
  const [tokenId, setTokenId] = useState<string | null>(null)
  const [showOverlay, setShowOverlay] = useState<boolean>(true)
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false)
  const [showPrizes, setShowPrizes] = useState<boolean>(false)
  const [showProfile, setShowProfile] = useState<boolean>(false)

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = () => {
      const sessionData = localStorage.getItem("market_session")
      if (sessionData) {
        try {
          const session: UserSession = JSON.parse(sessionData)
          const now = Date.now()
          const sessionAge = now - session.timestamp
          const maxAge = 24 * 60 * 60 * 1000 // 24 hours

          if (sessionAge < maxAge && session.address.toLowerCase() === address?.toLowerCase()) {
            setTokenId(session.tokenId)
            setAuthStatus("authorized")
            setShowOverlay(false)
            return
          }
        } catch (error) {
          console.error("Error parsing session data:", error)
        }
      }

      // If no valid session and wallet is connected, check NFT ownership
      if (isConnected && address) {
        checkNFTOwnership()
      } else {
        setAuthStatus("disconnected")
      }
    }

    checkSession()
  }, [address, isConnected])

  // Watch for wallet changes
  useEffect(() => {
    if (isConnected && address) {
      const sessionData = localStorage.getItem("market_session")
      if (sessionData) {
        try {
          const session: UserSession = JSON.parse(sessionData) // Fixed duplicate JSON.JSON.parse
          if (session.address.toLowerCase() !== address.toLowerCase()) {
            // Wallet changed, re-check NFT ownership
            localStorage.removeItem("market_session")
            setShowOverlay(true)
            checkNFTOwnership()
          }
        } catch (error) {
          console.error("Error parsing session data:", error)
          checkNFTOwnership()
        }
      } else {
        checkNFTOwnership()
      }
    } else {
      setAuthStatus("disconnected")
      setShowOverlay(true)
      localStorage.removeItem("market_session")
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
        localStorage.setItem("market_session", JSON.stringify(session))

        try {
          await fetch("/api/user-identity/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              walletAddress: address,
              tokenId: firstToken.toString(),
            }),
          })
        } catch (error) {
          console.error("Failed to save user to database:", error)
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

  const handleProfileClick = () => {
    setShowProfile(true) // Changed to set state for modal
  }

  return (
    <div className="min-h-screen bg-background cyber-grid relative">
      {/* Overlay Gate */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="cyber-card p-8 max-w-md w-full mx-4 text-center">
            <h2 className="text-2xl font-bold text-primary mb-6 font-mono glitch neon-text" data-text="PIGGY MARKET">
              PIGGY MARKET
            </h2>

            {authStatus === "disconnected" && (
              <div className="space-y-4">
                <p className="text-foreground font-mono">Connect wallet to enter Market</p>
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
                <p className="text-foreground font-mono mb-4">You need a Piggy ID NFT to access Market</p>
                <a
                  href="http://id.piggyworld.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cyber-button inline-block px-6 py-2 font-mono font-bold mb-4"
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
                <p className="text-green-400 font-mono font-bold">Access granted — welcome to Market!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Lobby Content */}
      <div className="min-h-screen p-8">
        <header className="text-center mb-12">
          <h1 className="text-6xl font-bold text-primary glitch neon-text mb-4 font-mono" data-text="PIGGY MARKET">
            PIGGY MARKET
          </h1>
        </header>

        {/* Navigation Buttons */}
        <div className="max-w-md mx-auto flex justify-center gap-4 mb-12">
          <button
            onClick={() => setShowLeaderboard(true)}
            className="cyber-card px-6 py-2 border-pink-500 hover:border-pink-400 transition-colors"
          >
            <span className="text-pink-400 font-mono font-bold text-sm">LEADERBOARD</span>
          </button>

          <button className="cyber-card px-6 py-2 border-blue-500 hover:border-blue-400 transition-colors">
            <span className="text-blue-400 font-mono font-bold text-sm">RULES</span>
          </button>

          <button
            onClick={() => setShowPrizes(true)}
            className="cyber-card px-6 py-2 border-orange-500 hover:border-orange-400 transition-colors"
          >
            <span className="text-orange-400 font-mono font-bold text-sm">PRIZES</span>
          </button>

          <button
            onClick={handleProfileClick}
            className="cyber-card px-6 py-2 border-cyan-500 hover:border-cyan-400 transition-colors"
          >
            <span className="text-cyan-400 font-mono font-bold text-sm">PROFILE</span>
          </button>

          <button className="cyber-card px-6 py-2 border-green-500 hover:border-green-400 transition-colors">
            <span className="text-green-400 font-mono font-bold text-sm whitespace-nowrap">CREATE OINK</span>
          </button>
        </div>

        {/* Quests Table */}
        <div className="max-w-7xl mx-auto mb-12">
          <div className="cyber-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-pink-500/30">
                    <th className="text-left p-4 font-mono text-sm text-gray-400 font-normal">OINK MODE</th>
                    <th className="text-left p-4 font-mono text-sm text-gray-400 font-normal">HOW TO OINK</th>
                    <th className="text-left p-4 font-mono text-sm text-gray-400 font-normal">PRIZE POOL</th>
                    <th className="text-left p-4 font-mono text-sm text-gray-400 font-normal">TICK-TOCK</th>
                    <th className="text-left p-4 font-mono text-sm text-gray-400 font-normal">SQUEAL</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1 */}
                  <tr className="border-b border-pink-500/20 hover:bg-pink-500/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <span className="text-xl">🔵</span>
                        </div>
                        <span className="font-mono font-semibold text-white">Hold Piggy</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-300 text-sm">Hold at least 1 000 000 PIGGY tokens in your wallet</span>
                    </td>
                    <td className="p-4">
                      <PrizePool amountPiggy={4000000} />
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-mono font-bold text-pink-400">2h 28m 1s</div>
                        <div className="text-xs text-gray-400">12 days left</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <button className="w-8 h-8 bg-pink-500/20 hover:bg-pink-500/30 rounded-full flex items-center justify-center transition-colors">
                        <span className="text-pink-400">🔔</span>
                      </button>
                    </td>
                  </tr>

                  {/* Row 2 */}
                  <tr className="hover:bg-pink-500/5 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <span className="text-xl">📢</span>
                        </div>
                        <span className="font-mono font-semibold text-white">Boost post</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-gray-300 text-sm">Like and Repost tweet</span>
                    </td>
                    <td className="p-4">
                      <PrizePool amountPiggy={11} />
                    </td>
                    <td className="p-4">
                      <div>
                        <div className="font-mono font-bold text-pink-400">5h 6m 1s</div>
                        <div className="text-xs text-gray-400">2 days left</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <button className="w-8 h-8 bg-pink-500/20 hover:bg-pink-500/30 rounded-full flex items-center justify-center transition-colors">
                        <span className="text-pink-400">🔔</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-12 text-muted-foreground font-mono text-sm">
          <p>Powered by Piggy World • Complete quests and earn tokens</p>
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

      {/* Prizes Modal */}
      {showPrizes && <PrizesModal onClose={() => setShowPrizes(false)} />}
    </div>
  )
}
