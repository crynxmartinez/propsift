import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for PropSift. Plans starting at $49/month. 14-day free trial, no credit card required.',
  openGraph: {
    title: 'Pricing | PropSift',
    description: 'Simple, transparent pricing for PropSift. Plans starting at $49/month. 14-day free trial.',
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
