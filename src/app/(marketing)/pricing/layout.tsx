import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for PropSift. $10 enrollment fee + 3 months free, then $49/month. Cancel anytime.',
  openGraph: {
    title: 'Pricing | PropSift',
    description: 'Simple, transparent pricing for PropSift. $10 enrollment + 3 months free, then $49/month.',
  },
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
