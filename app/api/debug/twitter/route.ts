import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin
  const redirectUri = `${origin}/api/auth/twitter/callback`

  const clientId = process.env.TWITTER_CLIENT_ID
  const clientSecret = process.env.TWITTER_CLIENT_SECRET

  const isValidOAuth2ClientId =
    clientId && clientId.length >= 20 && !clientId.includes("API") && !clientId.includes("Key")
  const isOAuth1ApiKey = clientId && (clientId.includes("API") || clientId.length < 20)

  const debugInfo = {
    environment: process.env.NODE_ENV,
    origin,
    redirectUri,

    credentials: {
      clientId: clientId ? `${clientId.substring(0, 12)}...` : "❌ NOT SET",
      clientIdLength: clientId?.length || 0,
      clientIdPrefix: clientId?.substring(0, 8) || "N/A",
      clientIdSuffix: clientId?.substring(-4) || "N/A",
      isValidOAuth2Format: isValidOAuth2ClientId,
      isOAuth1ApiKey: isOAuth1ApiKey,
      clientSecret: clientSecret ? "✅ SET" : "❌ NOT SET",
      hasSecret: !!clientSecret,
      credentialType: isOAuth1ApiKey ? "⚠️ OAuth 1.0a (WRONG)" : isValidOAuth2ClientId ? "✅ OAuth 2.0" : "❓ Unknown",
    },

    // Configuration validation
    configuration: {
      expectedCallbackUrl: redirectUri,
      callbackUrlNote: "This EXACT URL must be in X Dev Portal → User authentication settings → Callback URLs",
      appType: "Web App, Automated App or Bot (Confidential client)",
      pkceStatus: "❌ DISABLED (correct for Web App)",
      scope: "users.read (minimal for testing)",
    },

    troubleshooting: {
      invalidClient: {
        description: "client_id doesn't match X Dev Portal",
        commonCauses: [
          "Using OAuth 1.0a API Key instead of OAuth 2.0 Client ID",
          "Wrong App/Project selected in X Dev Portal",
          "User authentication settings not enabled",
          "Paid account required for User auth (Basic/Pro/Enterprise)",
        ],
        solution: "Regenerate OAuth 2.0 Client Secret in X Dev Portal",
      },
      callbackNotApproved: "Callback URL mismatch between code and X Dev Portal",
      unauthorizedClient: "User authentication not enabled in X Dev Portal",
      redirectMismatch: "redirect_uri parameter doesn't match portal configuration",
    },

    requiredXDevPortalSettings: {
      userAuthentication: "✅ MUST BE ENABLED",
      appType: "Web App, Automated App or Bot (Confidential client)",
      callbackUrl: redirectUri,
      oauthVersion: "OAuth 2.0 Client ID and Client Secret (NOT OAuth 1.0a)",
      websiteUrl: "Any valid HTTPS URL",
      saveRequired: "Click Save after making changes",
    },

    nextSteps: [
      "1. Go to X Dev Portal → Your App → User authentication settings",
      "2. Enable User authentication settings if not already enabled",
      "3. Verify App type: Web App, Automated App or Bot (Confidential client)",
      "4. Confirm callback URL matches exactly (no trailing slash)",
      "5. Click 'Regenerate Secret' for OAuth 2.0 Client Secret",
      "6. Update TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in Vercel",
      "7. Redeploy and test authorization flow",
    ],

    testUrl: `${origin}/api/auth/twitter?wallet=test`,
  }

  return NextResponse.json(debugInfo, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, max-age=0",
    },
  })
}
