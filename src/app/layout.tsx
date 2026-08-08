import './globals.css'
import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import ClientNetworkWrapper from '@/components/common/ClientNetworkWrapper'
import PageTransitionProvider from '@/providers/PageTransitionProvider'
import { Providers } from '@/providers/Providers'
import ToastProvider from '@/components/ui/ToastProvider'

// Modern sans-serif font
const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700']
})

export const metadata: Metadata = {
  title: 'TradeTrackr | Trading Journal & Analytics',
  description: 'The professional trading journal that helps you track, analyze, and master your trading performance with AI-powered insights.',
  openGraph: {
    title: 'TradeTrackr | Trading Journal & Analytics',
    description: 'The professional trading journal that helps you track, analyze, and master your trading performance with AI-powered insights.',
    url: 'https://tradetrackr.com',
    siteName: 'TradeTrackr',
    images: [
      {
        url: 'https://tradetrackr.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TradeTrackr Dashboard Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TradeTrackr | Trading Journal & Analytics',
    description: 'The professional trading journal that helps you track, analyze, and master your trading performance with AI-powered insights.',
    images: ['https://tradetrackr.com/og-image.jpg'],
    creator: '@TradeTrackr',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans antialiased text-slate-100 min-h-screen flex flex-col`}>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:shadow-lg">
          Skip to main content
        </a>
        <Providers>
          <PageTransitionProvider>
            {children}
          </PageTransitionProvider>
          <ClientNetworkWrapper />
          <ToastProvider />
        </Providers>
      </body>
    </html>
  )
}
