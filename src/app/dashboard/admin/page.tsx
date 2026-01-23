'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Building2, 
  FileText, 
  CheckSquare, 
  TrendingUp,
  Shield
} from 'lucide-react'

interface Stats {
  users: {
    total: number
    owners: number
    active: number
    newLast30Days: number
    newLast7Days: number
  }
  records: {
    total: number
    last30Days: number
  }
  tasks: {
    total: number
    last30Days: number
  }
}

export default function AdminOverviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const response = await fetch('/api/admin/stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.status === 403) {
          router.push('/dashboard')
          return
        }
        
        if (!response.ok) {
          router.push('/login')
          return
        }

        const data = await response.json()
        setStats(data)
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Shield className="w-12 h-12 mb-4" />
        <p>Access denied or failed to load stats</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-purple-500" />
          Admin Overview
        </h1>
        <p className="text-muted-foreground">Platform-wide statistics and insights</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-xl p-6 border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl font-bold">{stats.users.total}</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <span className="text-green-500">+{stats.users.newLast7Days}</span> last 7 days
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Building2 className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Accounts</p>
              <p className="text-2xl font-bold">{stats.users.owners}</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <span className="text-green-500">{stats.users.active}</span> active users
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Records</p>
              <p className="text-2xl font-bold">{stats.records.total.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <span className="text-green-500">+{stats.records.last30Days}</span> last 30 days
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <CheckSquare className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
              <p className="text-2xl font-bold">{stats.tasks.total.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 text-sm text-muted-foreground">
            <span className="text-green-500">+{stats.tasks.last30Days}</span> last 30 days
          </div>
        </div>
      </div>

      {/* Growth Stats */}
      <div className="bg-card rounded-xl p-6 border">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
          Platform Growth
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-muted-foreground">New Users (30d)</p>
            <p className="text-xl font-bold text-green-500">+{stats.users.newLast30Days}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">New Users (7d)</p>
            <p className="text-xl font-bold text-green-500">+{stats.users.newLast7Days}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Records (30d)</p>
            <p className="text-xl font-bold text-blue-500">+{stats.records.last30Days}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tasks (30d)</p>
            <p className="text-xl font-bold text-purple-500">+{stats.tasks.last30Days}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
