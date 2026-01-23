'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search,
  ChevronLeft,
  ChevronRight,
  Crown,
  Building2
} from 'lucide-react'

interface Account {
  id: string
  email: string
  name: string | null
  companyName: string | null
  status: string
  isPlatformAdmin: boolean
  createdAt: string
  teamMemberCount: number
  recordCount: number
  taskCount: number
}

export default function AdminAccountsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchAccounts = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/login')
        return
      }

      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20'
        })
        if (search) params.set('search', search)

        const response = await fetch(`/api/admin/accounts?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.status === 403) {
          router.push('/dashboard')
          return
        }

        if (response.ok) {
          const data = await response.json()
          setAccounts(data.accounts)
          setTotalPages(data.pagination.totalPages)
        }
      } catch (error) {
        console.error('Error fetching accounts:', error)
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(fetchAccounts, 300)
    return () => clearTimeout(debounce)
  }, [router, page, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-purple-500" />
          Accounts
        </h1>
        <p className="text-muted-foreground">Manage all account owners</p>
      </div>

      {/* Search */}
      <div className="bg-card rounded-xl p-4 border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search accounts by email, name, or company..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Team</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Records</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tasks</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accounts.map(account => (
              <tr key={account.id} className="hover:bg-muted/50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {account.name || 'No name'}
                      {account.isPlatformAdmin && (
                        <span title="Platform Admin"><Crown className="w-4 h-4 text-yellow-500" /></span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{account.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {account.companyName || '-'}
                </td>
                <td className="px-6 py-4 text-sm">
                  {account.teamMemberCount} members
                </td>
                <td className="px-6 py-4 text-sm">
                  {account.recordCount.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  {account.taskCount.toLocaleString()}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    account.status === 'active'
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    {account.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(account.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
