import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your PropSift account. Access your leads, tasks, and analytics dashboard.',
  openGraph: {
    title: 'Login | PropSift',
    description: 'Sign in to your PropSift account. Access your leads, tasks, and analytics dashboard.',
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
