"use client"

import { useEffect, useState } from "react"
import { getPiggyBalance, getEthBalance, shortenAddress, getBasescanUrl } from "@/lib/tips-wallet-utils"
import { ExternalLink, Copy, Check } from "lucide-react"

interface TipsWalletCardProps {
  tipsWalletAddress: string | null | undefined
  tipsGasFundedAt?: string | null
  tipsGasFundingTx?: string | null
}

export function TipsWalletCard({ tipsWalletAddress, tipsGasFundedAt, tipsGasFundingTx }: TipsWalletCardProps) {
  const [piggyBalance, setPiggyBalance] = useState<string | null>(null)
  const [ethBalance, setEthBalance] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!tipsWalletAddress) {
      setPiggyBalance(null)
      setEthBalance(null)
      return
    }

    const fetchBalances = async () => {
      setLoading(true)
      try {
        const [piggy, eth] = await Promise.all([getPiggyBalance(tipsWalletAddress), getEthBalance(tipsWalletAddress)])
        setPiggyBalance(piggy)
        setEthBalance(eth)
      } catch (error) {
        console.error("[v0] Error fetching balances:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchBalances()

    // Refresh balances every 60 seconds
    const interval = setInterval(fetchBalances, 60000)
    return () => clearInterval(interval)
  }, [tipsWalletAddress])

  const copyToClipboard = () => {
    if (tipsWalletAddress) {
      navigator.clipboard.writeText(tipsWalletAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatFundingDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  const isExistingBalance = tipsGasFundingTx?.toLowerCase() === "existing_balance"

  const formatTxHash = (hash: string) => {
    if (!hash || hash.toLowerCase() === "existing_balance") return null
    // Add 0x prefix if missing
    return hash.startsWith("0x") ? hash : `0x${hash}`
  }

  if (!tipsWalletAddress) {
    return (
      <div className="border border-pink-500/30 rounded p-4 bg-black/50">
        <h3 className="text-pink-500 font-mono font-bold mb-2">Tips Wallet (Base)</h3>
        <div className="text-pink-400 font-mono text-sm">
          <div className="text-gray-400 mb-2">Not created yet</div>
          <div className="text-xs text-gray-500">
            Will be created automatically when you receive or send tips in Discord. If you can't see your tips wallet,
            type !balance in Discord and refresh this page.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-pink-500/30 rounded p-4 bg-black/50">
      <h3 className="text-pink-500 font-mono font-bold mb-3">Tips Wallet (Base)</h3>

      {/* Address */}
      <div className="mb-3">
        <div className="text-pink-400 font-mono text-xs mb-1">Address</div>
        <div className="flex items-center gap-2">
          <div className="text-pink-300 font-mono text-sm">{shortenAddress(tipsWalletAddress)}</div>
          <button
            onClick={copyToClipboard}
            className="p-1 hover:bg-pink-500/20 rounded transition-colors"
            title="Copy address"
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-pink-400" />}
          </button>
          <a
            href={getBasescanUrl(tipsWalletAddress)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-pink-500/20 rounded transition-colors"
            title="View on Basescan"
          >
            <ExternalLink className="w-4 h-4 text-pink-400" />
          </a>
        </div>
      </div>

      <div className="mb-3 pb-3 border-b border-pink-500/20">
        <div className="text-pink-400 font-mono text-xs mb-1">Gas Status</div>
        {tipsGasFundedAt ? (
          <div className="flex items-start gap-2">
            <div className="text-green-400 font-mono text-sm flex items-center gap-1">
              <Check className="w-4 h-4" />
              <span>{isExistingBalance ? "Existing balance" : "Gas funded"}</span>
            </div>
            <div className="text-gray-400 font-mono text-xs">{formatFundingDate(tipsGasFundedAt)}</div>
          </div>
        ) : (
          <div className="text-yellow-400 font-mono text-sm">Gas not funded yet</div>
        )}
        {tipsGasFundingTx && !isExistingBalance && (
          <a
            href={`https://basescan.org/tx/${formatTxHash(tipsGasFundingTx)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-400 font-mono text-xs hover:text-pink-300 flex items-center gap-1 mt-1"
          >
            View funding tx
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Balances */}
      {loading ? (
        <div className="text-yellow-400 font-mono text-xs">Loading balances...</div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="text-pink-400 font-mono text-xs">PIGGY Balance</div>
            <div className="text-pink-300 font-mono text-sm">
              {piggyBalance ? Number.parseFloat(piggyBalance).toFixed(2) : "0.00"}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className="text-pink-400 font-mono text-xs">ETH Balance</div>
            <div className="text-pink-300 font-mono text-sm">
              {ethBalance ? Number.parseFloat(ethBalance).toFixed(4) : "0.0000"}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
