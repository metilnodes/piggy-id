"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SuperPokerCodeStats {
  totalCodes: number
  assignedCodes: number
  usedCodes: number
  availableCodes: number
}

interface SuperPokerInviteCode {
  id: number
  code: string
  created_at: string
  updated_at: string
  assigned_to?: string
  used_by?: string
}

interface SuperPokerSettings {
  tournament_name: string
  game_url: string
}

export default function SuperAdminPage() {
  const [stats, setStats] = useState<SuperPokerCodeStats | null>(null)
  const [codes, setCodes] = useState<SuperPokerInviteCode[]>([])
  const [settings, setSettings] = useState<SuperPokerSettings | null>(null)
  const [tournamentName, setTournamentName] = useState("")
  const [gameUrl, setGameUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [manualCodes, setManualCodes] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = () => {
      const token = sessionStorage.getItem("superadmin_auth")
      if (!token) {
        router.push("/superadmin/login")
        return
      }
      setIsAuthenticated(true)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (isAuthenticated) {
      loadStats()
      loadCodes()
      loadSettings()
    }
  }, [isAuthenticated])

  const loadStats = async () => {
    try {
      const response = await fetch("/api/superadmin/stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }

  const loadCodes = async () => {
    try {
      const response = await fetch("/api/superadmin/codes")
      const data = await response.json()
      setCodes(data.codes || [])
    } catch (error) {
      console.error("Failed to load codes:", error)
    }
  }

  const loadSettings = async () => {
    try {
      const response = await fetch("/api/superpoker/settings")
      const data = await response.json()
      setSettings(data)
      setTournamentName(data.tournament_name || "SuperPoker #63")
      setGameUrl(data.game_url || "https://www.pokernow.club/mtt/superpoker-63-Db6XiyrgdQ")
    } catch (error) {
      console.error("Failed to load settings:", error)
    }
  }

  const handleCsvUpload = async () => {
    if (!csvFile) return

    setLoading(true)
    setMessage("")

    try {
      const formData = new FormData()
      formData.append("file", csvFile)

      const response = await fetch("/api/superadmin/upload-csv", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`✅ Successfully uploaded ${result.count} codes`)
        loadStats()
        loadCodes()
        setCsvFile(null)
      } else {
        setMessage(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ Upload failed: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleManualAdd = async () => {
    if (!manualCodes.trim()) return

    setLoading(true)
    setMessage("")

    try {
      const codes = manualCodes
        .split("\n")
        .map((code) => code.trim())
        .filter((code) => code.length > 0)

      const response = await fetch("/api/superadmin/add-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codes }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`✅ Successfully added ${result.count} codes`)
        loadStats()
        loadCodes()
        setManualCodes("")
      } else {
        setMessage(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ Failed to add codes: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear ALL superpoker codes and assignments? This cannot be undone.")) {
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/superadmin/clear-all", {
        method: "POST",
      })

      const result = await response.json()

      if (response.ok) {
        setMessage("✅ All superpoker codes and assignments cleared")
        loadStats()
        loadCodes()
      } else {
        setMessage(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ Failed to clear codes: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem("superadmin_auth")
    router.push("/superadmin/login")
  }

  const deleteCode = async (codeId: number, codeValue: string) => {
    if (!confirm(`Are you sure you want to delete code "${codeValue}"? This cannot be undone.`)) {
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/superadmin/delete-code", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codeId }),
      })

      const result = await response.json()

      if (response.ok) {
        setMessage(`✅ Code "${codeValue}" deleted successfully`)
        loadStats()
        loadCodes()
      } else {
        setMessage(`❌ Error: ${result.error}`)
      }
    } catch (error) {
      setMessage(`❌ Failed to delete code: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const updateTournamentName = async () => {
    if (!tournamentName.trim()) return

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/superpoker/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setting_key: "tournament_name",
          setting_value: tournamentName.trim(),
        }),
      })

      if (response.ok) {
        setMessage("✅ Tournament name updated successfully")
        loadSettings()
      } else {
        setMessage("❌ Failed to update tournament name")
      }
    } catch (error) {
      setMessage(`❌ Error updating tournament name: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const updateGameUrl = async () => {
    if (!gameUrl.trim()) return

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/superpoker/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setting_key: "game_url",
          setting_value: gameUrl.trim(),
        }),
      })

      if (response.ok) {
        setMessage("✅ Game URL updated successfully")
        loadSettings()
      } else {
        setMessage("❌ Failed to update game URL")
      }
    } catch (error) {
      setMessage(`❌ Error updating game URL: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-pink-500 text-xl">Checking authentication...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-4xl font-bold text-pink-500">SUPER POKER</h1>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white bg-transparent"
            >
              Logout
            </Button>
          </div>
          <h2 className="text-2xl text-pink-400">ADMIN PANEL</h2>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gray-900 border-pink-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-pink-400 text-sm">Total Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.totalCodes}</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-green-400 text-sm">Available</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.availableCodes}</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-yellow-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-yellow-400 text-sm">Assigned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.assignedCodes}</div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-400 text-sm">Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.usedCodes}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {message && (
          <Alert className="mb-6 bg-gray-900 border-pink-500">
            <AlertDescription className="text-white">{message}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-900">
            <TabsTrigger value="settings" className="data-[state=active]:bg-pink-500 data-[state=active]:text-black">
              Settings
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-pink-500 data-[state=active]:text-black">
              Upload CSV
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-pink-500 data-[state=active]:text-black">
              Manual Add
            </TabsTrigger>
            <TabsTrigger value="codes" className="data-[state=active]:bg-pink-500 data-[state=active]:text-black">
              View Codes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-4">
            <Card className="bg-gray-900 border-pink-500">
              <CardHeader>
                <CardTitle className="text-pink-400">Tournament Settings</CardTitle>
                <CardDescription className="text-gray-400">Configure tournament name and game URL</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tournament-name" className="text-white">
                    Tournament Name
                  </Label>
                  <Input
                    id="tournament-name"
                    value={tournamentName}
                    onChange={(e) => setTournamentName(e.target.value)}
                    placeholder="Enter tournament name..."
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    This will be displayed on the SuperPoker registration page
                  </div>
                </div>
                <Button
                  onClick={updateTournamentName}
                  disabled={!tournamentName.trim() || loading}
                  className="bg-pink-500 hover:bg-pink-600"
                >
                  {loading ? "Updating..." : "Update Tournament Name"}
                </Button>

                <div className="pt-4 border-t border-gray-700">
                  <Label htmlFor="game-url" className="text-white">
                    Game URL
                  </Label>
                  <Input
                    id="game-url"
                    value={gameUrl}
                    onChange={(e) => setGameUrl(e.target.value)}
                    placeholder="Enter game URL..."
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    This URL will be used for the "Join Game" button on the SuperPoker page
                  </div>
                </div>
                <Button
                  onClick={updateGameUrl}
                  disabled={!gameUrl.trim() || loading}
                  className="bg-pink-500 hover:bg-pink-600"
                >
                  {loading ? "Updating..." : "Update Game URL"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card className="bg-gray-900 border-pink-500">
              <CardHeader>
                <CardTitle className="text-pink-400">Upload CSV File</CardTitle>
                <CardDescription className="text-gray-400">
                  Upload a CSV file with superpoker invite codes. Expected format: code,consumer_player
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center mb-4">
                  <img
                    src="/images/superadmin-csv-guide.png"
                    alt="CSV Upload Process Guide"
                    className="max-w-full h-auto rounded-lg border border-gray-700"
                  />
                </div>
                <div>
                  <Label htmlFor="csv-file" className="text-white">
                    Select CSV File
                  </Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
                <div className="flex gap-4">
                  <Button
                    onClick={handleCsvUpload}
                    disabled={!csvFile || loading}
                    className="bg-pink-500 hover:bg-pink-600"
                  >
                    {loading ? "Uploading..." : "Upload & Sync"}
                  </Button>
                  <Button onClick={handleClearAll} disabled={loading} variant="destructive">
                    Clear All Codes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card className="bg-gray-900 border-pink-500">
              <CardHeader>
                <CardTitle className="text-pink-400">Add Codes Manually</CardTitle>
                <CardDescription className="text-gray-400">Enter superpoker invite codes, one per line</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="manual-codes" className="text-white">
                    Invite Codes
                  </Label>
                  <Textarea
                    id="manual-codes"
                    placeholder="Enter codes, one per line..."
                    value={manualCodes}
                    onChange={(e) => setManualCodes(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white min-h-32"
                  />
                </div>
                <Button
                  onClick={handleManualAdd}
                  disabled={!manualCodes.trim() || loading}
                  className="bg-pink-500 hover:bg-pink-600"
                >
                  {loading ? "Adding..." : "Add Codes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="codes" className="space-y-4">
            <Card className="bg-gray-900 border-pink-500">
              <CardHeader>
                <CardTitle className="text-pink-400">Current SuperPoker Invite Codes</CardTitle>
                <CardDescription className="text-gray-400">
                  View all superpoker invite codes and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <div className="grid gap-2">
                    {codes.map((code) => (
                      <div
                        key={code.id}
                        className="flex justify-between items-center p-2 bg-gray-800 rounded border border-gray-700"
                      >
                        <span className="font-mono text-white">{code.code}</span>
                        <div className="flex gap-2 items-center">
                          <div className="flex gap-2 text-sm">
                            {code.assigned_to && <span className="text-yellow-400">Assigned</span>}
                            {code.used_by && <span className="text-blue-400">Used</span>}
                            {!code.assigned_to && !code.used_by && <span className="text-green-400">Available</span>}
                          </div>
                          <Button
                            onClick={() => deleteCode(code.id, code.code)}
                            disabled={loading}
                            size="sm"
                            variant="destructive"
                            className="ml-2 h-6 px-2 text-xs"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
