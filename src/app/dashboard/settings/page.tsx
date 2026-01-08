'use client'

import { useState, useEffect } from 'react'
import { Lock, Eye, EyeOff, Pencil, Loader2, Users, Link2, Info, Plus, MoreVertical, Crown, Shield, ShieldCheck, User, X, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: string
  email: string
  role: string
  status: string
  firstName: string | null
  lastName: string | null
  phone: string | null
  timezone: string | null
  companyName: string | null
  companyEmail: string | null
  companyPhone: string | null
  billingAddress: string | null
  billingCity: string | null
  billingState: string | null
  billingZip: string | null
  billingCountry: string | null
}

interface TeamMember {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  status: string
  createdAt: string
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
]

const ROLE_INFO = [
  { role: 'owner', icon: Crown, label: 'Owner', color: 'text-yellow-600', bgColor: 'bg-yellow-100', description: 'Full access. Can manage billing, delete account, and control all team members.' },
  { role: 'super_admin', icon: ShieldCheck, label: 'Super Admin', color: 'text-purple-600', bgColor: 'bg-purple-100', description: 'Full access to records, tasks, settings. Can manage team members. Cannot delete account.' },
  { role: 'admin', icon: Shield, label: 'Admin', color: 'text-blue-600', bgColor: 'bg-blue-100', description: 'Can view all data, manage records/tasks/tags/statuses. Cannot manage team members.' },
  { role: 'member', icon: User, label: 'Member', color: 'text-gray-600', bgColor: 'bg-gray-100', description: 'Can only see/edit records and tasks assigned to them. Limited access.' },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'integrations'>('profile')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Profile editing
  const [editingSection, setEditingSection] = useState<'account' | 'timezone' | 'company' | null>(null)
  const [formData, setFormData] = useState<Partial<UserProfile>>({})
  
  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  
  // Team members
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberFirstName, setNewMemberFirstName] = useState('')
  const [newMemberLastName, setNewMemberLastName] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('member')
  const [newMemberPassword, setNewMemberPassword] = useState('')
  const [createdMemberCredentials, setCreatedMemberCredentials] = useState<{ email: string; password: string } | null>(null)
  const [addingMember, setAddingMember] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editingMemberRole, setEditingMemberRole] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [deleteMemberConfirm, setDeleteMemberConfirm] = useState<TeamMember | null>(null)

  // Fetch profile on mount
  useEffect(() => {
    fetchProfile()
  }, [])

  // Fetch team when tab changes
  useEffect(() => {
    if (activeTab === 'users' && profile && ['owner', 'super_admin', 'admin'].includes(profile.role)) {
      fetchTeamMembers()
    }
  }, [activeTab, profile])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/settings/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setFormData(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTeamMembers = async () => {
    setLoadingTeam(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/team', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setTeamMembers(data)
      }
    } catch (error) {
      console.error('Error fetching team:', error)
    } finally {
      setLoadingTeam(false)
    }
  }

  const handleSaveSection = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData)
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      const updatedProfile = await res.json()
      setProfile(updatedProfile)
      setFormData(updatedProfile)
      setEditingSection(null)
      toast.success('Settings saved successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    setChangingPassword(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to change password')
      toast.success('Password changed successfully')
      setShowPasswordModal(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberEmail.trim() || !newMemberPassword.trim()) return
    setAddingMember(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: newMemberEmail.trim(),
          firstName: newMemberFirstName.trim() || null,
          lastName: newMemberLastName.trim() || null,
          role: newMemberRole,
          password: newMemberPassword
        })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add member')
      }
      setCreatedMemberCredentials({ email: newMemberEmail.trim(), password: newMemberPassword })
      fetchTeamMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add member')
    } finally {
      setAddingMember(false)
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/team/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update member')
      }
      fetchTeamMembers()
      setEditingMemberId(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update member')
    }
  }

  const handleToggleMemberStatus = async (memberId: string, currentStatus: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/team/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: currentStatus === 'active' ? 'inactive' : 'active' })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update member')
      }
      fetchTeamMembers()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update member')
    }
  }

  const handleDeleteMember = async () => {
    if (!deleteMemberConfirm) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/team/${deleteMemberConfirm.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove member')
      }
      toast.success('Team member removed')
      fetchTeamMembers()
      setDeleteMemberConfirm(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member')
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const closeAddMemberModal = () => {
    setShowAddMemberModal(false)
    setNewMemberEmail('')
    setNewMemberFirstName('')
    setNewMemberLastName('')
    setNewMemberRole('member')
    setNewMemberPassword('')
    setCreatedMemberCredentials(null)
  }

  const getRoleInfo = (role: string) => ROLE_INFO.find(r => r.role === role) || ROLE_INFO[3]
  const canManageUsers = profile && ['owner', 'super_admin'].includes(profile.role)
  const canViewUsers = profile && ['owner', 'super_admin', 'admin'].includes(profile.role)
  const canEditCompany = profile && ['owner', 'super_admin'].includes(profile.role)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and team settings</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-8">
          <button onClick={() => setActiveTab('profile')} className={`pb-3 text-sm font-medium border-b-2 transition ${activeTab === 'profile' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Profile
          </button>
          {canViewUsers && (
            <button onClick={() => setActiveTab('users')} className={`pb-3 text-sm font-medium border-b-2 transition ${activeTab === 'users' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              User Management
            </button>
          )}
          <button onClick={() => setActiveTab('integrations')} className={`pb-3 text-sm font-medium border-b-2 transition ${activeTab === 'integrations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Integrations
          </button>
        </nav>
      </div>


      {/* Profile Tab */}
      {activeTab === 'profile' && profile && (
        <div className="space-y-6 max-w-3xl">
          {/* Account Info */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Info</h2>
              {editingSection !== 'account' ? (
                <button onClick={() => setEditingSection('account')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                  <Pencil className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { setEditingSection(null); setFormData(profile) }} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button onClick={handleSaveSection} disabled={saving} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">First Name</label>
                {editingSection === 'account' ? (
                  <input type="text" value={formData.firstName || ''} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.firstName || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Last Name</label>
                {editingSection === 'account' ? (
                  <input type="text" value={formData.lastName || ''} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.lastName || '-'}</p>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Email</label>
              <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.email}</p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
              {editingSection === 'account' ? (
                <input type="tel" value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="(999) 999-9999" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.phone || '-'}</p>
              )}
            </div>
            <button onClick={() => setShowPasswordModal(true)} className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition text-sm font-medium">
              Update Password
            </button>
          </div>

          {/* Timezone */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Account Timezone</h2>
              {editingSection !== 'timezone' ? (
                <button onClick={() => setEditingSection('timezone')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                  <Pencil className="w-4 h-4" />
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => { setEditingSection(null); setFormData(profile) }} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button onClick={handleSaveSection} disabled={saving} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Account Timezone</label>
              {editingSection === 'timezone' ? (
                <select value={formData.timezone || 'America/Chicago'} onChange={(e) => setFormData({ ...formData, timezone: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              ) : (
                <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.timezone || 'America/Chicago'}</p>
              )}
            </div>
          </div>

          {/* Company Info */}
          {canEditCompany && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Info</h2>
                {editingSection !== 'company' ? (
                  <button onClick={() => setEditingSection('company')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <Pencil className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingSection(null); setFormData(profile) }} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button onClick={handleSaveSection} disabled={saving} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                      {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Company Name</label>
                  {editingSection === 'company' ? (
                    <input type="text" value={formData.companyName || ''} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  ) : (
                    <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.companyName || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Email</label>
                  {editingSection === 'company' ? (
                    <input type="email" value={formData.companyEmail || ''} onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  ) : (
                    <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.companyEmail || '-'}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Billing Address</label>
                    {editingSection === 'company' ? (
                      <input type="text" value={formData.billingAddress || ''} onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    ) : (
                      <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.billingAddress || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
                    {editingSection === 'company' ? (
                      <input type="tel" value={formData.companyPhone || ''} onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    ) : (
                      <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.companyPhone || '-'}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">City</label>
                    {editingSection === 'company' ? (
                      <input type="text" value={formData.billingCity || ''} onChange={(e) => setFormData({ ...formData, billingCity: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    ) : (
                      <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.billingCity || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Country</label>
                    {editingSection === 'company' ? (
                      <select value={formData.billingCountry || 'United States'} onChange={(e) => setFormData({ ...formData, billingCountry: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="United Kingdom">United Kingdom</option>
                      </select>
                    ) : (
                      <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.billingCountry || 'United States'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">State</label>
                    {editingSection === 'company' ? (
                      <input type="text" value={formData.billingState || ''} onChange={(e) => setFormData({ ...formData, billingState: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    ) : (
                      <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.billingState || '-'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Zip Code</label>
                    {editingSection === 'company' ? (
                      <input type="text" value={formData.billingZip || ''} onChange={(e) => setFormData({ ...formData, billingZip: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    ) : (
                      <p className="px-4 py-2 bg-gray-50 rounded-lg text-gray-700">{profile.billingZip || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && canViewUsers && (
        <div className="space-y-6">
          {/* Role Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Role Access Levels</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ROLE_INFO.map(role => {
                    const Icon = role.icon
                    return (
                      <div key={role.role} className="flex items-start gap-2">
                        <div className={`p-1 rounded ${role.bgColor}`}>
                          <Icon className={`w-4 h-4 ${role.color}`} />
                        </div>
                        <div>
                          <span className={`font-medium ${role.color}`}>{role.label}</span>
                          <p className="text-xs text-blue-800">{role.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Team Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
            {canManageUsers && (
              <button onClick={() => setShowAddMemberModal(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                <Plus className="w-4 h-4" /> Add Member
              </button>
            )}
          </div>

          {/* Team Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loadingTeam ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p className="text-gray-500 mt-2">Loading team members...</p>
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No team members yet</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    {canManageUsers && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamMembers.map(member => {
                    const roleInfo = getRoleInfo(member.role)
                    const Icon = roleInfo.icon
                    return (
                      <tr key={member.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-gray-500" />
                            </div>
                            <span className="font-medium text-gray-900">
                              {member.firstName || member.lastName ? `${member.firstName || ''} ${member.lastName || ''}`.trim() : member.email.split('@')[0]}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{member.email}</td>
                        <td className="px-6 py-4">
                          {editingMemberId === member.id ? (
                            <select value={editingMemberRole} onChange={(e) => setEditingMemberRole(e.target.value)} onBlur={() => { if (editingMemberRole !== member.role) handleUpdateMemberRole(member.id, editingMemberRole); else setEditingMemberId(null); }} className="px-2 py-1 border border-gray-300 rounded text-sm" autoFocus>
                              {ROLE_INFO.filter(r => r.role !== 'owner').map(r => <option key={r.role} value={r.role}>{r.label}</option>)}
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${roleInfo.bgColor} ${roleInfo.color}`}>
                              <Icon className="w-3 h-3" /> {roleInfo.label}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {member.status === 'active' ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        {canManageUsers && (
                          <td className="px-6 py-4 text-right">
                            {member.role !== 'owner' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => { setEditingMemberId(member.id); setEditingMemberRole(member.role); }}>
                                    Change Role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleToggleMemberStatus(member.id, member.status)}>
                                    {member.status === 'active' ? 'Deactivate' : 'Activate'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeleteMemberConfirm(member)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Link2 className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Integrations coming soon</p>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Change Password</h2>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <div className="relative">
                  <input type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <div className="relative">
                  <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition">Cancel</button>
                <button type="submit" disabled={changingPassword} className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />} Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{createdMemberCredentials ? 'Member Created' : 'Add Team Member'}</h2>
              <button onClick={closeAddMemberModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            {createdMemberCredentials ? (
              <div className="p-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-green-700 font-medium">Team member created successfully!</p>
                  <p className="text-green-600 text-sm mt-1">Share these credentials with the new member:</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Email</label>
                    <div className="flex items-center gap-2">
                      <input type="text" value={createdMemberCredentials.email} readOnly className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700" />
                      <button onClick={() => copyToClipboard(createdMemberCredentials.email, 'email')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        {copiedField === 'email' ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Password</label>
                    <div className="flex items-center gap-2">
                      <input type="text" value={createdMemberCredentials.password} readOnly className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono" />
                      <button onClick={() => copyToClipboard(createdMemberCredentials.password, 'password')} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        {copiedField === 'password' ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">The member can change their password after logging in via Settings.</p>
                <button onClick={closeAddMemberModal} className="w-full mt-6 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Done</button>
              </div>
            ) : (
              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} required placeholder="member@example.com" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input type="text" value={newMemberFirstName} onChange={(e) => setNewMemberFirstName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input type="text" value={newMemberLastName} onChange={(e) => setNewMemberLastName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                  <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="member">Member</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Temporary Password *</label>
                  <input type="text" value={newMemberPassword} onChange={(e) => setNewMemberPassword(e.target.value)} required placeholder="Enter a temporary password" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  <p className="text-xs text-gray-500 mt-1">You will share this password with the member manually.</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeAddMemberModal} className="flex-1 px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition">Cancel</button>
                  <button type="submit" disabled={addingMember} className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                    {addingMember && <Loader2 className="w-4 h-4 animate-spin" />} Create Member
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Member Confirmation */}
      <AlertDialog open={!!deleteMemberConfirm} onOpenChange={(open) => !open && setDeleteMemberConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteMemberConfirm?.firstName || deleteMemberConfirm?.email?.split('@')[0]}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
