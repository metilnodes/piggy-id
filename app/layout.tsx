import './globals.css'
import { Web3Provider } from '@/providers/web3-provider'

export const metadata = {
  title: 'Piggy ID',
  description: 'Mint your OINKDENTITY and explore the Piggy World',
  generator: 'v0.dev'
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
