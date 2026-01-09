'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronRight, 
  Pencil, 
  Phone, 
  Mail, 
  Plus, 
  Loader2,
  User,
  Building2,
  X,
  Check,
  Ban,
  PhoneOff,
  Skull,
  MessageSquare,
  Clock,
  Home,
  ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface RecordData {
  id: string
  ownerFirstName: string | null
  ownerLastName: string | null
  ownerFullName: string
  isCompany: boolean
  propertyStreet: string | null
  propertyCity: string | null
  propertyState: string | null
  propertyZip: string | null
  mailingStreet: string | null
  mailingCity: string | null
  mailingState: string | null
  mailingZip: string | null
  phone: string | null
  email: string | null
  notes: string | null
  temperature: string | null
  callAttempts: number
  directMailAttempts: number
  smsAttempts: number
  rvmAttempts: number
  isContact: boolean
  isComplete: boolean
  statusId: string | null
  status: {
    id: string
    name: string
    color: string
  } | null
  assignedTo: {
    id: string
    name: string | null
    email: string
  } | null
  phoneNumbers: PhoneNumber[]
  emails: EmailRecord[]
  recordTags: { tag: { id: string; name: string } }[]
  recordMotivations: { motivation: { id: string; name: string } }[]
  createdAt: string
  updatedAt: string
}

interface PhoneNumber {
  id: string
  number: string
  type: string
  statuses: string[]
  createdAt: string
}

interface EmailRecord {
  id: string
  email: string
  isPrimary: boolean
  createdAt: string
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface ActivityLog {
  id: string
  action: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  source: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  } | null
}

interface OwnerStats {
  propertyCount: number
  totalCallAttempts: number
  totalDirectMailAttempts: number
  totalSmsAttempts: number
  totalRvmAttempts: number
  verifiedNumbersPercent: number
  totalPhones: number
  totalEmails: number
  totalMotivations: number
  verifiedPhones: number
}

interface UserItem {
  id: string
  name: string | null
  email: string
}

type TabType = 'properties' | 'conversation' | 'activity'

const PHONE_STATUSES = [
  { value: 'NONE', label: 'None', icon: null, color: 'gray' },
  { value: 'PRIMARY', label: 'Primary', icon: Check, color: 'green' },
  { value: 'CORRECT', label: 'Correct', icon: Check, color: 'blue' },
  { value: 'WRONG', label: 'Wrong', icon: X, color: 'red' },
  { value: 'NO_ANSWER', label: 'No Answer', icon: PhoneOff, color: 'yellow' },
  { value: 'DNC', label: 'DNC', icon: Ban, color: 'orange' },
  { value: 'DEAD', label: 'Dead', icon: Skull, color: 'gray' },
]

