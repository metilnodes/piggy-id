import type React from "react"
import "./globals.css"
import { Web3Provider } from "@/providers/web3-provider"

export const metadata = {
  title: "Piggy ID",
  description: "Mint your OINKDENTITY and explore the Piggy World",
  generator: "metil",
  icons: {
    icon: "/placeholder.svg?height=32&width=32&text=🐷",
  },
  openGraph: {
    title: "Piggy ID",
    description: "Mint your OINKDENTITY and explore the Piggy World",
    url: "https://id.piggyworld.xyz",
    siteName: "Piggy ID",
    images: [
      {
        url: "/placeholder.svg?height=630&width=1200&text=Piggy+ID+Preview",
        width: 1200,
        height: 630,
        alt: "Piggy ID Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Piggy ID",
    description: "Mint your OINKDENTITY and explore the Piggy World",
    images: ["/placeholder.svg?height=630&width=1200&text=Piggy+ID+Preview"],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  )
}
