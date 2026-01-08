'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3, Loader2 } from 'lucide-react'

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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dock Insight</h1>
          <p className="text-sm text-gray-500">v2 Coming Soon</p>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            DockInsight v2 is Under Construction
          </h2>
          <p className="text-gray-600 mb-6">
            We're building a smarter dashboard with priority scoring, action queues, 
            and AI-powered recommendations to help you focus on the leads that matter most.
          </p>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white/60 rounded-xl p-4 border border-blue-100">
              <div className="text-2xl mb-2">🎯</div>
              <h3 className="font-medium text-gray-900 mb-1">Priority Scoring</h3>
              <p className="text-sm text-gray-600">
                Automatic lead scoring based on motivation, contact info, and activity.
              </p>
            </div>
            <div className="bg-white/60 rounded-xl p-4 border border-blue-100">
              <div className="text-2xl mb-2">📞</div>
              <h3 className="font-medium text-gray-900 mb-1">Call Queues</h3>
              <p className="text-sm text-gray-600">
                Know exactly who to call next with prioritized action lists.
              </p>
            </div>
            <div className="bg-white/60 rounded-xl p-4 border border-blue-100">
              <div className="text-2xl mb-2">📊</div>
              <h3 className="font-medium text-gray-900 mb-1">Smart Charts</h3>
              <p className="text-sm text-gray-600">
                Temperature distribution, pipeline health, and team performance.
              </p>
            </div>
            <div className="bg-white/60 rounded-xl p-4 border border-blue-100">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-medium text-gray-900 mb-1">Today's Plan</h3>
              <p className="text-sm text-gray-600">
                Action cards showing what needs attention right now.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
