"use client"

import { useState, useEffect } from "react"
import { X, Gift, Star, Crown, Trophy, Coins } from "lucide-react"
import { useRouter } from "next/navigation"

interface PrizeEntry {
  id: number
  name: string
  description: string
  requirement: string
  reward: string
  rarity: "legendary" | "epic" | "rare" | "common"
  claimed: boolean
}

const mockPrizes: Record<string, PrizeEntry[]> = {
  daily: [
    {
      id: 1,
      name: "Daily Winner",
      description: "Win any game today",
      requirement: "1 Win",
      reward: "100 PIGGY",
      rarity: "common",
      claimed: false,
    },
    {
      id: 2,
      name: "Hot Streak",
      description: "Win 3 games in a row",
      requirement: "3 Consecutive Wins",
      reward: "300 PIGGY",
      rarity: "rare",
      claimed: true,
    },
    {
      id: 3,
      name: "Perfect Day",
      description: "Win 5 games without losing",
      requirement: "5 Wins, 0 Losses",
      reward: "500 PIGGY + NFT",
      rarity: "epic",
      claimed: false,
    },
  ],
  weekly: [
    {
      id: 4,
      name: "Weekly Champion",
      description: "Top the weekly leaderboard",
      requirement: "Rank #1 Weekly",
      reward: "2000 PIGGY",
      rarity: "epic",
      claimed: false,
    },
    {
      id: 5,
      name: "Consistency King",
      description: "Play every day this week",
      requirement: "7 Days Active",
      reward: "1000 PIGGY",
      rarity: "rare",
      claimed: false,
    },
    {
      id: 6,
      name: "High Roller",
      description: "Earn 50,000 points in a week",
      requirement: "50,000 Points",
      reward: "1500 PIGGY",
      rarity: "epic",
      claimed: false,
    },
  ],
  special: [
    {
      id: 7,
      name: "Legendary Pig",
      description: "Ultimate achievement",
      requirement: "Complete All Challenges",
      reward: "10,000 PIGGY + Rare NFT",
      rarity: "legendary",
      claimed: false,
    },
    {
      id: 8,
      name: "First Blood",
      description: "Be the first to win today",
      requirement: "First Daily Win",
      reward: "200 PIGGY",
      rarity: "rare",
      claimed: true,
    },
    {
      id: 9,
      name: "Night Owl",
      description: "Play between 2-4 AM GMT",
      requirement: "Late Night Gaming",
      reward: "150 PIGGY",
      rarity: "common",
      claimed: false,
    },
  ],
  achievements: [
    {
      id: 10,
      name: "Poker Master",
      description: "Win 100 poker games",
      requirement: "100 Poker Wins",
      reward: "5000 PIGGY",
      rarity: "epic",
      claimed: false,
    },
    {
      id: 11,
      name: "Dice Roller",
      description: "Roll double 6s five times",
      requirement: "5x Double 6s",
      reward: "800 PIGGY",
      rarity: "rare",
      claimed: false,
    },
    {
      id: 12,
      name: "Slot Machine",
      description: "Hit jackpot on slots",
      requirement: "Slots Jackpot",
      reward: "3000 PIGGY",
      rarity: "epic",
      claimed: false,
    },
  ],
}

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case "legendary":
      return "text-yellow-400 border-yellow-400/30 bg-yellow-500/10"
    case "epic":
      return "text-purple-400 border-purple-400/30 bg-purple-500/10"
    case "rare":
      return "text-blue-400 border-blue-400/30 bg-blue-500/10"
    default:
      return "text-green-400 border-green-400/30 bg-green-500/10"
  }
}

const getRarityIcon = (rarity: string) => {
  switch (rarity) {
    case "legendary":
      return <Crown className="w-5 h-5 text-yellow-400" />
    case "epic":
      return <Trophy className="w-5 h-5 text-purple-400" />
    case "rare":
      return <Star className="w-5 h-5 text-blue-400" />
    default:
      return <Coins className="w-5 h-5 text-green-400" />
  }
}

export default function PrizesPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("daily")
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      router.push("/piggyvegas")
    }, 300)
  }

  const tabs = [
    { id: "daily", label: "Daily" },
    { id: "weekly", label: "Weekly" },
    { id: "special", label: "Special" },
    { id: "achievements", label: "Achievements", isSpecial: true },
  ]

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div
        className={`relative w-full max-w-4xl mx-4 bg-black border-2 border-pink-500 rounded-lg shadow-2xl transform transition-all duration-300 ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-pink-500/30">
          <h1 className="text-3xl font-bold text-pink-500 glitch neon-text" data-text="PRIZES">
            PRIZES
          </h1>
          <button
            onClick={handleClose}
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
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
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
          <div className="space-y-3">
            {mockPrizes[activeTab]?.map((prize, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-all hover:shadow-lg ${getRarityColor(prize.rarity)} ${
                  prize.claimed ? "opacity-50" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">{getRarityIcon(prize.rarity)}</div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-white">{prize.name}</h3>
                        {prize.claimed && (
                          <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                            CLAIMED
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{prize.description}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        <span className="font-medium">Requirement:</span> {prize.requirement}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <Gift className="w-4 h-4 text-pink-400" />
                      <span className="font-bold text-pink-400">{prize.reward}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1 capitalize">{prize.rarity}</div>
                  </div>
                </div>

                {!prize.claimed && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <button className="w-full bg-gradient-to-r from-pink-500/20 to-pink-600/20 border border-pink-500/50 text-pink-400 font-medium py-2 rounded-lg hover:bg-pink-500/30 hover:text-pink-300 transition-all duration-300">
                      Claim Prize
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <p className="text-sm text-gray-400 text-center mb-4">
            New prizes added daily • Check back for exclusive rewards
          </p>
          <button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-pink-500/20 to-pink-600/20 border-2 border-pink-500 text-pink-400 font-mono text-lg py-4 rounded-lg hover:bg-pink-500/30 hover:text-pink-300 transition-all duration-300 shadow-lg shadow-pink-500/20"
          >
            ← BACK TO LOBBY
          </button>
        </div>
      </div>
    </div>
  )
}
