import type { Metadata } from "next"
import SuperPokerClientPage from "./SuperPokerClientPage"

export const metadata: Metadata = {
  title: "Super Poker Registration | Piggy ID",
  description: "Register for Super Poker tournament with Discord authentication",
  openGraph: {
    title: "Super Poker Registration | Piggy ID",
    description: "Register for Super Poker tournament with Discord authentication",
    images: [
      {
        url: "/images/superpoker-preview.jpg",
        width: 1200,
        height: 1200,
        alt: "Super Poker - Pigs playing poker tournament",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Super Poker Registration | Piggy ID",
    description: "Register for Super Poker tournament with Discord authentication",
    images: ["/images/superpoker-preview.jpg"],
  },
}

export default function SuperPokerPage() {
  return <SuperPokerClientPage />
}
