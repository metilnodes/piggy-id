"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface CodeStats {
  totalCodes: number
  assignedCodes: number
  usedCodes: number
  availableCodes: number
}

interface InviteCode {
  id: number
  code: string
  created_at: string
  updated_at: string
  assigned_to?: string
  used_by?: string
}

export default function AdminPage() {
  const [stats, setStats] = useState<CodeStats | null>(null)
  const [codes, setCodes] = useState<InviteCode[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [manualCodes, setManualCodes] = useState("")

  useEffect(() => {
    loadStats()
    loadCodes()
  }, [])

  const loadStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }

  const loadCodes = async () => {
    try {
      const response = await fetch("/api/admin/codes")
      const data = await response.json()
      setCodes(data.codes || [])
    } catch (error) {
      console.error("Failed to load codes:", error)
    }
  }

  const handleCsvUpload = async () => {
    if (!csvFile) return

    setLoading(true)
    setMessage("")

    try {
      const formData = new FormData()
      formData.append("file", csvFile)

      const response = await fetch("/api/admin/upload-csv", {
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

      const response = await fetch("/api/admin/add-codes", {
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
    if (!confirm("Are you sure you want to clear ALL codes and assignments? This cannot be undone.")) {
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch("/api/admin/clear-all", {
        method: "POST",
      })

      const result = await response.json()

      if (response.ok) {
        setMessage("✅ All codes and assignments cleared")
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

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-pink-500 mb-2">PIGGY SUMMER POKER</h1>
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
          <TabsList className="grid w-full grid-cols-3 bg-gray-900">
            <TabsTrigger value="upload" className="data-[state=active]:bg-pink-500">
              Upload CSV
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-pink-500">
              Manual Add
            </TabsTrigger>
            <TabsTrigger value="codes" className="data-[state=active]:bg-pink-500">
              View Codes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card className="bg-gray-900 border-pink-500">
              <CardHeader>
                <CardTitle className="text-pink-400">Upload CSV File</CardTitle>
                <CardDescription className="text-gray-400">
                  Upload a CSV file with invite codes. Expected format: code,consumer_player
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <CardDescription className="text-gray-400">Enter invite codes, one per line</CardDescription>
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
                <CardTitle className="text-pink-400">Current Invite Codes</CardTitle>
                <CardDescription className="text-gray-400">View all invite codes and their status</CardDescription>
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
                        <div className="flex gap-2 text-sm">
                          {code.assigned_to && <span className="text-yellow-400">Assigned</span>}
                          {code.used_by && <span className="text-blue-400">Used</span>}
                          {!code.assigned_to && !code.used_by && <span className="text-green-400">Available</span>}
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
