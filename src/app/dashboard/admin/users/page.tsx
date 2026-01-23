'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  UserCheck,
  UserX,
  Crown,
  Users
} from 'lucide-react'

interface User {
  id: string
  email: string
  name: string | null
  role: string
  status: string
  isPlatformAdmin: boolean
  createdAt: string
  accountOwnerId: string | null
  accountOwner: {
    id: string
    email: string
    name: string | null
    companyName: string | null
  } | null
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null)

  const fetchUsers = async () => {
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
      if (roleFilter) params.set('role', roleFilter)
      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.status === 403) {
        router.push('/dashboard')
        return
      }

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const debounce = setTimeout(fetchUsers, 300)
    return () => clearTimeout(debounce)
  }, [router, page, search, roleFilter, statusFilter])

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'make_admin' | 'remove_admin') => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const body: Record<string, unknown> = { userId }
      
      if (action === 'activate') body.status = 'active'
      if (action === 'deactivate') body.status = 'inactive'
      if (action === 'make_admin') body.isPlatformAdmin = true
      if (action === 'remove_admin') body.isPlatformAdmin = false

      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        setActionMenuUser(null)
        fetchUsers()
      }
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

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
          <Users className="w-6 h-6 text-blue-500" />
          Users
        </h1>
        <p className="text-muted-foreground">Manage all platform users</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-4 border">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Roles</option>
            <option value="owner">Owner</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-muted/50">
                <td className="px-6 py-4">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {user.name || 'No name'}
                      {user.isPlatformAdmin && (
                        <span title="Platform Admin"><Crown className="w-4 h-4 text-yellow-500" /></span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    user.role === 'owner' ? 'bg-purple-500/20 text-purple-500' :
                    user.role === 'super_admin' ? 'bg-blue-500/20 text-blue-500' :
                    user.role === 'admin' ? 'bg-green-500/20 text-green-500' :
                    'bg-gray-500/20 text-gray-500'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {user.accountOwner ? (
                    <div>
                      <div>{user.accountOwner.companyName || user.accountOwner.name || 'No name'}</div>
                      <div className="text-xs">{user.accountOwner.email}</div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Account Owner</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                    user.status === 'active'
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-red-500/20 text-red-500'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <div className="relative">
                    <button
                      onClick={() => setActionMenuUser(actionMenuUser === user.id ? null : user.id)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <MoreVertical className="w-5 h-5 text-muted-foreground" />
                    </button>
                    {actionMenuUser === user.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActionMenuUser(null)} />
                        <div className="absolute right-0 mt-1 w-48 bg-card border rounded-lg shadow-lg z-20">
                          {user.status === 'active' ? (
                            <button
                              onClick={() => handleUserAction(user.id, 'deactivate')}
                              className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-muted flex items-center gap-2"
                            >
                              <UserX className="w-4 h-4" /> Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(user.id, 'activate')}
                              className="w-full px-4 py-2 text-left text-sm text-green-500 hover:bg-muted flex items-center gap-2"
                            >
                              <UserCheck className="w-4 h-4" /> Activate
                            </button>
                          )}
                          {user.isPlatformAdmin ? (
                            <button
                              onClick={() => handleUserAction(user.id, 'remove_admin')}
                              className="w-full px-4 py-2 text-left text-sm text-muted-foreground hover:bg-muted flex items-center gap-2"
                            >
                              <Crown className="w-4 h-4" /> Remove Admin
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUserAction(user.id, 'make_admin')}
                              className="w-full px-4 py-2 text-left text-sm text-yellow-500 hover:bg-muted flex items-center gap-2"
                            >
                              <Crown className="w-4 h-4" /> Make Admin
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
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
