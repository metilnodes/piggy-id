// app/api/auth/farcaster/siwn/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const { fid, signer_uuid, user } = await req.json()

    // (опционально) подтянуть свежие данные по fid c Neynar
    const meRes = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
      headers: { "X-API-KEY": process.env.NEYNAR_API_KEY! },
    })
    if (!meRes.ok) {
      console.error("neynar user error", meRes.status, await meRes.text())
      return NextResponse.json({ error: "profile_failed" }, { status: 400 })
    }
    const me = await meRes.json()
    const profile = me?.user ?? user

    const username = profile?.username ?? null
    const displayName = profile?.display_name ?? username
    const avatarUrl = profile?.pfp_url ?? null

    // TODO: возьми адрес кошелька из своей сессии/стейта, здесь просто пример:
    const wallet = (req.headers.get("x-wallet") || "").toLowerCase()
    if (!wallet) return NextResponse.json({ error: "missing_wallet" }, { status: 400 })

    await sql /*sql*/`
      INSERT INTO user_identities
        (wallet_address, platform, platform_user_id, username, display_name, avatar_url, created_at, updated_at)
      VALUES
        (${wallet}, 'farcaster', ${String(fid)}, ${username}, ${displayName}, ${avatarUrl}, NOW(), NOW())
      ON CONFLICT (wallet_address, platform) DO UPDATE SET
        platform_user_id = EXCLUDED.platform_user_id,
        username        = EXCLUDED.username,
        display_name    = EXCLUDED.display_name,
        avatar_url      = EXCLUDED.avatar_url,
        updated_at      = NOW();
    `

    // (опц.) сохрани signer_uuid у себя, если планируешь писать касты от лица юзера
    // await sql`UPDATE user_identities SET signer_uuid=${signer_uuid} WHERE wallet_address=${wallet} AND platform='farcaster'`;

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("farcaster siwn error", e)
    return NextResponse.json({ error: "siwn_failed" }, { status: 400 })
  }
}
