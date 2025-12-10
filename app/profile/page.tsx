"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { useRouter } from "next/navigation"

interface Identity {
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
  username?: string
  avatar_url?: string
  avatar_cid?: string
  avatar_updated_at?: string
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [email, setEmail] = useState<string>("")
  const [emailEditing, setEmailEditing] = useState<boolean>(false)
  const [emailVerificationPending, setEmailVerificationPending] = useState<boolean>(false)
  const [username, setUsername] = useState<string>("")
  const [usernameEditing, setUsernameEditing] = useState<boolean>(false)
  const [identityLoading, setIdentityLoading] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  // Load Neynar SIWN script on component mount
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://neynarxyz.github.io/siwn/raw/1.2.0/index.js"
    script.async = true
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    const loadIdentity = async () => {
      if (!address || !isConnected) {
        setIdentity(null)
        return
      }

      console.log("[v0] Loading identity for address:", address)
      setIdentityLoading(true)

      try {
        const response = await fetch(`/api/identity?address=${address}`)
        const data = await response.json()

        console.log("[v0] Identity API response:", data)
        console.log("[v0] Identity data:", data.identity)
        console.log("[v0] Email field in identity:", data.identity?.email)
        console.log("[v0] Identity object keys:", data.identity ? Object.keys(data.identity) : "null")

        setIdentity(data.identity)
      } catch (error) {
        console.error("[v0] Error loading identity:", error)
      } finally {
        setIdentityLoading(false)
      }
    }

