import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

interface DiscordMember {
  user: {
    id: string
    username: string
  }
  roles: string[]
}

interface RoleCheckResponse {
  hasRequired: boolean
  mode: "any" | "all"
  checkedRoles: string[]
  matchedRoles: string[]
  missingRoles: string[]
  checkedRoleNames: string[]
  matchedRoleNames: string[]
  missingRoleNames: string[]
  discordId: string
  isGuildMember: boolean
  guildInviteUrl?: string
  error?: string
}

function parseRoleNames(): Record<string, string> {
  const roleNamesEnv = process.env.DISCORD_ROLE_NAMES || ""
  const roleNames: Record<string, string> = {}

  if (roleNamesEnv) {
    const pairs = roleNamesEnv.split(",")
    for (const pair of pairs) {
      const [id, name] = pair.split(":").map((s) => s.trim())
      if (id && name) {
        roleNames[id] = name
      }
    }
  }

  return roleNames
}

function getRoleName(roleId: string, roleNames: Record<string, string>): string {
  return roleNames[roleId] || `Role ${roleId}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallet = searchParams.get("wallet")
    const discordId = searchParams.get("discord_id")
    const mode = (searchParams.get("mode") || "any") as "any" | "all"
    const rolesParam = searchParams.get("roles")

    if (!wallet && !discordId) {
      return NextResponse.json({ error: "Wallet address or Discord ID is required" }, { status: 400 })
    }

    const roleIds = rolesParam
      ? rolesParam.split(",").map((id) => id.trim())
      : (process.env.DISCORD_ROLE_IDS || "")
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)

    if (roleIds.length === 0) {
      return NextResponse.json({ error: "No roles specified to check" }, { status: 400 })
    }

    const roleNames = parseRoleNames()

    let finalDiscordId: string

    if (discordId) {
      const superpokerResult = await sql`
        SELECT discord_id 
        FROM superpoker_users 
        WHERE discord_id = ${discordId}
        LIMIT 1
      `

      if (superpokerResult.length === 0) {
        return NextResponse.json(
          {
            error: "Discord account not found in superpoker system",
            hasRequired: false,
            mode,
            checkedRoles: roleIds,
            matchedRoles: [],
            missingRoles: roleIds,
            checkedRoleNames: roleIds.map((id) => getRoleName(id, roleNames)),
            matchedRoleNames: [],
            missingRoleNames: roleIds.map((id) => getRoleName(id, roleNames)),
            discordId: discordId,
            isGuildMember: false,
          },
          { status: 404 },
        )
      }

      finalDiscordId = discordId
    } else {
      const userResult = await sql`
        SELECT sp.discord_id 
        FROM superpoker_users sp
        WHERE sp.discord_id IN (
          SELECT ui.discord_id 
          FROM user_identities ui 
          WHERE ui.wallet_address = ${wallet}
        )
        LIMIT 1
      `

      if (userResult.length === 0) {
        return NextResponse.json(
          {
            error: "Discord account not found for this wallet",
            hasRequired: false,
            mode,
            checkedRoles: roleIds,
            matchedRoles: [],
            missingRoles: roleIds,
            checkedRoleNames: roleIds.map((id) => getRoleName(id, roleNames)),
            matchedRoleNames: [],
            missingRoleNames: roleIds.map((id) => getRoleName(id, roleNames)),
            discordId: "",
            isGuildMember: false,
          },
          { status: 404 },
        )
      }

      finalDiscordId = userResult[0].discord_id
    }

    const botToken = process.env.DISCORD_BOT_TOKEN
    const guildId = process.env.DISCORD_GUILD_ID

    if (!botToken || !guildId) {
      return NextResponse.json(
        {
          error: "Discord bot configuration missing",
          hasRequired: false,
          mode,
          checkedRoles: roleIds,
          matchedRoles: [],
          missingRoles: roleIds,
          checkedRoleNames: roleIds.map((id) => getRoleName(id, roleNames)),
          matchedRoleNames: [],
          missingRoleNames: roleIds.map((id) => getRoleName(id, roleNames)),
          discordId,
          isGuildMember: false,
        },
        { status: 500 },
      )
    }

    const discordResponse = await fetch(`https://discord.com/api/guilds/${guildId}/members/${finalDiscordId}`, {
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
    })

    if (discordResponse.status === 404) {
      return NextResponse.json({
        hasRequired: false,
        mode,
        checkedRoles: roleIds,
        matchedRoles: [],
        missingRoles: roleIds,
        checkedRoleNames: roleIds.map((id) => getRoleName(id, roleNames)),
        matchedRoleNames: [],
        missingRoleNames: roleIds.map((id) => getRoleName(id, roleNames)),
        discordId: finalDiscordId,
        isGuildMember: false,
        guildInviteUrl: "https://discord.gg/superform",
        error: "User is not a member of the Discord server",
      })
    }

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text()
      console.error("Discord API error:", discordResponse.status, errorText)

      return NextResponse.json(
        {
          error: `Discord API error: ${discordResponse.status}`,
          hasRequired: false,
          mode,
          checkedRoles: roleIds,
          matchedRoles: [],
          missingRoles: roleIds,
          checkedRoleNames: roleIds.map((id) => getRoleName(id, roleNames)),
          matchedRoleNames: [],
          missingRoleNames: roleIds.map((id) => getRoleName(id, roleNames)),
          discordId: finalDiscordId,
          isGuildMember: false,
        },
        { status: discordResponse.status },
      )
    }

    const member: DiscordMember = await discordResponse.json()

    const userRoles = member.roles || []
    const matchedRoles = roleIds.filter((roleId) => userRoles.includes(roleId))
    const missingRoles = roleIds.filter((roleId) => !userRoles.includes(roleId))

    const hasRequired = mode === "any" ? matchedRoles.length > 0 : matchedRoles.length === roleIds.length

    const response: RoleCheckResponse = {
      hasRequired,
      mode,
      checkedRoles: roleIds,
      matchedRoles,
      missingRoles,
      checkedRoleNames: roleIds.map((id) => getRoleName(id, roleNames)),
      matchedRoleNames: matchedRoles.map((id) => getRoleName(id, roleNames)),
      missingRoleNames: missingRoles.map((id) => getRoleName(id, roleNames)),
      discordId: finalDiscordId,
      isGuildMember: true,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Role check error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        hasRequired: false,
        mode: "any" as const,
        checkedRoles: [],
        matchedRoles: [],
        missingRoles: [],
        checkedRoleNames: [],
        matchedRoleNames: [],
        missingRoleNames: [],
        discordId: "",
        isGuildMember: false,
      },
      { status: 500 },
    )
  }
}
