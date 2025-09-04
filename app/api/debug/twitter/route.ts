import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/auth/twitter/callback`

  const debugInfo = {
    origin,
    redirectUri,
    twitterClientId: process.env.TWITTER_CLIENT_ID ? `${process.env.TWITTER_CLIENT_ID.substring(0, 8)}...` : "NOT SET",
    twitterClientSecret: process.env.TWITTER_CLIENT_SECRET ? "SET" : "NOT SET",
    expectedCallbackUrl: redirectUri,
    note: "Make sure this exact URL is in your X Dev Portal Callback URLs",
  }

  return NextResponse.json(debugInfo, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, max-age=0",
    },
  })
}
