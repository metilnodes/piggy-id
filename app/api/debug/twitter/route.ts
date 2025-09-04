import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/auth/twitter/callback`

  const clientId = process.env.TWITTER_CLIENT_ID
  const clientSecret = process.env.TWITTER_CLIENT_SECRET

  // Validate OAuth 2.0 Client ID format
  const isValidOAuth2ClientId =
    clientId &&
    (clientId.startsWith("VVhvbGVzb21lQ") || // Common OAuth 2.0 Client ID prefix
      clientId.length > 20) // OAuth 2.0 Client IDs are typically longer

  const debugInfo = {
    environment: process.env.NODE_ENV,
    origin,
    redirectUri,

    // Credentials validation
    credentials: {
      clientId: clientId ? `${clientId.substring(0, 12)}...` : "❌ NOT SET",
      clientIdLength: clientId?.length || 0,
      clientIdPrefix: clientId?.substring(0, 8) || "N/A",
      clientIdSuffix: clientId?.substring(-4) || "N/A",
      isValidOAuth2Format: isValidOAuth2ClientId,
      clientSecret: clientSecret ? "✅ SET" : "❌ NOT SET",
      hasSecret: !!clientSecret,
    },

    // Configuration validation
    configuration: {
      expectedCallbackUrl: redirectUri,
      callbackUrlNote: "This EXACT URL must be in X Dev Portal → User authentication settings → Callback URLs",
      appType: "Web App, Automated App or Bot (Confidential client)",
      pkceStatus: "❌ DISABLED (correct for Web App)",
      scope: "users.read (minimal for testing)",
    },

    // Common issues
    troubleshooting: {
      invalidClient: "Using OAuth 1.0a API Key instead of OAuth 2.0 Client ID",
      callbackNotApproved: "Callback URL mismatch between code and X Dev Portal",
      unauthorizedClient: "User authentication not enabled in X Dev Portal",
      redirectMismatch: "redirect_uri parameter doesn't match portal configuration",
    },

    // Next steps
    nextSteps: [
      "1. Verify X Dev Portal → User authentication settings enabled",
      "2. Confirm callback URL matches exactly (no trailing slash)",
      "3. Use OAuth 2.0 Client ID/Secret (not OAuth 1.0a API Key/Secret)",
      "4. Ensure Web App type selected in X Dev Portal",
      "5. Test with minimal scope: users.read only",
    ],
  }

  return NextResponse.json(debugInfo, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, max-age=0",
    },
  })
}