    loadIdentity()
  }, [address, isConnected])

  useEffect(() => {
    const handleUrlParams = async () => {
      const urlParams = new URLSearchParams(window.location.search)

      // Process all parameters first, then batch state updates
      const updates = {
        toast: null as { message: string; type: "success" | "error" } | null,
        shouldReloadIdentity: false,
        emailVerificationPending: emailVerificationPending,
        emailEditing: emailEditing,
        email: email,
      }

      if (urlParams.get("success") === "email_verified") {
        updates.emailVerificationPending = false
        updates.emailEditing = false
        updates.email = ""
        updates.toast = {
          message: "Email successfully verified and connected to your account!",
          type: "success" as const,
        }
        updates.shouldReloadIdentity = true
      } else if (urlParams.get("success") === "discord_verified") {
        updates.toast = {
          message: "Discord successfully connected to your account!",
          type: "success" as const,
        }
        updates.shouldReloadIdentity = true
      } else if (urlParams.get("success") === "twitter_verified") {
        updates.toast = {
          message: "Twitter successfully connected to your account!",
          type: "success" as const,
        }
        updates.shouldReloadIdentity = true
      } else if (urlParams.get("farcaster_connected") === "true") {
        updates.toast = {
          message: "Farcaster successfully connected to your account!",
          type: "success" as const,
        }
        updates.shouldReloadIdentity = true
      } else if (urlParams.get("error")) {
        const error = urlParams.get("error")
        let errorMessage = "Connection failed. Please try again."

        if (error === "discord_already_connected") {
          errorMessage = "This Discord account is already connected to another wallet."
        } else if (error === "twitter_already_connected") {
          errorMessage = "This Twitter account is already connected to another wallet."
        } else if (error === "discord_auth_failed") {
          errorMessage = "Discord authorization failed. Please try again."
        } else if (error === "twitter_auth_failed") {
          errorMessage = "Twitter authorization failed. Please try again."
        } else if (error === "invalid_token") {
          errorMessage = "Invalid verification token. Please request a new verification email."
          updates.emailVerificationPending = false
        } else if (error === "token_expired") {
          errorMessage = "Verification token expired. Please request a new verification email."
          updates.emailVerificationPending = false
        } else if (error === "verification_failed") {
          errorMessage = "Email verification failed. Please try again."
          updates.emailVerificationPending = false
        }

        updates.toast = {
          message: errorMessage,
          type: "error" as const,
        }
      }

      // Apply all state updates in sequence to avoid conflicts
      if (updates.toast) {
        setToast(updates.toast)
      }

      if (updates.emailVerificationPending !== emailVerificationPending) {
        setEmailVerificationPending(updates.emailVerificationPending)
      }

      if (updates.emailEditing !== emailEditing) {
        setEmailEditing(updates.emailEditing)
      }

      if (updates.email !== email) {
        setEmail(updates.email)
      }

      // Handle identity reload after state updates
      if (updates.shouldReloadIdentity && address && isConnected) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 500))
          const response = await fetch(`/api/identity?address=${address}`)
          const data = await response.json()
          setIdentity(data.identity)
        } catch (error) {
          console.error("Error loading identity:", error)
        }
      }

      // Clean up URL after processing
      if (urlParams.toString()) {
        setTimeout(() => {
          window.history.replaceState({}, document.title, window.location.pathname)
        }, 100)
      }
    }

    handleUrlParams()
  }, [address, isConnected]) // Removed state dependencies to prevent loops

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  useEffect(() => {
    if (identity?.username) {
      setUsername(identity.username)
    }
    if (identity?.avatar_url) {
      setAvatarUrl(identity.avatar_url)
    }
  }, [identity])

  // Header component with updated text
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

  const connectDiscord = async () => {
    if (!address) return

    console.log("[v0] Discord Connect button clicked")
    console.log("[v0] Wallet address:", address)
    console.log("[v0] Redirecting to Discord OAuth...")

    window.location.href = `/api/auth/discord?wallet=${encodeURIComponent(address)}&source=piggyvegas`
  }

  const connectTwitter = async () => {
    if (!address) return

    // Redirect to Twitter OAuth
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
          source: "piggyvegas",
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

        // Reload identity data
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

  const saveUsername = async () => {
    if (!username.trim()) {
      showToast("Username cannot be empty", "error")
      return
    }

    setIdentityLoading(true)
    try {
      const response = await fetch("/api/identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          type: "username",
          data: { username: username.trim() },
        }),
      })

      if (response.ok) {
        showToast("Username updated successfully!", "success")
        setUsernameEditing(false)
        await fetchIdentity()
      } else {
        showToast("Failed to update username", "error")
      }
    } catch (error) {
      console.error("Error updating username:", error)
      showToast("Failed to update username", "error")
    } finally {
      setIdentityLoading(false)
    }
  }

  const cancelUsernameEdit = () => {
    setUsername(identity?.username || "")
    setUsernameEditing(false)
  }

  const fetchIdentity = async () => {
    if (!address || !isConnected) {
      setIdentity(null)
      return
    }

    console.log("[v0] Loading identity for address:", address)
    setIdentityLoading(true)

    try {
      const response = await fetch(`/api/identity?address=${address}`)
      const data = await response.json()

      console.log("[v0] Identity API response:", data)
      console.log("[v0] Identity data:", data.identity)
      console.log("[v0] Email field in identity:", data.identity?.email)
      console.log("[v0] Identity object keys:", data.identity ? Object.keys(data.identity) : "null")

      setIdentity(data.identity)
    } catch (error) {
      console.error("[v0] Error loading identity:", error)
    } finally {
      setIdentityLoading(false)
    }
  }

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type })
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !address) return

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showToast("Invalid file type. Only JPEG, PNG, and WebP are allowed", "error")
      return
    }

    // Validate file size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      showToast("File too large. Maximum size is 3MB", "error")
      return
    }

    setAvatarUploading(true)
    try {
      const formData = new FormData()
      formData.append("avatar", file)
      formData.append("walletAddress", address)

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        setAvatarUrl(data.avatarUrl)
        showToast("Avatar uploaded successfully!", "success")
        await fetchIdentity()
      } else {
        const error = await response.json()
        showToast(error.error || "Failed to upload avatar", "error")
      }
    } catch (error) {
      console.error("Error uploading avatar:", error)
      showToast("Failed to upload avatar", "error")
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    if (!address) return

    setAvatarUploading(true)
    try {
      const response = await fetch("/api/profile/avatar", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      })

      if (response.ok) {
        setAvatarUrl(null)
        showToast("Avatar removed successfully!", "success")
        await fetchIdentity()
      } else {
        showToast("Failed to remove avatar", "error")
      }
    } catch (error) {
      console.error("Error removing avatar:", error)
      showToast("Failed to remove avatar", "error")
    } finally {
      setAvatarUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black cyber-grid">
      <Header />

      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 p-4 rounded-lg border font-mono text-sm max-w-sm ${
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

      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-pink-500 glitch neon-text mb-4" data-text="PIGGY PROFILE">
            PIGGY PROFILE
          </h1>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Piggy ID Section */}
          <div className="cyber-card rounded-lg p-6">
            <h2 className="text-xl font-bold text-pink-500 mb-6 font-mono">
              PIGGY PROFILE &gt; INITIALIZE YOUR PIGGY ID
            </h2>

            {!isConnected ? (
              <div className="text-center py-8">
                <p className="text-pink-400 font-mono mb-4">{">"} CONNECT WALLET TO CONTINUE</p>
                <div className="cyber-button inline-block">
                  <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="border border-pink-500/30 rounded p-4 bg-black/50">
                  <h3 className="text-pink-500 font-mono font-bold mb-2">YOUR PIGGY ID</h3>
                  <div className="text-pink-400 font-mono">
                    {identity?.token_id ? (
                      <span className="text-pink-300">#{identity.token_id.toString()}</span>
                    ) : identityLoading ? (
                      <span className="text-yellow-400">Loading...</span>
                    ) : (
                      <span className="text-red-400">No Piggy ID found</span>
                    )}
                  </div>
                </div>

                <div className="border border-pink-500/30 rounded p-4 bg-black/50">
                  <h3 className="text-pink-500 font-mono font-bold mb-2">USERNAME</h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      onFocus={() => setUsernameEditing(true)}
                      placeholder="Enter your username"
                      className="flex-1 bg-black border border-pink-500/30 text-pink-300 font-mono text-sm px-2 py-1 rounded focus:border-pink-500 focus:outline-none"
                    />
                    {(usernameEditing || username !== identity?.username) && (
                      <div className="flex gap-2">
                        <button
                          onClick={saveUsername}
                          disabled={identityLoading || !username.trim()}
                          className="cyber-button px-4 py-1 text-sm font-mono disabled:opacity-50"
                        >
                          {identityLoading ? "Saving..." : "Save"}
                        </button>
                        {usernameEditing && username !== identity?.username && (
                          <button
                            onClick={cancelUsernameEdit}
                            className="border border-gray-500 text-gray-400 hover:text-white hover:border-white px-4 py-1 text-sm font-mono rounded transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-pink-500/20">
                  <h3 className="text-pink-500 font-mono font-bold mb-4">AVATAR</h3>
                  <div className="flex items-start gap-4">
                    {/* Avatar Preview */}
                    <div className="relative">
                      <img
                        src={
                          avatarUrl
                            ? `${avatarUrl}?t=${identity?.avatar_updated_at || Date.now()}`
                            : "/placeholder.svg?height=80&width=80"
                        }
                        alt="User avatar"
                        className="w-20 h-20 rounded-full border-2 border-pink-500/50 object-cover"
                      />
                      {avatarUploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                        </div>
                      )}
                    </div>

                    {/* Upload Controls */}
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <label
                          htmlFor="avatar-upload"
                          className={`cyber-button px-4 py-2 text-sm font-mono cursor-pointer ${
                            avatarUploading ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
                          {avatarUploading ? "Uploading..." : avatarUrl ? "Change Avatar" : "Upload Avatar"}
                        </label>
                        <input
                          id="avatar-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleAvatarUpload}
                          disabled={avatarUploading}
                          className="hidden"
                        />

                        {avatarUrl && (
                          <button
                            onClick={handleRemoveAvatar}
                            disabled={avatarUploading}
                            className="border border-red-500 text-red-400 hover:text-white hover:bg-red-500/10 px-4 py-2 text-sm font-mono rounded transition-colors disabled:opacity-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 font-mono">Max 3MB • JPG, PNG, or WebP</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Connections Section */}
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
                        <div className="w-8 h-8 rounded flex items-center justify-center overflow-hidden">
                          <img src="/images/discord-icon.png" alt="Discord" className="w-full h-full object-cover" />
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
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
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
                          disabled={true}
                          className="border border-gray-500 text-gray-400 px-4 py-1 text-sm font-mono rounded cursor-not-allowed opacity-50"
                        >
                          SOON
                        </button>
                      )}
                    </div>

                    {/* Farcaster */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zM12.186 5.062c-3.36 0-6.186 2.494-6.186 5.625 0 1.124.372 2.16 1.003 3.002l-.75 2.249 2.25-.75c.842.631 1.878 1.003 3.002 1.003h.362c3.36 0 6.186-2.494 6.186-5.625s-2.826-5.625-6.186-5.625h-.681zm3.372 7.5c-.186.186-.434.279-.681.279s-.495-.093-.681-.279l-1.5-1.5c-.186-.186-.279-.434-.279-.681s.093-.495.279-.681.434-.279.681-.279.495.093.681.279l.819.819 2.319-2.319c.186-.186.434-.279.681-.279s.495.093.681.279-.279.434-.279.681-.093.495-.279.681l-3 3z" />
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
                          disabled={true}
                          className="border border-gray-500 text-gray-400 px-4 py-1 text-sm font-mono rounded cursor-not-allowed opacity-50"
                        >
                          SOON
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

        <div className="max-w-6xl mx-auto mt-8">
          <button
            onClick={() => router.push("/piggyvegas")}
            className="w-full bg-gradient-to-r from-pink-500/20 to-pink-600/20 border-2 border-pink-500 text-pink-400 font-mono text-lg py-4 rounded-lg hover:bg-pink-500/30 hover:text-pink-300 transition-all duration-300 shadow-lg shadow-pink-500/20"
          >
            ← BACK TO LOBBY
          </button>
        </div>
      </div>
    </div>
  )
}
