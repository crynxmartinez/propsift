import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'PropSift - CRM for Real Estate Wholesalers',
    template: '%s | PropSift',
  },
  description: 'The all-in-one CRM built for real estate wholesalers. Organize leads, automate follow-ups, track outreach, and close more deals. Start your free trial today.',
  keywords: ['real estate wholesaling', 'CRM', 'lead management', 'real estate investors', 'property leads', 'wholesaler CRM', 'real estate automation'],
  authors: [{ name: 'PropSift' }],
  creator: 'PropSift',
  publisher: 'PropSift',
  metadataBase: new URL('https://propsift.com'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://propsift.com',
    siteName: 'PropSift',
    title: 'PropSift - CRM for Real Estate Wholesalers',
    description: 'The all-in-one CRM built for real estate wholesalers. Organize leads, automate follow-ups, and close more deals.',
    images: [
      {
        url: '/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'PropSift - CRM for Real Estate Wholesalers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PropSift - CRM for Real Estate Wholesalers',
    description: 'The all-in-one CRM built for real estate wholesalers. Organize leads, automate follow-ups, and close more deals.',
    images: ['/og-image.svg'],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.svg',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
