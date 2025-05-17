import './globals.css'
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import ClientNetworkWrapper from '@/components/common/ClientNetworkWrapper'
import PageTransitionProvider from '@/providers/PageTransitionProvider'
import { Providers } from '@/providers/Providers'

// Modern sans-serif font
const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700']
})

export const metadata: Metadata = {
  title: 'Trade Journal | Advanced Analytics',
  description: 'Track, analyze, and improve your trading performance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans antialiased text-slate-100 min-h-screen flex flex-col`}>
        <Providers>
          <PageTransitionProvider>
            {children}
          </PageTransitionProvider>
          <ClientNetworkWrapper />
        </Providers>
      </body>
    </html>
  )
}
