'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart3 } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) {
      router.push('/login')
      return
    }
    setAuthenticated(true)
    setLoading(false)
  }, [router])

  if (loading || !authenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <BarChart3 className="w-16 h-16 mb-4 text-gray-300" />
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm mt-2">Coming soon</p>
        </div>
      </div>
    </div>
  )
}
