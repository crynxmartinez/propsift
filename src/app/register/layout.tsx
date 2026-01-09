import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Start Free Trial',
  description: 'Create your PropSift account. 14-day free trial, no credit card required. Start organizing your leads today.',
  openGraph: {
    title: 'Start Free Trial | PropSift',
    description: 'Create your PropSift account. 14-day free trial, no credit card required.',
  },
}

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
