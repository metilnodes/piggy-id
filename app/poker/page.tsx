import type { Metadata } from "next"
import PokerClientPage from "./PokerClientPage"

export const metadata: Metadata = {
  title: "Piggy Summer Poker Tournament",
  description:
    "Join the exclusive Piggy Summer Poker Tournament! Connect your wallet, verify your Piggy ID NFT, and get your unique invite code to compete.",
  openGraph: {
    title: "Piggy Summer Poker Tournament",
    description: "Exclusive poker tournament for Piggy ID holders. Verify your NFT and get your invite code!",
    url: "https://id.piggyworld.xyz/poker",
    siteName: "Piggy ID",
    images: [
      {
        url: "/poker-preview.png",
        width: 1200,
        height: 630,
        alt: "Piggy Summer Poker Tournament",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Piggy Summer Poker Tournament",
    description: "Exclusive poker tournament for Piggy ID holders. Verify your NFT and get your invite code!",
    images: ["/poker-preview.png"],
  },
}

export default function PokerPage() {
  return <PokerClientPage />
}