export default function OwnerDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const recordId = params.id as string

  const [record, setRecord] = useState<RecordData | null>(null)
  const [ownerRecords, setOwnerRecords] = useState<RecordData[]>([])
  const [stats, setStats] = useState<OwnerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('properties')
  
  // Data
  const [users, setUsers] = useState<UserItem[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  
  // Form states
  const [newComment, setNewComment] = useState('')
  const [newPhone, setNewPhone] = useState({ number: '', type: 'MOBILE' })
  const [newEmail, setNewEmail] = useState('')
  
  // Activity filters
  const [activityEventType, setActivityEventType] = useState('all')
  const [activityUserId, setActivityUserId] = useState('all')
  
  // Modals
  const [showAddPhoneModal, setShowAddPhoneModal] = useState(false)
  const [showAddEmailModal, setShowAddEmailModal] = useState(false)
  const [showEditNameModal, setShowEditNameModal] = useState(false)
  const [editNameData, setEditNameData] = useState({ firstName: '', lastName: '' })
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'phone' | 'email' | null; id: string | null }>({ type: null, id: null })
  
  // Loading states
  const [savingPhone, setSavingPhone] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [savingName, setSavingName] = useState(false)
  const [deletingItem, setDeletingItem] = useState(false)
  const [updatingAttempt, setUpdatingAttempt] = useState<string | null>(null)

  useEffect(() => {
    fetchOwnerData()
    fetchUsers()
  }, [recordId])

  useEffect(() => {
    if (activeTab === 'conversation') {
      fetchComments()
    } else if (activeTab === 'activity') {
      fetchActivityLogs()
    }
  }, [activeTab, recordId])

  const fetchOwnerData = async () => {
    try {
      const res = await fetch(`/api/owners/${recordId}`)
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/dashboard/records')
          return
        }
        throw new Error('Failed to fetch owner')
      }
      const data = await res.json()
      setRecord(data.record)
      setOwnerRecords(data.ownerRecords)
      setStats(data.stats)
    } catch (error) {
      console.error('Error fetching owner:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/records/${recordId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const fetchActivityLogs = async () => {
    try {
      let url = `/api/records/${recordId}/activity?`
      if (activityEventType !== 'all') url += `eventType=${activityEventType}&`
      if (activityUserId !== 'all') url += `userId=${activityUserId}&`
      
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setActivityLogs(data)
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    }
  }

  const updateRecord = async (updates: Partial<RecordData>) => {
    try {
      const res = await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const data = await res.json()
        setRecord(data)
      }
    } catch (error) {
      console.error('Error updating record:', error)
    }
  }

  const handleAttemptChange = async (field: 'callAttempts' | 'directMailAttempts' | 'smsAttempts' | 'rvmAttempts', delta: number) => {
    if (!record) return
    setUpdatingAttempt(field)
    try {
      const currentValue = record[field]
      const newValue = Math.max(0, currentValue + delta)
      await updateRecord({ [field]: newValue })
    } finally {
      setUpdatingAttempt(null)
    }
  }

  const addPhone = async () => {
    if (!newPhone.number.trim()) return
    setSavingPhone(true)
    try {
      const res = await fetch(`/api/records/${recordId}/phones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPhone),
      })
      if (res.ok) {
        fetchOwnerData()
        setNewPhone({ number: '', type: 'MOBILE' })
        setShowAddPhoneModal(false)
      }
    } catch (error) {
      console.error('Error adding phone:', error)
    } finally {
      setSavingPhone(false)
    }
  }

  const togglePhoneStatus = async (phoneId: string, statusValue: string, currentStatuses: string[]) => {
    try {
      let newStatuses: string[]
      if (currentStatuses.includes(statusValue)) {
        newStatuses = currentStatuses.filter(s => s !== statusValue)
      } else {
        newStatuses = [...currentStatuses, statusValue]
      }
      await fetch(`/api/records/${recordId}/phones/${phoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statuses: newStatuses }),
      })
      fetchOwnerData()
    } catch (error) {
      console.error('Error updating phone statuses:', error)
    }
  }

  const deletePhone = async (phoneId: string) => {
    setDeletingItem(true)
    try {
      await fetch(`/api/records/${recordId}/phones/${phoneId}`, {
        method: 'DELETE',
      })
      fetchOwnerData()
      setConfirmDelete({ type: null, id: null })
    } catch (error) {
      console.error('Error deleting phone:', error)
    } finally {
      setDeletingItem(false)
    }
  }

  const addEmail = async () => {
    if (!newEmail.trim()) return
    setSavingEmail(true)
    try {
      const res = await fetch(`/api/records/${recordId}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })
      if (res.ok) {
        fetchOwnerData()
        setNewEmail('')
        setShowAddEmailModal(false)
      }
    } catch (error) {
      console.error('Error adding email:', error)
    } finally {
      setSavingEmail(false)
    }
  }

  const deleteEmail = async (emailId: string) => {
    setDeletingItem(true)
    try {
      await fetch(`/api/records/${recordId}/emails/${emailId}`, {
        method: 'DELETE',
      })
      fetchOwnerData()
      setConfirmDelete({ type: null, id: null })
    } catch (error) {
      console.error('Error deleting email:', error)
    } finally {
      setDeletingItem(false)
    }
  }

  const saveOwnerName = async () => {
    setSavingName(true)
    try {
      const fullName = `${editNameData.firstName} ${editNameData.lastName}`.trim()
      await updateRecord({
        ownerFirstName: editNameData.firstName || null,
        ownerLastName: editNameData.lastName || null,
        ownerFullName: fullName,
      } as Partial<RecordData>)
      setShowEditNameModal(false)
    } finally {
      setSavingName(false)
    }
  }

  const addComment = async () => {
    if (!newComment.trim()) return
    try {
      const userId = users[0]?.id || 'current'
      const res = await fetch(`/api/records/${recordId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, userId }),
      })
      if (res.ok) {
        setNewComment('')
        fetchComments()
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const formatPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    if (digits.length <= 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatAddress = (street: string | null, city: string | null, state: string | null, zip: string | null) => {
    const parts = [street, city, state, zip].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : '—'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Owner not found</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/records" className="text-primary hover:underline">
          Records
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground">Owner Details</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {record.ownerFullName}
            </h1>
            <p className="text-muted-foreground">
              {formatAddress(record.mailingStreet, record.mailingCity, record.mailingState, record.mailingZip)}
            </p>
          </div>
          <Button 
            variant="outline"
            size="icon"
            onClick={() => {
              setEditNameData({
                firstName: record.ownerFirstName || '',
                lastName: record.ownerLastName || '',
              })
              setShowEditNameModal(true)
            }}
            className="mt-1"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <p className="text-3xl font-bold">{stats?.propertyCount || 1}</p>
            <p className="text-sm text-muted-foreground">Properties</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <p className="text-3xl font-bold">{stats?.totalPhones || 0}</p>
            <p className="text-sm text-muted-foreground">Total Phones</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <p className="text-3xl font-bold">{stats?.totalEmails || 0}</p>
            <p className="text-sm text-muted-foreground">Total Emails</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <p className="text-3xl font-bold">{stats?.totalMotivations || 0}</p>
            <p className="text-sm text-muted-foreground">Motivations</p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards - Row 2 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="text-center">
          <CardContent className="p-4">
            <p className="text-3xl font-bold">{stats?.totalCallAttempts || 0}</p>
            <p className="text-sm text-muted-foreground">Calls Made</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <p className="text-3xl font-bold">{stats?.verifiedNumbersPercent || 0}%</p>
            <p className="text-sm text-muted-foreground">Verified Numbers</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <p className="text-3xl font-bold">{stats?.totalSmsAttempts || 0}</p>
            <p className="text-sm text-muted-foreground">SMS Sent</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Tabs */}
        <div className="col-span-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex gap-8 px-6">
                {[
                  { id: 'properties', label: `Properties (${stats?.propertyCount || 1})`, icon: Home },
                  { id: 'conversation', label: 'Message Board', icon: MessageSquare },
                  { id: 'activity', label: 'Activity Log', icon: Clock },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`py-4 text-sm font-medium border-b-2 transition ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Properties Tab */}
              {activeTab === 'properties' && (
                <div className="space-y-4">
                  {ownerRecords.map((ownerRecord) => (
                    <div
                      key={ownerRecord.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Home className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {ownerRecord.propertyStreet || 'No Address'}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {[ownerRecord.propertyCity, ownerRecord.propertyState, ownerRecord.propertyZip].filter(Boolean).join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {ownerRecord.status && (
                          <span
                            className="px-2 py-1 text-xs font-medium rounded-full text-white"
                            style={{ backgroundColor: ownerRecord.status.color }}
                          >
                            {ownerRecord.status.name}
                          </span>
                        )}
                        <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500">
                          <span className="text-sm">{ownerRecord.recordMotivations.length} motivations</span>
                          <span>•</span>
                          <span className="text-sm">{ownerRecord.recordTags.length} tags</span>
                        </div>
                        <Link
                          href={`/dashboard/records/${ownerRecord.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                  {ownerRecords.length === 0 && (
                    <p className="text-center text-gray-400 dark:text-gray-500 py-8">No properties found</p>
                  )}
                  
                  {/* Pagination placeholder */}
                  <div className="flex items-center justify-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Page</span>
                    <input
                      type="number"
                      defaultValue={1}
                      min={1}
                      className="w-12 px-2 py-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <span className="text-sm text-gray-500">of 1</span>
                  </div>
                </div>
              )}

              {/* Message Board Tab */}
              {activeTab === 'conversation' && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addComment()}
                      placeholder="Write a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <button
                      onClick={addComment}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Send
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💡 Tip: You can type @ to tag users and # to tag roles.
                  </p>

                  <div className="space-y-4 mt-6">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border-b border-gray-100 dark:border-gray-800 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {comment.user.name || comment.user.email}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">commented</span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{formatDate(comment.createdAt)}</p>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-center text-gray-400 dark:text-gray-500 py-8">No comments yet</p>
                    )}
                  </div>
                </div>
              )}

              {/* Activity Log Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <select
                      value={activityEventType}
                      onChange={(e) => {
                        setActivityEventType(e.target.value)
                        setTimeout(fetchActivityLogs, 0)
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="all">Showing All Events</option>
                      <option value="created">Created</option>
                      <option value="updated">Updated</option>
                      <option value="deleted">Deleted</option>
                    </select>
                    <select
                      value={activityUserId}
                      onChange={(e) => {
                        setActivityUserId(e.target.value)
                        setTimeout(fetchActivityLogs, 0)
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="all">From all users</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-4 mt-4">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {log.user?.name || log.user?.email || 'System'} {log.action} the property
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(log.createdAt)} • {log.source || 'Unknown'}
                          </p>
                          {log.field && (
                            <div className="mt-2 bg-gray-50 rounded-lg p-3">
                              <p className="text-sm">
                                <span className="font-medium">{log.field}</span>
                                {log.oldValue && (
                                  <span className="text-gray-400 dark:text-gray-500 line-through ml-2">{log.oldValue}</span>
                                )}
                                {log.newValue && (
                                  <span className="text-gray-900 dark:text-gray-100 ml-2">{log.newValue}</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {activityLogs.length === 0 && (
                      <p className="text-center text-gray-400 dark:text-gray-500 py-8">No activity logs yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Phone Numbers */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                PHONE NUMBERS ({record.phoneNumbers.length}/30)
              </h3>
              <button
                onClick={() => setShowAddPhoneModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Add New Phone
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {record.phoneNumbers.map((phone) => (
                <div key={phone.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{formatPhoneNumber(phone.number)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      phone.type === 'MOBILE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {phone.type === 'MOBILE' ? 'Mobile' : 'Landline'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {PHONE_STATUSES.filter(s => s.value !== 'NONE').map((status) => {
                      const isActive = phone.statuses.includes(status.value)
                      const StatusIcon = status.icon
                      return (
                        <button
                          key={status.value}
                          onClick={() => togglePhoneStatus(phone.id, status.value, phone.statuses)}
                          title={status.label}
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isActive
                              ? status.color === 'green'
                                ? 'bg-green-100 text-green-600'
                                : status.color === 'blue'
                                ? 'bg-blue-100 text-blue-600'
                                : status.color === 'red'
                                ? 'bg-red-100 text-red-600'
                                : status.color === 'yellow'
                                ? 'bg-yellow-100 text-yellow-600'
                                : status.color === 'orange'
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-gray-100 text-gray-600'
                              : 'text-gray-300 hover:text-gray-500'
                          }`}
                        >
                          {StatusIcon && <StatusIcon className="w-3 h-3" />}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => setConfirmDelete({ type: 'phone', id: phone.id })}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {record.phoneNumbers.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No phone numbers</p>
              )}
            </div>
          </div>

          {/* Emails */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">EMAILS</h3>
              <button
                onClick={() => setShowAddEmailModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Add New Email
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {record.emails.map((email) => (
                <div key={email.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{email.email}</span>
                  </div>
                  <button
                    onClick={() => setConfirmDelete({ type: 'email', id: email.id })}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {record.emails.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No emails</p>
              )}
            </div>
          </div>

          {/* Attempt Counters */}
          <div className="grid grid-cols-2 gap-4">
            {([
              { key: 'callAttempts' as const, label: 'Call Attempts' },
              { key: 'directMailAttempts' as const, label: 'Direct Mail Attempts' },
              { key: 'smsAttempts' as const, label: 'SMS Attempts' },
              { key: 'rvmAttempts' as const, label: 'RVM Attempts' },
            ]).map((item) => (
              <div key={item.key} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAttemptChange(item.key, -1)}
                      disabled={updatingAttempt === item.key}
                      className="w-6 h-6 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-medium">
                      {updatingAttempt === item.key ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        record[item.key]
                      )}
                    </span>
                    <button
                      onClick={() => handleAttemptChange(item.key, 1)}
                      disabled={updatingAttempt === item.key}
                      className="w-6 h-6 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Phone Modal */}
      {showAddPhoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Add Phone Number</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newPhone.number}
                  onChange={(e) => setNewPhone({ ...newPhone, number: formatPhoneNumber(e.target.value) })}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={newPhone.type}
                  onChange={(e) => setNewPhone({ ...newPhone, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="MOBILE">Mobile</option>
                  <option value="LANDLINE">Landline</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddPhoneModal(false)}
                disabled={savingPhone}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={addPhone}
                disabled={savingPhone}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
              >
                {savingPhone && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Phone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Email Modal */}
      {showAddEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Add Email</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddEmailModal(false)}
                disabled={savingEmail}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={addEmail}
                disabled={savingEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
              >
                {savingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {showEditNameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Edit Owner Name</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
                <input
                  type="text"
                  value={editNameData.firstName}
                  onChange={(e) => setEditNameData({ ...editNameData, firstName: e.target.value })}
                  placeholder="First name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
                <input
                  type="text"
                  value={editNameData.lastName}
                  onChange={(e) => setEditNameData({ ...editNameData, lastName: e.target.value })}
                  placeholder="Last name"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditNameModal(false)}
                disabled={savingName}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveOwnerName}
                disabled={savingName}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
              >
                {savingName && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDelete.type && confirmDelete.id && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Are you sure?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete this {confirmDelete.type === 'phone' ? 'phone number' : 'email'}. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete({ type: null, id: null })}
                disabled={deletingItem}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'phone') {
                    deletePhone(confirmDelete.id!)
                  } else {
                    deleteEmail(confirmDelete.id!)
                  }
                }}
                disabled={deletingItem}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 flex items-center gap-2"
              >
                {deletingItem && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
