import type { Request } from "express" // Import Request from express

const BASE_URL = "https://your-base-url.com" // Declare BASE_URL variable
const request: Request = {} as any // Declare request variable
const origin = new URL(request.url).origin
const TWITTER_REDIRECT_URI = `${origin}/api/auth/twitter/callback`
