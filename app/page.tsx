"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, Download, Zap } from "lucide-react"

const PiggyIdGenerator = () => {
  const [firstName, setFirstName] = useState("")
  const [surname, setSurname] = useState("")
  const [avatarImage, setAvatarImage] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Add font loading
  useEffect(() => {
    const font = new FontFace("TT Rounds Neue Trl Cmd", "url(/fonts/tt-rounds-neue-trl-cmd.woff2)")
    font
      .load()
      .then(() => {
        document.fonts.add(font)
      })
      .catch(() => {
        console.log("Font failed to load, using fallback")
      })
  }, [])

  const generateIdCard = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const backgroundImg = new Image()
    backgroundImg.crossOrigin = "anonymous"
    backgroundImg.onload = () => {
      // Set canvas size to match background image
      canvas.width = backgroundImg.width
      canvas.height = backgroundImg.height

      // Draw background
      ctx.drawImage(backgroundImg, 0, 0)

      // Set text properties with custom font
      ctx.fillStyle = "#000000"
      ctx.font = "258px 'TT Rounds Neue Trl Cmd', Arial, sans-serif"
      ctx.textAlign = "left"

      // First location - Main card area (based on first image)
      if (surname) {
        ctx.fillText(surname.toUpperCase(), 2745, 1660) // Ser-name position
      }

      if (firstName) {
        ctx.fillText(firstName.toUpperCase(), 2745, 2040) // First Name position
      }

      // Second location - Bottom section (based on second image)
      ctx.font = "231px 'TT Rounds Neue Trl Cmd', Arial, sans-serif"

      if (surname && firstName) {
        // Very strict position limits
        const startX = 750
        const maxX = canvas.width - 390 // Very strict boundary
        const maxWidth = maxX - startX // Maximum text width

        // Names are already limited to 12 characters during input
        const shortFirstName = firstName
        const shortSurname = surname

        // Initial number of "<" symbols
        const nameLength = shortFirstName.length + shortSurname.length
        const baseRepeats = 33.5
        let dynamicRepeats = Math.max(0, baseRepeats - nameLength) // Minimum 0 symbols

        // Create text and check its width
        let bottomText = `${shortFirstName.toUpperCase()} < ${shortSurname.toUpperCase()} < AGENT < OINK ${"<".repeat(dynamicRepeats)}`
        let textWidth = ctx.measureText(bottomText).width

        // Reduce number of "<" symbols until text fits
        while (textWidth > maxWidth && dynamicRepeats > 0) {
          dynamicRepeats--
          bottomText = `${shortFirstName.toUpperCase()} < ${shortSurname.toUpperCase()} < AGENT < OINK ${"<".repeat(dynamicRepeats)}`
          textWidth = ctx.measureText(bottomText).width
        }

        // If still doesn't fit, remove all "<"
        if (textWidth > maxWidth) {
          bottomText = `${shortFirstName.toUpperCase()} < ${shortSurname.toUpperCase()} < AGENT < OINK`
        }

        ctx.fillText(bottomText, startX, 4590)
      }

      // Draw avatar if uploaded
      if (avatarImage) {
        const avatarImg = new Image()
        avatarImg.crossOrigin = "anonymous"
        avatarImg.onload = () => {
          // Avatar position and size (rectangular)
          const avatarX = 880
          const avatarY = 1538
          const avatarWidth = 1650
          const avatarHeight = 1650

          // Create rectangular clipping path
          ctx.save()
          ctx.beginPath()
          ctx.rect(avatarX, avatarY, avatarWidth, avatarHeight)
          ctx.clip()

          // Draw avatar image
          ctx.drawImage(avatarImg, avatarX, avatarY, avatarWidth, avatarHeight)
          ctx.restore()
        }
        avatarImg.src = avatarImage
      }
    }
    backgroundImg.src = "/background-id.png"
  }

  const downloadIdCard = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Создаем новый canvas для уменьшенной версии
    const smallCanvas = document.createElement("canvas")
    const smallCtx = smallCanvas.getContext("2d")
    if (!smallCtx) return

    // Устанавливаем размер в два раза меньше
    smallCanvas.width = canvas.width / 2
    smallCanvas.height = canvas.height / 2

    // Рисуем уменьшенную версию
    smallCtx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, smallCanvas.width, smallCanvas.height)

    const link = document.createElement("a")
    link.download = `piggy-id-${firstName}-${surname}.png`
    link.href = smallCanvas.toDataURL()
    link.click()
  }

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    if (value.length <= 12) {
      setFirstName(value)
    }
  }

  const handleSurnameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase()
    if (value.length <= 12) {
      setSurname(value)
    }
  }

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      generateIdCard()
    }, 100) // Small delay for better performance

    return () => clearTimeout(timeoutId)
  }, [firstName, surname, avatarImage])

  return (
    <div className="min-h-screen bg-black cyber-grid">
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-6">
            <div className="w-20 h-20 border-2 border-pink-500 rounded-2xl flex items-center justify-center neon-glow">
              <img src="/piggy-logo.png" alt="Piggy Logo" className="w-12 h-12 object-contain" />
            </div>
          </div>
          <h1 className="text-6xl font-bold mb-4 glitch neon-text" data-text="PIGGY ID">
            PIGGY ID
          </h1>
          <p className="text-pink-400 text-lg font-mono uppercase tracking-wider">OINKGENERATOR</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Form Section */}
          <Card className="cyber-card">
            <CardHeader className="border-b border-pink-500">
              <CardTitle className="text-pink-500 font-mono uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-5 h-5" />
                AGENT REGISTRATION
              </CardTitle>
              <CardDescription className="text-pink-400 font-mono">{">"} INITIALIZE YOUR PIGGY ID</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-pink-500 font-mono uppercase tracking-wider">
                  {">"} FIRST NAME
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  placeholder="OINKER NAME (MAX 12 CHARS)"
                  className="cyber-input"
                  maxLength={12}
                />
                <div className="text-xs text-pink-400 font-mono">{firstName.length}/12 CHARACTERS</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname" className="text-pink-500 font-mono uppercase tracking-wider">
                  {">"} SER-NAME
                </Label>
                <Input
                  id="surname"
                  value={surname}
                  onChange={handleSurnameChange}
                  placeholder="SNOUT NAME (MAX 12 CHARS)"
                  className="cyber-input"
                  maxLength={12}
                />
                <div className="text-xs text-pink-400 font-mono">{surname.length}/12 CHARACTERS</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="avatar" className="text-pink-500 font-mono uppercase tracking-wider">
                  {">"} SNOUTSHOT
                </Label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="cyber-button flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    UPLOAD SNOUTSHOT
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  {avatarImage && (
                    <span className="text-sm text-green-400 font-mono neon-text">{">"} PHOTO LOADED</span>
                  )}
                </div>
              </div>

              <Button
                onClick={downloadIdCard}
                className="w-full cyber-button flex items-center gap-2 py-4"
                disabled={!firstName || !surname}
              >
                <Download className="w-5 h-5" />
                DOWNLOAD OINKDENTITY
              </Button>
            </CardContent>
          </Card>

          {/* Preview Section */}
          <Card className="cyber-card">
            <CardHeader className="border-b border-pink-500">
              <CardTitle className="text-pink-500 font-mono uppercase tracking-wider">{">"} LIVE PREVIEW</CardTitle>
              <CardDescription className="text-pink-400 font-mono">
                {">"} PIGGY ID LOADING... STANDBY 🐽
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="border border-pink-500 rounded-lg overflow-hidden bg-black neon-glow">
                <canvas ref={canvasRef} className="w-full h-auto max-w-full" style={{ display: "block" }} />
              </div>
              {(!firstName || !surname) && (
                <div className="text-center mt-4 text-pink-400 font-mono text-sm">
                  {">"} ENTER YOUR NAME TO SPAWN OINKDENTITY
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default PiggyIdGenerator
