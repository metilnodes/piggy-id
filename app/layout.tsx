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
      <body>{children}</body>
    </html>
  )
}


import './globals.css'