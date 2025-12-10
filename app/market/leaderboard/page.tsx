"use client"

import { useState, useEffect } from "react"
import { X, Trophy, Medal, Star, Crown } from "lucide-react"
import { useRouter } from "next/navigation"

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
    { rank: 5, player: "DataRunner", score: 20400, reward: "50 PIGGY", rewardType: "points" },
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

export default function LeaderboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("day1")
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
    { id: "day1", label: "Day 1" },
    { id: "day2", label: "Day 2" },
    { id: "day3", label: "Day 3" },
    { id: "day4", label: "Day 4" },
    { id: "day5", label: "Day 5" },
    { id: "summary", label: "Summary", isSpecial: true },
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
          <h1 className="text-3xl font-bold text-pink-500 glitch neon-text" data-text="LEADERBOARD">
            LEADERBOARD
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
                    className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
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
                    <div className="font-medium text-white">{entry.player}</div>
                    <div className="text-sm text-gray-400">{entry.score.toLocaleString()} points</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {getRewardIcon(entry.rewardType)}
                  <span
                    className={`font-medium ${
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
        <div className="p-6 pt-0">
          <p className="text-sm text-gray-400 text-center mb-4">
            Rankings update every hour • Next update in 23 minutes
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
