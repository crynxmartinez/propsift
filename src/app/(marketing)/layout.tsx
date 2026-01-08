import { MarketingLayout } from '@/components/marketing'

export default function MarketingRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <MarketingLayout>{children}</MarketingLayout>
}
