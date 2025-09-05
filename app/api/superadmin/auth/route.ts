import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json()

    const superAdminPassword = process.env.SUPERADMIN_PASSWORD

    if (!superAdminPassword) {
      return NextResponse.json({ error: "SuperAdmin password not configured" }, { status: 500 })
    }

    if (password !== superAdminPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 })
    }

    // Generate a simple token
    const token = Buffer.from(`superadmin:${Date.now()}`).toString("base64")

    return NextResponse.json({
      success: true,
      token,
      message: "SuperAdmin login successful",
    })
  } catch (error) {
    console.error("SuperAdmin auth error:", error)
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
