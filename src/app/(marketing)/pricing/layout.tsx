import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'PropSift is FREE for 2026! Soft launch - get full access while we build together. $49/month starting 2027.',
  openGraph: {
    title: 'Pricing | PropSift',
    description: 'PropSift is FREE for 2026! Soft launch - full access, no credit card required.',
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
