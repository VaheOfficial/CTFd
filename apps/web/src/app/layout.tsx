import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/lib/providers'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-sans',
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: 'CTE Platform - Defensive Cyber Operations',
  description: 'Self-hosted CTF platform optimized for Defensive Cyberspace Operations with AI-generated challenges',
  keywords: ['CTF', 'cybersecurity', 'defensive operations', 'hacking', 'cyber defense'],
  authors: [{ name: 'CTE Platform Team' }],
  openGraph: {
    title: 'CTE Platform - Defensive Cyber Operations',
    description: 'Master defensive cybersecurity through hands-on CTF challenges',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
