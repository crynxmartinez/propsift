'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket, FileText, Zap, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="p-6 min-h-[80vh] flex items-center justify-center">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <Rocket className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground">
            DockInsight v3.0
          </h1>
          <p className="text-xl text-muted-foreground">
            Powered by the Lead Cadence Engine
          </p>
        </div>

        {/* Coming Soon Card */}
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="p-8 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary font-medium">
              <Clock className="w-4 h-4" />
              Coming Soon
            </div>
            
            <h2 className="text-2xl font-semibold text-foreground">
              We&apos;re rebuilding DockInsight from the ground up
            </h2>
            
            <p className="text-muted-foreground max-w-md mx-auto">
              The new Lead Cadence Engine (LCE) will power intelligent lead prioritization, 
              automated follow-up cadences, and a self-healing queue system.
            </p>

            {/* Features Preview */}
            <div className="grid sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 bg-background rounded-lg border">
                <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                <h3 className="font-medium text-foreground">Smart Scoring</h3>
                <p className="text-sm text-muted-foreground">10-component priority algorithm</p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <h3 className="font-medium text-foreground">Auto Cadences</h3>
                <p className="text-sm text-muted-foreground">HOT/WARM/COLD sequences</p>
              </div>
              <div className="p-4 bg-background rounded-lg border">
                <FileText className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <h3 className="font-medium text-foreground">6 Queue Sections</h3>
                <p className="text-sm text-muted-foreground">Overdue, Due Today, Tasks & more</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => router.push('/dashboard/records')}>
            View Records
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/tasks')}>
            View Tasks
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/boards')}>
            View Boards
          </Button>
        </div>

        {/* Spec Link */}
        <p className="text-sm text-muted-foreground">
          See the full specification in{' '}
          <code className="px-2 py-1 bg-muted rounded text-xs">
            docs/LCE-v2.3.1-SPECIFICATION.md
          </code>
        </p>
      </div>
    </div>
  )
}
