"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"

interface DiscordUser {
  discord_id: string
  discord_username: string
}

interface RoleCheckResult {
  hasRequired: boolean
  mode: "any" | "all"
  checkedRoles: string[]
  matchedRoles: string[]
  missingRoles: string[]
  checkedRoleNames?: string[]
  matchedRoleNames?: string[]
  missingRoleNames?: string[]
  discordId: string
  isGuildMember: boolean
  guildInviteUrl?: string
  error?: string
}

export default function SuperPokerClientPage() {
  const [discordUser, setDiscordUser] = useState<DiscordUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [roleCheck, setRoleCheck] = useState<RoleCheckResult | null>(null)
  const [isCheckingRoles, setIsCheckingRoles] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [isLoadingInviteCode, setIsLoadingInviteCode] = useState(false)

  const loadInviteCode = async () => {
    if (!discordUser?.discord_id || !discordUser?.discord_username) {
      return
    }

    setIsLoadingInviteCode(true)
    try {
      const response = await fetch("/api/superpoker/invite-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discordId: discordUser.discord_id,
          discordUsername: discordUser.discord_username,
        }),
      })

      const result = await response.json()
      if (response.ok && result.inviteCode) {
        setInviteCode(result.inviteCode)
        toast.success("Invite code assigned!")
      } else {
        toast.error("No invite codes available. Please contact admin.")
      }
    } catch (error) {
      console.error("Failed to load invite code:", error)
      toast.error("Failed to get invite code")
    } finally {
      setIsLoadingInviteCode(false)
    }
  }

  const checkDiscordRoles = async () => {
    if (!discordUser?.discord_id) {
      toast.error("Discord not connected")
      return
    }

    setIsCheckingRoles(true)
    try {
      const response = await fetch(
        `/api/discord/check-roles?discord_id=${encodeURIComponent(discordUser.discord_id)}&mode=any`,
      )
      const result = await response.json()
      setRoleCheck(result)

      if (result.error) {
        if (!result.isGuildMember) {
          toast.error("You need to join the Discord server first")
        } else {
          toast.error(`Role check failed: ${result.error}`)
        }
      } else if (!result.isGuildMember) {
        toast.warning("Please join the Discord server to continue")
      } else if (result.hasRequired) {
        toast.success("Discord roles verified!")
        if (!inviteCode) {
          loadInviteCode()
        }
      } else {
        toast.warning("Missing required Discord roles")
      }
    } catch (error) {
      console.error("Role check error:", error)
      toast.error("Failed to check Discord roles")
    } finally {
      setIsCheckingRoles(false)
    }
  }

  const handleJoinDiscord = () => {
    if (roleCheck?.guildInviteUrl) {
      window.open(roleCheck.guildInviteUrl, "_blank")
    }
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const success = urlParams.get("success")
    const error = urlParams.get("error")

    if (success === "discord_verified") {
      toast.success("Discord connected successfully!")
      loadDiscordUser()
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname)
    } else if (error) {
      toast.error("Discord connection failed. Please try again.")
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  const loadDiscordUser = async () => {
    try {
      const response = await fetch("/api/superpoker/user")
      if (response.ok) {
        const userData = await response.json()
        setDiscordUser(userData)
      }
    } catch (error) {
      console.error("Failed to load Discord user:", error)
    }
  }

  const handleDiscordConnect = () => {
    setIsLoading(true)
    // Use the same Discord OAuth endpoint as poker page but with source=superpoker
    window.location.href = `/api/auth/discord?source=superpoker`
  }

  const handleDiscordDisconnect = async () => {
    try {
      const response = await fetch("/api/superpoker/disconnect", {
        method: "POST",
      })

      if (response.ok) {
        setDiscordUser(null)
        setRoleCheck(null)
        setInviteCode(null)
        toast.success("Discord disconnected successfully!")
      } else {
        toast.error("Failed to disconnect Discord")
      }
    } catch (error) {
      toast.error("Failed to disconnect Discord")
    }
  }

  useEffect(() => {
    loadDiscordUser()
  }, [])

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="cyber-grid absolute inset-0 opacity-20"></div>

      {/* Connected Discord user display */}
      {discordUser && (
        <div className="fixed top-4 right-4 z-50">
          <div className="flex items-center gap-2 bg-black/80 border border-pink-500/30 rounded px-3 py-2">
            <div className="w-6 h-6 bg-[#5865F2] rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.076.076 0 0 0 .084.028a14.09 14.09 0 0 0 1.226-1.994a.077.077 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
            </div>
            <span className="text-sm">Discord</span>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium">{discordUser.discord_username}</span>
            <button
              onClick={handleDiscordDisconnect}
              className="ml-2 px-2 py-1 text-xs border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="cyber-card w-full max-w-md p-8 text-center">
          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2 neon-text">POKER REGISTRATION</h1>
            <div className="text-pink-400 text-sm mb-6">INITIALIZE YOUR PIGGY ID</div>
          </div>

          {!discordUser ? (
            <div className="space-y-6">
              <div className="text-gray-300 text-sm mb-4">Connect your Discord account to continue</div>

              <button
                onClick={handleDiscordConnect}
                disabled={isLoading}
                className="cyber-button w-full py-3 px-6 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "CONNECTING..." : "CONNECT DISCORD TO CONTINUE"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-green-400 text-sm mb-4">✓ Discord connected successfully!</div>

              <div className="text-gray-300 text-sm">
                Welcome, <span className="text-pink-400 font-semibold">{discordUser.discord_username}</span>!
                <br />
                Your Super Poker registration is complete.
              </div>

              <div className="mt-8 p-4 border border-pink-500/30 rounded-xl bg-black/40">
                <h3 className="text-lg font-bold mb-4 text-pink-400">Discord Role Check</h3>

                {roleCheck ? (
                  <div className="space-y-3">
                    {!roleCheck.isGuildMember ? (
                      <div className="space-y-3">
                        <div className="text-red-400 text-sm">❌ You are not subscribed to the Discord server</div>
                        <div className="text-gray-400 text-xs">
                          Please join our Discord server to continue with role verification
                        </div>
                        {roleCheck.guildInviteUrl && (
                          <button
                            onClick={handleJoinDiscord}
                            className="px-4 py-2 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded transition-colors font-medium"
                          >
                            Join Discord
                          </button>
                        )}
                        <button
                          onClick={checkDiscordRoles}
                          disabled={isCheckingRoles}
                          className="ml-2 px-3 py-1 text-xs border border-gray-500/50 text-gray-300 hover:bg-gray-500/10 rounded transition-colors disabled:opacity-50"
                        >
                          {isCheckingRoles ? "Checking..." : "Refresh check"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-green-400 text-sm">✓ Discord server member</div>

                        <div className="text-sm text-gray-300">
                          Required roles:{" "}
                          {roleCheck.checkedRoleNames && roleCheck.checkedRoleNames.length > 0
                            ? roleCheck.checkedRoleNames.join(", ")
                            : roleCheck.checkedRoles.length > 0
                              ? roleCheck.checkedRoles.join(", ")
                              : "None specified"}
                        </div>

                        {roleCheck.error ? (
                          <div className="text-red-400 text-sm">❌ Error: {roleCheck.error}</div>
                        ) : roleCheck.hasRequired ? (
                          <div className="space-y-3">
                            <div className="text-green-400 text-sm">
                              ✅ Access granted
                              {((roleCheck.matchedRoleNames && roleCheck.matchedRoleNames.length > 0) ||
                                (roleCheck.matchedRoles && roleCheck.matchedRoles.length > 0)) && (
                                <div className="mt-1 text-xs text-gray-400">
                                  Matched roles:{" "}
                                  {roleCheck.matchedRoleNames?.join(", ") || roleCheck.matchedRoles.join(", ")}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="text-red-400 text-sm">
                              ❌ Missing required roles
                              {((roleCheck.missingRoleNames && roleCheck.missingRoleNames.length > 0) ||
                                (roleCheck.missingRoles && roleCheck.missingRoles.length > 0)) && (
                                <div className="mt-1 text-xs text-gray-400">
                                  Missing: {roleCheck.missingRoleNames?.join(", ") || roleCheck.missingRoles.join(", ")}
                                </div>
                              )}
                            </div>
                            <a
                              href="https://guild.xyz/superform/piggy"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block px-6 py-2 border-2 border-pink-500 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 font-medium rounded-lg transition-all duration-200 bg-transparent"
                            >
                              Claim role now
                            </a>
                          </div>
                        )}

                        <button
                          onClick={checkDiscordRoles}
                          disabled={isCheckingRoles}
                          className="px-3 py-1 text-xs border border-gray-500/50 text-gray-300 hover:bg-gray-500/10 rounded transition-colors disabled:opacity-50"
                        >
                          {isCheckingRoles ? "Checking..." : "Refresh check"}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={checkDiscordRoles}
                    disabled={isCheckingRoles || !discordUser}
                    className="px-4 py-2 bg-pink-500/20 border border-pink-500/50 text-pink-400 hover:bg-pink-500/30 rounded transition-colors disabled:opacity-50"
                  >
                    {isCheckingRoles ? "Checking..." : "Check roles now"}
                  </button>
                )}
              </div>

              {roleCheck?.hasRequired && (
                <div className="mt-6 p-4 border border-green-500/30 rounded-xl bg-black/40">
                  <h3 className="text-lg font-bold mb-4 text-green-400">Your Invite Code</h3>

                  {inviteCode ? (
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-xs text-gray-400 mb-2">Your unique invite code:</div>
                        <div className="text-2xl font-mono font-bold text-pink-400 bg-gray-900/50 px-4 py-2 rounded border border-pink-500/30">
                          {inviteCode}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 text-center">
                        Use this code to join the SuperPoker tournament
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      {isLoadingInviteCode ? (
                        <div className="text-gray-400">Loading your invite code...</div>
                      ) : (
                        <button
                          onClick={loadInviteCode}
                          disabled={isLoadingInviteCode}
                          className="px-4 py-2 bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 rounded transition-colors disabled:opacity-50"
                        >
                          Get Invite Code
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {roleCheck?.hasRequired && inviteCode && (
                <div className="mt-6 text-center">
                  <a
                    href="https://www.pokernow.club/mtt/superpoker-63-Db6XiyrgdQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-8 py-3 border-2 border-pink-500 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 font-bold text-lg rounded-lg transition-all duration-200 bg-transparent uppercase tracking-wider"
                  >
                    JOIN GAME
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
