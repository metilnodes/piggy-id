"use client"

import { useState, useEffect } from "react"
import { X, Gift, Trophy, Star, Crown, Coins, Gem } from "lucide-react"
import { useRouter } from "next/navigation"

interface PrizeEntry {
  id: number
  name: string
  description: string
  value: string
  rarity: "legendary" | "epic" | "rare" | "common"
  category: "tokens" | "nft" | "physical" | "access"
  image?: string
}

const mockPrizes: Record<string, PrizeEntry[]> = {
  daily: [
    {
      id: 1,
      name: "Daily PIGGY Tokens",
      description: "Win up to 1000 PIGGY tokens daily",
      value: "50-1000 PIGGY",
      rarity: "common",
      category: "tokens",
    },
    {
      id: 2,
      name: "Rare Piggy NFT",
      description: "Limited edition daily winner NFT",
      value: "1 NFT",
      rarity: "rare",
      category: "nft",
    },
    {
      id: 3,
      name: "VIP Access Pass",
      description: "24h VIP room access",
      value: "1 Day",
      rarity: "epic",
      category: "access",
    },
  ],
  weekly: [
    {
      id: 4,
      name: "Golden Piggy NFT",
      description: "Ultra rare weekly champion NFT",
      value: "1 NFT",
      rarity: "legendary",
      category: "nft",
    },
    {
      id: 5,
      name: "PIGGY Jackpot",
      description: "Massive token reward for weekly winners",
      value: "10,000 PIGGY",
      rarity: "epic",
      category: "tokens",
    },
    {
      id: 6,
      name: "Exclusive Merch",
      description: "Limited edition Piggy Vegas merchandise",
      value: "Physical Item",
      rarity: "rare",
      category: "physical",
    },
  ],
  special: [
    {
      id: 7,
      name: "Diamond Piggy Crown",
      description: "The ultimate Piggy Vegas achievement",
      value: "1 Crown NFT",
      rarity: "legendary",
      category: "nft",
    },
    {
      id: 8,
      name: "Lifetime VIP",
      description: "Permanent VIP access to all games",
      value: "Lifetime",
      rarity: "legendary",
      category: "access",
    },
    {
      id: 9,
      name: "PIGGY Founder Tokens",
      description: "Special founder edition tokens",
      value: "100,000 PIGGY",
      rarity: "legendary",
      category: "tokens",
    },
  ],
  achievements: [
    {
      id: 10,
      name: "First Win Badge",
      description: "Complete your first game",
      value: "100 PIGGY",
      rarity: "common",
      category: "tokens",
    },
    {
      id: 11,
      name: "Streak Master",
      description: "Win 5 games in a row",
      value: "500 PIGGY",
      rarity: "rare",
      category: "tokens",
    },
    {
      id: 12,
      name: "High Roller",
      description: "Bet over 1000 PIGGY in single game",
      value: "VIP Badge",
      rarity: "epic",
      category: "access",
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
      return "text-gray-400 border-gray-400/30 bg-gray-500/10"
  }
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "tokens":
      return <Coins className="w-5 h-5" />
    case "nft":
      return <Gem className="w-5 h-5" />
    case "physical":
      return <Gift className="w-5 h-5" />
    case "access":
      return <Crown className="w-5 h-5" />
    default:
      return <Star className="w-5 h-5" />
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
      router.push("/market")
    }, 300)
  }

  const tabs = [
    { id: "daily", label: "Daily Prizes" },
    { id: "weekly", label: "Weekly Prizes" },
    { id: "special", label: "Special Events", isSpecial: true },
    { id: "achievements", label: "Achievements" },
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockPrizes[activeTab]?.map((prize) => (
              <div
                key={prize.id}
                className={`p-4 rounded-lg border transition-all hover:shadow-lg ${getRarityColor(prize.rarity)} hover:scale-105`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {getCategoryIcon(prize.category)}
                    <span className="text-xs uppercase font-bold opacity-70">{prize.rarity}</span>
                  </div>
                  <Trophy className="w-4 h-4 opacity-50" />
                </div>

                <h3 className="font-bold text-white mb-2">{prize.name}</h3>
                <p className="text-sm text-gray-300 mb-3 line-clamp-2">{prize.description}</p>

                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{prize.value}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-black/30 border border-current/20">
                    {prize.category.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <p className="text-sm text-gray-400 text-center mb-4">
            New prizes added weekly • Check back for limited-time events
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
