"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react"

interface RulesModalProps {
  isOpen: boolean
  onClose: () => void
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  if (!isOpen) return null

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
        className={`relative w-full max-w-4xl mx-4 bg-black border-2 border-blue-500 rounded-lg shadow-2xl transform transition-all duration-300 ${
          isVisible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-blue-500/30">
          <h1 className="text-3xl font-bold text-blue-500 glitch neon-text font-mono" data-text="RULES">
            RULES
          </h1>
          <button
            onClick={handleClose}
            className="p-2 text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-transparent">
          <div className="space-y-6">
            {/* General Rules */}
            <div className="border border-blue-500/30 rounded-lg p-4 bg-blue-500/5">
              <div className="flex items-center gap-2 mb-4">
                <Info className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-bold text-blue-400 font-mono">GENERAL RULES</h2>
              </div>
              <ul className="space-y-2 text-gray-300 font-mono text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>You must hold a Piggy ID NFT to access the Market</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Connect your wallet and verify ownership before participating</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>One Piggy ID per wallet - multiple IDs do not provide additional benefits</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>All transactions are recorded on the blockchain</span>
                </li>
              </ul>
            </div>

            {/* Quest Rules */}
            <div className="border border-pink-500/30 rounded-lg p-4 bg-pink-500/5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-pink-400" />
                <h2 className="text-xl font-bold text-pink-400 font-mono">QUEST RULES</h2>
              </div>
              <ul className="space-y-2 text-gray-300 font-mono text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Complete quests to earn $PIGGY tokens</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Quest requirements must be met before claiming rewards</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Each quest has a specific time limit - check the TICK-TOCK column</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Rewards are distributed automatically upon quest completion</span>
                </li>
              </ul>
            </div>

            {/* Leaderboard Rules */}
            <div className="border border-purple-500/30 rounded-lg p-4 bg-purple-500/5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-bold text-purple-400 font-mono">LEADERBOARD RULES</h2>
              </div>
              <ul className="space-y-2 text-gray-300 font-mono text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Rankings are based on completed quests and earned tokens</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Oinkers leaderboard tracks quest completions and earnings</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Piggy Makers leaderboard tracks created quests and total spent</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Leaderboards update in real-time</span>
                </li>
              </ul>
            </div>

            {/* Important Notes */}
            <div className="border border-yellow-500/30 rounded-lg p-4 bg-yellow-500/5">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <h2 className="text-xl font-bold text-yellow-400 font-mono">IMPORTANT NOTES</h2>
              </div>
              <ul className="space-y-2 text-gray-300 font-mono text-sm">
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span>All $PIGGY tokens are virtual currency for entertainment purposes</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span>Play responsibly and never invest more than you can afford</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span>Must be 18+ to participate</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <span>The team reserves the right to modify rules at any time</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-2 border-blue-500 text-blue-400 font-mono text-lg py-4 rounded-lg hover:bg-blue-500/30 hover:text-blue-300 transition-all duration-300 shadow-lg shadow-blue-500/20"
          >
            ← BACK TO LOBBY
          </button>
        </div>
      </div>
    </div>
  )
}
