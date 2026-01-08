'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

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
    <div className="p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Dock Insight</h1>
          <Badge variant="secondary">v2 Coming Soon</Badge>
        </div>
      </div>

      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle>DockInsight v2 is Under Construction</CardTitle>
          <CardDescription>
            We're building a smarter dashboard with priority scoring, action queues, 
            and AI-powered recommendations to help you focus on the leads that matter most.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="bg-card/60">
              <CardContent className="pt-6">
                <div className="text-2xl mb-2">🎯</div>
                <h3 className="font-medium mb-1">Priority Scoring</h3>
                <p className="text-sm text-muted-foreground">
                  Automatic lead scoring based on motivation, contact info, and activity.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/60">
              <CardContent className="pt-6">
                <div className="text-2xl mb-2">📞</div>
                <h3 className="font-medium mb-1">Call Queues</h3>
                <p className="text-sm text-muted-foreground">
                  Know exactly who to call next with prioritized action lists.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/60">
              <CardContent className="pt-6">
                <div className="text-2xl mb-2">📊</div>
                <h3 className="font-medium mb-1">Smart Charts</h3>
                <p className="text-sm text-muted-foreground">
                  Temperature distribution, pipeline health, and team performance.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card/60">
              <CardContent className="pt-6">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="font-medium mb-1">Today's Plan</h3>
                <p className="text-sm text-muted-foreground">
                  Action cards showing what needs attention right now.
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
