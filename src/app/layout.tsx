import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { JsonLd } from '@/components/seo/JsonLd'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'PropSift - Real Estate Lead Analytics & CRM',
    template: '%s | PropSift',
  },
  description: 'Smart CRM for real estate wholesalers. Organize leads, automate follow-ups, track analytics & close more deals. Free trial.',
  keywords: [
    'real estate CRM',
    'wholesaler CRM', 
    'real estate lead management',
    'property lead analytics',
    'real estate automation',
    'lead scoring software',
    'wholesaling software',
    'real estate investor tools',
    'cold calling CRM',
    'lead cadence management',
  ],
  authors: [{ name: 'PropSift' }],
  creator: 'PropSift',
  publisher: 'PropSift',
  metadataBase: new URL('https://propsift.com'),
  alternates: {
    canonical: 'https://propsift.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'Real Estate Software',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://propsift.com',
    siteName: 'PropSift',
    title: 'PropSift - Real Estate Lead Analytics & CRM',
    description: 'Smart CRM for real estate wholesalers. Organize leads, automate follow-ups, track analytics & close more deals.',
    images: [
      {
        url: '/logo.svg',
        width: 1200,
        height: 630,
        alt: 'PropSift - Real Estate Lead Analytics & CRM',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PropSift - Real Estate Lead Analytics & CRM',
    description: 'Smart CRM for real estate wholesalers. Organize leads, automate follow-ups, track analytics & close more deals.',
    images: ['/logo.svg'],
    creator: '@propsift',
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
      <head>
        <JsonLd />
      </head>
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
