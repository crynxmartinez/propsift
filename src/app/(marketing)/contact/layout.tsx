import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with PropSift. Questions about our CRM? Need support? We\'re here to help real estate wholesalers succeed.',
  openGraph: {
    title: 'Contact | PropSift',
    description: 'Get in touch with PropSift. Questions about our CRM? Need support? We\'re here to help.',
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
