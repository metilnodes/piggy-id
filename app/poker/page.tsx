"use client"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, ExternalLink } from "lucide-react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useContractRead } from "wagmi"

// Contract addresses and ABIs
const PIGGY_ID_CONTRACT = "0x7FA5212be2b53A0bF3cA6b06664232695625f108"

// ABI for checking NFT balance
const ERC721_ABI = [
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    name: "tokenOfOwnerByIndex",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const

interface InviteCode {
  code: string
  consumer_player: string | null
}

const PokerPage = () => {
  const { address, isConnected } = useAccount()
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([])
  const [userInviteCode, setUserInviteCode] = useState<string>("")
  const [loading, setLoading] = useState(false)

  // Check NFT balance
  const { data: nftBalance } = useContractRead({
    address: PIGGY_ID_CONTRACT,
    abi: ERC721_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    enabled: !!address,
  })

  // Get first token ID if user has NFTs
  const { data: firstTokenId } = useContractRead({
    address: PIGGY_ID_CONTRACT,
    abi: ERC721_ABI,
    functionName: "tokenOfOwnerByIndex",
    args: address && nftBalance && Number(nftBalance) > 0 ? [address, BigInt(0)] : undefined,
    enabled: !!address && !!nftBalance && Number(nftBalance) > 0,
  })

  // Load invite codes from CSV
  const loadInviteCodes = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/poker-now-mtt-tests2-q2jy6PkRdD-invites-PCx5hDbJvozLcZNT3TuFILSQiyiWV4.csv",
      )
      const csvText = await response.text()

      // Parse CSV
      const lines = csvText.split("\n").filter((line) => line.trim())
      const headers = lines[0].split(",")
      const codes: InviteCode[] = []

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",")
        if (values.length >= 2) {
          codes.push({
            code: values[0].trim(),
            consumer_player: values[1].trim() || null,
          })
        }
      }

      setInviteCodes(codes)
    } catch (error) {
      console.error("Error loading invite codes:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Get available invite code for user
  const getInviteCodeForUser = useCallback(() => {
    if (!address || !firstTokenId) return ""

    // Find an unused code
    const availableCode = inviteCodes.find((code) => !code.consumer_player)
    return availableCode?.code || ""
  }, [address, firstTokenId, inviteCodes])

  useEffect(() => {
    loadInviteCodes()
  }, [loadInviteCodes])

  useEffect(() => {
    if (address && firstTokenId && inviteCodes.length > 0) {
      const code = getInviteCodeForUser()
      setUserInviteCode(code)
    }
  }, [address, firstTokenId, inviteCodes, getInviteCodeForUser])

  // Header component with wallet connection
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

  const hasNFT = nftBalance && Number(nftBalance) > 0
  const tokenId = firstTokenId ? Number(firstTokenId) : null

  return (
    <div className="min-h-screen grid place-items-center bg-black text-white overflow-hidden">
      <Header />
      <div className="grid-background"></div>
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 border-2 border-pink-500 rounded-2xl flex items-center justify-center neon-glow mx-auto">
              <img src="/piggy-logo.png" alt="Piggy Logo" className="w-12 h-12 object-contain" />
            </div>
          </div>
          <h1 className="text-6xl font-bold mb-4 glitch neon-text" data-text="PIGGY ID POKER CLUB">
            PIGGY ID POKER CLUB
          </h1>
          <p className="text-pink-400 text-lg font-mono uppercase tracking-wider">OINKMEMBERSHIP</p>
          {address && (
            <p className="text-green-400 text-sm font-mono mt-2">
              <span className="text-pink-400">{">"}.</span> OINK DETECTED: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            {/* Poker Registration Section */}
            <Card className="cyber-card">
              <CardHeader className="border-b border-pink-500">
                <CardTitle className="text-pink-500 font-mono uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  POKER REGISTRATION
                </CardTitle>
                <CardDescription className="text-pink-400 font-mono">{">"} INITIALIZE YOUR PIGGY ID</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {!isConnected ? (
                  <div className="text-center py-8">
                    <p className="text-pink-400 font-mono mb-4">{">"} CONNECT WALLET TO ACCESS POKER CLUB</p>
                    <div className="cyber-button inline-block">
                      <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Poker ID Status */}
                    <div className="space-y-2">
                      <Label className="text-pink-500 font-mono uppercase tracking-wider">{">"} YOUR POKER ID</Label>
                      <div className="cyber-input p-3 bg-black/50">
                        {loading ? (
                          <span className="text-pink-400 font-mono">CHECKING NFT STATUS...</span>
                        ) : hasNFT && tokenId ? (
                          <span className="text-green-400 font-mono">POKER ID #{tokenId} VERIFIED</span>
                        ) : (
                          <span className="text-red-400 font-mono">You don't have Poker ID</span>
                        )}
                      </div>
                    </div>

                    {/* Invite Code */}
                    {hasNFT && (
                      <div className="space-y-2">
                        <Label className="text-pink-500 font-mono uppercase tracking-wider">
                          {">"} Your invite code
                        </Label>
                        <div className="cyber-input p-3 bg-black/50">
                          {loading ? (
                            <span className="text-pink-400 font-mono">LOADING INVITE CODE...</span>
                          ) : userInviteCode ? (
                            <span className="text-green-400 font-mono text-lg font-bold">{userInviteCode}</span>
                          ) : (
                            <span className="text-red-400 font-mono">NO AVAILABLE INVITE CODES</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Join Game Button */}
                    {hasNFT && userInviteCode && (
                      <div className="pt-4">
                        <Button
                          onClick={() => window.open("https://www.pokernow.club/mtt/tests2-q2jy6PkRdD", "_blank")}
                          className="w-full flex items-center justify-center gap-2 cyber-button glow-button"
                        >
                          <ExternalLink className="w-4 h-4" />
                          JOIN GAME
                        </Button>
                      </div>
                    )}

                    {/* No NFT Message */}
                    {!hasNFT && !loading && (
                      <div className="text-center py-8">
                        <p className="text-red-400 font-mono mb-4">
                          {">"} YOU NEED A PIGGY ID NFT TO ACCESS POKER CLUB
                        </p>
                        <Button onClick={() => window.open("/", "_blank")} className="cyber-button" variant="outline">
                          GET PIGGY ID
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PokerPage
