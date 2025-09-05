import type { Metadata } from "next"
import SuperPokerClientPage from "./SuperPokerClientPage"

export const metadata: Metadata = {
  title: "Super Poker Registration | Piggy ID",
  description: "Register for Super Poker tournament with Discord authentication",
}

export default function SuperPokerPage() {
  return <SuperPokerClientPage />
}
