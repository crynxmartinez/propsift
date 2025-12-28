'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  Building2, 
  FileText, 
  CheckSquare, 
  TrendingUp, 
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  UserCheck,
  UserX,
  Crown
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

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'users'>('overview')
  
  // Stats
  const [stats, setStats] = useState<Stats | null>(null)
  
  // Accounts
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountsPage, setAccountsPage] = useState(1)
  const [accountsTotalPages, setAccountsTotalPages] = useState(1)
  const [accountsSearch, setAccountsSearch] = useState('')
  
  // Users
  const [users, setUsers] = useState<User[]>([])
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersRoleFilter, setUsersRoleFilter] = useState('')
  const [usersStatusFilter, setUsersStatusFilter] = useState('')
  
  // Action menu
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null)

  // Check authorization
  useEffect(() => {
    const checkAuth = async () => {
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
        setAuthorized(true)
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  // Fetch accounts
  useEffect(() => {
    if (!authorized || activeTab !== 'accounts') return

    const fetchAccounts = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const params = new URLSearchParams({
          page: accountsPage.toString(),
          limit: '20'
        })
        if (accountsSearch) params.set('search', accountsSearch)

        const response = await fetch(`/api/admin/accounts?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          setAccounts(data.accounts)
          setAccountsTotalPages(data.pagination.totalPages)
        }
      } catch (error) {
        console.error('Error fetching accounts:', error)
      }
    }

    const debounce = setTimeout(fetchAccounts, 300)
    return () => clearTimeout(debounce)
  }, [authorized, activeTab, accountsPage, accountsSearch])

  // Fetch users
  useEffect(() => {
    if (!authorized || activeTab !== 'users') return

    const fetchUsers = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const params = new URLSearchParams({
          page: usersPage.toString(),
          limit: '20'
        })
        if (usersSearch) params.set('search', usersSearch)
        if (usersRoleFilter) params.set('role', usersRoleFilter)
        if (usersStatusFilter) params.set('status', usersStatusFilter)

        const response = await fetch(`/api/admin/users?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          setUsers(data.users)
          setUsersTotalPages(data.pagination.totalPages)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      }
    }

    const debounce = setTimeout(fetchUsers, 300)
    return () => clearTimeout(debounce)
  }, [authorized, activeTab, usersPage, usersSearch, usersRoleFilter, usersStatusFilter])

  const handleUserAction = async (userId: string, action: 'activate' | 'deactivate' | 'make_admin' | 'remove_admin') => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const body: any = { userId }
      
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
        // Refresh users list
        setUsersPage(1)
        setActionMenuUser(null)
        // Trigger refetch
        setUsersSearch(prev => prev + ' ')
        setTimeout(() => setUsersSearch(prev => prev.trim()), 100)
      }
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">PropSift Admin</h1>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 border-b-2 text-sm font-medium ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`py-4 border-b-2 text-sm font-medium ${
                activeTab === 'accounts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Accounts
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 border-b-2 text-sm font-medium ${
                activeTab === 'users'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Users
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Users</p>
                    <p className="text-2xl font-bold">{stats.users.total}</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <span className="text-green-600">+{stats.users.newLast7Days}</span> last 7 days
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Building2 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Accounts</p>
                    <p className="text-2xl font-bold">{stats.users.owners}</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <span className="text-green-600">{stats.users.active}</span> active users
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Records</p>
                    <p className="text-2xl font-bold">{stats.records.total.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <span className="text-green-600">+{stats.records.last30Days}</span> last 30 days
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <CheckSquare className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Tasks</p>
                    <p className="text-2xl font-bold">{stats.tasks.total.toLocaleString()}</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  <span className="text-green-600">+{stats.tasks.last30Days}</span> last 30 days
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-400" />
                Platform Growth
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-gray-500">New Users (30d)</p>
                  <p className="text-xl font-bold text-green-600">+{stats.users.newLast30Days}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">New Users (7d)</p>
                  <p className="text-xl font-bold text-green-600">+{stats.users.newLast7Days}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Records (30d)</p>
                  <p className="text-xl font-bold text-blue-600">+{stats.records.last30Days}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Tasks (30d)</p>
                  <p className="text-xl font-bold text-purple-600">+{stats.tasks.last30Days}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Accounts Tab */}
        {activeTab === 'accounts' && (
          <div className="space-y-6">
            {/* Search */}
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search accounts by email, name, or company..."
                  value={accountsSearch}
                  onChange={(e) => {
                    setAccountsSearch(e.target.value)
                    setAccountsPage(1)
                  }}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Accounts Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Records</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {accounts.map(account => (
                    <tr key={account.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {account.name || 'No name'}
                            {account.isPlatformAdmin && (
                              <span title="Platform Admin"><Crown className="w-4 h-4 text-yellow-500" /></span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{account.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {account.companyName || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {account.teamMemberCount} members
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {account.recordCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {account.taskCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          account.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {account.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {accountsTotalPages > 1 && (
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <button
                    onClick={() => setAccountsPage(p => Math.max(1, p - 1))}
                    disabled={accountsPage === 1}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {accountsPage} of {accountsTotalPages}
                  </span>
                  <button
                    onClick={() => setAccountsPage(p => Math.min(accountsTotalPages, p + 1))}
                    disabled={accountsPage === accountsTotalPages}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={usersSearch}
                      onChange={(e) => {
                        setUsersSearch(e.target.value)
                        setUsersPage(1)
                      }}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <select
                  value={usersRoleFilter}
                  onChange={(e) => {
                    setUsersRoleFilter(e.target.value)
                    setUsersPage(1)
                  }}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Roles</option>
                  <option value="owner">Owner</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                </select>
                <select
                  value={usersStatusFilter}
                  onChange={(e) => {
                    setUsersStatusFilter(e.target.value)
                    setUsersPage(1)
                  }}
                  className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {user.name || 'No name'}
                            {user.isPlatformAdmin && (
                              <span title="Platform Admin"><Crown className="w-4 h-4 text-yellow-500" /></span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'super_admin' ? 'bg-blue-100 text-blue-700' :
                          user.role === 'admin' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.accountOwner ? (
                          <div>
                            <div>{user.accountOwner.companyName || user.accountOwner.name || 'No name'}</div>
                            <div className="text-xs text-gray-400">{user.accountOwner.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Account Owner</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative">
                          <button
                            onClick={() => setActionMenuUser(actionMenuUser === user.id ? null : user.id)}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                          </button>
                          {actionMenuUser === user.id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActionMenuUser(null)} />
                              <div className="absolute right-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-20">
                                {user.status === 'active' ? (
                                  <button
                                    onClick={() => handleUserAction(user.id, 'deactivate')}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <UserX className="w-4 h-4" /> Deactivate
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUserAction(user.id, 'activate')}
                                    className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                                  >
                                    <UserCheck className="w-4 h-4" /> Activate
                                  </button>
                                )}
                                {user.isPlatformAdmin ? (
                                  <button
                                    onClick={() => handleUserAction(user.id, 'remove_admin')}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                                  >
                                    <Crown className="w-4 h-4" /> Remove Admin
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUserAction(user.id, 'make_admin')}
                                    className="w-full px-4 py-2 text-left text-sm text-yellow-600 hover:bg-yellow-50 flex items-center gap-2"
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
              {usersTotalPages > 1 && (
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <button
                    onClick={() => setUsersPage(p => Math.max(1, p - 1))}
                    disabled={usersPage === 1}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {usersPage} of {usersTotalPages}
                  </span>
                  <button
                    onClick={() => setUsersPage(p => Math.min(usersTotalPages, p + 1))}
                    disabled={usersPage === usersTotalPages}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
