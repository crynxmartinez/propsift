'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Loader2, Rocket } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">DockInsight</h1>
          <p className="text-sm text-muted-foreground">Your command center</p>
        </div>
      </div>

      {/* Coming Soon */}
      <Card className="border-2 border-dashed border-primary/30">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
          <Rocket className="w-16 h-16 text-primary mb-6" />
          <h2 className="text-2xl font-bold text-foreground mb-2">DockInsight v2.2 Coming Soon</h2>
          <p className="text-muted-foreground max-w-md">
            We're rebuilding the scoring engine with smarter prioritization, 
            motivation stacking, and intelligent next-action recommendations.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
