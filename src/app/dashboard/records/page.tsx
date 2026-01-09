'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Filter, Loader2, ChevronDown, ChevronLeft, ChevronRight, Search, Settings, Trash2, Tag, Target, Thermometer, User, Phone, X, Upload, Download, CheckSquare, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import AddPropertyModal from '@/components/AddPropertyModal'
import BulkImportModal from '@/components/BulkImportModal'
import RecordFilterPanel, { FilterBlock } from '@/components/RecordFilterPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

interface RecordItem {
  id: string
  ownerFirstName: string | null
  ownerLastName: string | null
  ownerFullName: string
  isCompany: boolean
  isCompanyOverride: boolean | null
  propertyStreet: string | null
  propertyCity: string | null
  propertyState: string | null
  propertyZip: string | null
  mailingStreet: string | null
  mailingCity: string | null
  mailingState: string | null
  mailingZip: string | null
  isComplete: boolean
  statusId: string | null
  status: {
    id: string
    name: string
    color: string
  } | null
  skiptraceDate: string | null
  recordTags: {
    tag: {
      id: string
      name: string
    }
  }[]
  recordMotivations: {
    motivation: {
      id: string
      name: string
    }
  }[]
  createdAt: string
  updatedAt: string
}

interface ApiResponse {
  records: RecordItem[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
  }
  counts: {
    all: number
    complete: number
    incomplete: number
  }
}

type FilterType = 'all' | 'complete' | 'incomplete'

interface TaskTemplate {
  id: string
  name: string
  title: string
  description: string | null
  category: string | null
  priority: string
}

export default function RecordsPage() {
  const router = useRouter()
  const [records, setRecords] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [counts, setCounts] = useState({ all: 0, complete: 0, incomplete: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showAddDropdown, setShowAddDropdown] = useState(false)
  const [showSelectDropdown, setShowSelectDropdown] = useState(false)
  const [showLimitDropdown, setShowLimitDropdown] = useState(false)
  const [assignedToMe, setAssignedToMe] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchType, setSearchType] = useState<'all' | 'name' | 'property' | 'mailing'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [activeFilters, setActiveFilters] = useState<FilterBlock[]>([])
  const [showManageDropdown, setShowManageDropdown] = useState(false)
  const [bulkActionModal, setBulkActionModal] = useState<string | null>(null)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  
  // Options for bulk actions
  const [tags, setTags] = useState<{id: string, name: string}[]>([])
  const [motivations, setMotivations] = useState<{id: string, name: string}[]>([])
  const [statuses, setStatuses] = useState<{id: string, name: string, color: string}[]>([])
  const [users, setUsers] = useState<{id: string, name: string | null, email: string}[]>([])
  const [selectedBulkItems, setSelectedBulkItems] = useState<string[]>([])
  const [selectedTemperature, setSelectedTemperature] = useState<string>('')
  const [bulkSearchQuery, setBulkSearchQuery] = useState('')
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>([])
  const [selectedTaskTemplate, setSelectedTaskTemplate] = useState<string>('')

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/login'
        return
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        filter: filter,
      })
      
      // Add search query
      if (searchQuery.trim().length >= 2) {
        params.set('search', searchQuery.trim())
        params.set('searchType', searchType)
      }
      
      // Add active filters to query
      if (activeFilters.length > 0) {
        params.set('filters', JSON.stringify(activeFilters))
      }
      
      const res = await fetch(`/api/records?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('token')
          window.location.href = '/login'
          return
        }
        throw new Error('Failed to fetch records')
      }
      const data: ApiResponse = await res.json()
      setRecords(data.records)
      setTotalPages(data.pagination.totalPages)
      setTotalCount(data.pagination.totalCount)
      setCounts(data.counts)
    } catch (error) {
      console.error('Error fetching records:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [page, limit, filter, activeFilters, searchQuery, searchType])

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [filter])

  // Fetch filter options on mount
  useEffect(() => {
    fetchBulkOptions()
  }, [])

  
  // Fetch options for bulk actions
  const fetchBulkOptions = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [tagsRes, motivationsRes, statusesRes, usersRes, taskTemplatesRes] = await Promise.all([
        fetch('/api/tags', { headers }),
        fetch('/api/motivations', { headers }),
        fetch('/api/statuses', { headers }),
        fetch('/api/users', { headers }),
        fetch('/api/task-templates', { headers }),
      ])
      if (tagsRes.ok) setTags(await tagsRes.json())
      if (motivationsRes.ok) setMotivations(await motivationsRes.json())
      if (statusesRes.ok) setStatuses(await statusesRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
      if (taskTemplatesRes.ok) setTaskTemplates(await taskTemplatesRes.json())
    } catch (error) {
      console.error('Error fetching bulk options:', error)
    }
  }

  const openBulkActionModal = (action: string) => {
    setBulkActionModal(action)
    setShowManageDropdown(false)
    setSelectedBulkItems([])
    setSelectedTemperature('')
    setSelectedTaskTemplate('')
    if (tags.length === 0) fetchBulkOptions()
  }

  const handleExportRecords = async () => {
    setShowManageDropdown(false)
    
    try {
      const recordIds = selectedIds.size > 0 ? Array.from(selectedIds) : null
      const recordCount = selectedIds.size > 0 ? selectedIds.size : totalCount
      
      // Call export API which creates activity log and stores CSV
      const token = localStorage.getItem('token')
      const exportRes = await fetch('/api/records/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recordIds }),
      })
      
      if (!exportRes.ok) {
        throw new Error('Export failed')
      }
      
      toast.success(`Export started! ${recordCount} records queued. Go to Activity > Download to download your file.`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export records')
    }
  }

  const executeBulkAction = async () => {
    if (!bulkActionModal) return
    setBulkActionLoading(true)
    try {
      const recordIds = Array.from(selectedIds)

      // Handle task-related actions separately
      const token = localStorage.getItem('token')
      if (bulkActionModal === 'addTaskTemplate') {
        const res = await fetch('/api/tasks/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            templateId: selectedTaskTemplate,
            recordIds,
            createdById: 'system', // TODO: Get from auth
          }),
        })

        if (res.ok) {
          const data = await res.json()
          setBulkActionModal(null)
          setSelectedIds(new Set())
          setSelectedTaskTemplate('')
          toast.success(`Created ${data.count} tasks successfully`)
        } else {
          const error = await res.json()
          toast.error(error.error || 'Failed to create tasks')
        }
        return
      }

      if (bulkActionModal === 'clearTasks') {
        const res = await fetch('/api/tasks/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ recordIds }),
        })

        if (res.ok) {
          const data = await res.json()
          setBulkActionModal(null)
          setSelectedIds(new Set())
          toast.success(`Deleted ${data.deletedCount} tasks from ${data.recordCount} records`)
        } else {
          const error = await res.json()
          toast.error(error.error || 'Failed to clear tasks')
        }
        return
      }

      // Handle other bulk actions via records/bulk endpoint
      let body: Record<string, unknown> = { action: bulkActionModal, recordIds }

      switch (bulkActionModal) {
        case 'addTags':
        case 'removeTags':
          body.tagIds = selectedBulkItems
          break
        case 'addMotivations':
        case 'removeMotivations':
          body.motivationIds = selectedBulkItems
          break
        case 'updateStatus':
          body.statusId = selectedBulkItems[0] || null
          break
        case 'updateTemperature':
          body.temperature = selectedTemperature
          break
        case 'assignToUser':
          body.userId = selectedBulkItems[0] || null
          break
        case 'deletePhones':
        case 'deleteRecords':
          // No additional data needed
          break
      }

      const res = await fetch('/api/records/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setBulkActionModal(null)
        setSelectedIds(new Set())
        fetchRecords()
        toast.success('Bulk action completed successfully')
      } else {
        const error = await res.json()
        toast.error(error.error || 'Bulk action failed')
      }
    } catch (error) {
      console.error('Error executing bulk action:', error)
      toast.error('Failed to execute bulk action')
    } finally {
      setBulkActionLoading(false)
    }
  }

  const formatAddress = (street: string | null, city: string | null, state: string | null, zip: string | null) => {
    const parts = [street, city, state, zip].filter(Boolean)
    if (parts.length === 0) return '-'
    if (street && city && state && zip) {
      return (
        <>
          <div>{street}</div>
          <div className="text-muted-foreground">{city}, {state} {zip}</div>
        </>
      )
    }
    return parts.join(', ')
  }

  const formatSkiptraceDate = (date: string | null) => {
    if (!date) return '-'
    const d = new Date(date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1d ago'
    if (diffDays < 30) return `${diffDays}d ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
    return `${Math.floor(diffDays / 365)}y ago`
  }

  const handleSelectAll = () => {
    const allIds = new Set(records.map(r => r.id))
    setSelectedIds(allIds)
    setShowSelectDropdown(false)
  }

  const handleSelectVisible = () => {
    const visibleIds = new Set(records.map(r => r.id))
    setSelectedIds(visibleIds)
    setShowSelectDropdown(false)
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
    setShowSelectDropdown(false)
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(records.map(r => r.id)))
    }
  }


  return (
    <div className="p-8">
      {/* Row 1: Top Navigation */}
      <div className="flex items-center justify-between mb-4 border-b pb-4">
        {/* Left: Tab Navigation */}
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium pb-2 border-b-2 text-primary border-primary">
            Property Records
          </span>
        </div>

        {/* Right: Search + Add Button */}
        <div className="flex items-center gap-3">
          {/* Search Bar with Type Selector */}
          <div className="flex items-center">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as 'all' | 'name' | 'property' | 'mailing')}
              className="h-10 px-3 border border-r-0 border-border rounded-l-md bg-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All</option>
              <option value="name">Name</option>
              <option value="property">Property</option>
              <option value="mailing">Mailing</option>
            </select>
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                placeholder={searchType === 'all' ? 'Search records...' : `Search by ${searchType}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-56 pl-10 rounded-l-none"
              />
            </div>
          </div>

          {/* Add New Property Button */}
          <DropdownMenu open={showAddDropdown} onOpenChange={setShowAddDropdown}>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add New Property
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAddModal(true)}>
                Add Single Property
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBulkImportModal(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 2: Filter Toggle + Selection Info + Manage Button */}
      <div className="flex items-center justify-between mb-6">
        {/* Left: 3-way Toggle Filter (pill style) */}
        <div className="flex items-center gap-4">
          <div className="inline-flex bg-muted rounded-lg p-1">
            <Button
              variant={filter === 'complete' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('complete')}
            >
              Clean
            </Button>
            <Button
              variant={filter === 'incomplete' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('incomplete')}
            >
              Incomplete
            </Button>
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
          </div>

          {/* Selection indicator + Manage button (only when items selected) */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Selecting {selectedIds.size} {selectedIds.size === 1 ? 'property' : 'properties'}
              </span>
              <DropdownMenu open={showManageDropdown} onOpenChange={setShowManageDropdown}>
                <DropdownMenuTrigger asChild>
                  <Button size="sm">
                    Manage
                    <Settings className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => openBulkActionModal('addTags')}>
                    <Tag className="w-4 h-4 mr-2" /> Add tags
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openBulkActionModal('removeTags')}>
                    <Tag className="w-4 h-4 mr-2" /> Remove tags
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openBulkActionModal('addMotivations')}>
                    <Target className="w-4 h-4 mr-2" /> Add motivation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openBulkActionModal('removeMotivations')}>
                    <Target className="w-4 h-4 mr-2" /> Remove motivation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openBulkActionModal('updateStatus')}>
                    <Settings className="w-4 h-4 mr-2" /> Update status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openBulkActionModal('updateTemperature')}>
                    <Thermometer className="w-4 h-4 mr-2" /> Update temperature
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openBulkActionModal('assignToUser')}>
                    <User className="w-4 h-4 mr-2" /> Assign to user
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openBulkActionModal('addTaskTemplate')}>
                    <CheckSquare className="w-4 h-4 mr-2" /> Add task template
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openBulkActionModal('clearTasks')}>
                    <XCircle className="w-4 h-4 mr-2" /> Clear tasks
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => openBulkActionModal('deletePhones')}>
                    <Phone className="w-4 h-4 mr-2" /> Delete phones
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openBulkActionModal('deleteRecords')} className="text-destructive focus:text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExportRecords}>
                    <Download className="w-4 h-4 mr-2" /> Export properties
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Right: Assigned to me + Filter Records */}
        <div className="flex items-center gap-4">
          {/* Assigned to me toggle */}
          <div className="flex items-center gap-2">
            <Switch
              checked={assignedToMe}
              onCheckedChange={setAssignedToMe}
            />
            <span className="text-sm text-muted-foreground">Assigned to me</span>
          </div>

          {/* Filter Records Button */}
          <Button
            variant={activeFilters.length > 0 ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => {
              setShowFilterPanel(true)
              if (tags.length === 0) fetchBulkOptions()
            }}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter Records
            {activeFilters.length > 0 && (
              <Badge variant="default" className="ml-2">
                {activeFilters.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Active Filters Bar */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <span className="text-sm text-blue-700 font-medium">Active Filters:</span>
          <div className="flex flex-wrap gap-2">
            {activeFilters.map((filter, index) => (
              <span
                key={filter.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-card border border-blue-200 rounded-full text-xs text-blue-700"
              >
                {filter.fieldLabel}
                <button
                  onClick={() => {
                    const newFilters = activeFilters.filter(f => f.id !== filter.id)
                    setActiveFilters(newFilters)
                  }}
                  className="ml-1 hover:text-blue-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <button
            onClick={() => setActiveFilters([])}
            className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Loading records...</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <DropdownMenu open={showSelectDropdown} onOpenChange={setShowSelectDropdown}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Checkbox
                              checked={selectedIds.size > 0 && selectedIds.size === records.length}
                              className="pointer-events-none"
                            />
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={handleSelectVisible}>
                            Select visible ({records.length})
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleSelectAll}>
                            Select all ({totalCount})
                          </DropdownMenuItem>
                          {selectedIds.size > 0 && (
                            <DropdownMenuItem onClick={handleClearSelection}>
                              Clear selection
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Mailing Address</TableHead>
                    <TableHead>Property Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Skiptrace</TableHead>
                    <TableHead>Motivation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {records.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">No records found</p>
                        <p className="text-sm text-muted-foreground/70">
                          {filter === 'complete' ? 'No complete records yet' : 
                           filter === 'incomplete' ? 'No incomplete records' : 
                           'Add your first property record'}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    records.map((record) => (
                      <TableRow 
                        key={record.id} 
                        className="cursor-pointer"
                        onClick={() => router.push(`/dashboard/records/${record.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(record.id)}
                            onCheckedChange={() => toggleSelect(record.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/dashboard/owners/${record.id}`)
                            }}
                            className="text-left hover:text-primary"
                          >
                            <div className="text-sm font-medium">
                              {record.ownerFirstName || record.ownerLastName 
                                ? `${record.ownerFirstName || ''} ${record.ownerLastName || ''}`.trim()
                                : record.ownerFullName}
                            </div>
                            {(record.ownerFirstName || record.ownerLastName) && record.ownerFullName !== `${record.ownerFirstName || ''} ${record.ownerLastName || ''}`.trim() && (
                              <div className="text-xs text-muted-foreground">
                                {record.ownerFullName}
                              </div>
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatAddress(record.mailingStreet, record.mailingCity, record.mailingState, record.mailingZip)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatAddress(record.propertyStreet, record.propertyCity, record.propertyState, record.propertyZip)}
                        </TableCell>
                        <TableCell>
                          {record.status ? (
                            <Badge style={{ backgroundColor: record.status.color }} className="text-white">
                              {record.status.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatSkiptraceDate(record.skiptraceDate)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                            📋 {record.recordMotivations.length}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

            {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Show</span>
                  <DropdownMenu open={showLimitDropdown} onOpenChange={setShowLimitDropdown}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {limit}
                        <ChevronDown className="w-3 h-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {[10, 20, 50, 100].map((l) => (
                        <DropdownMenuItem
                          key={l}
                          onClick={() => {
                            setLimit(l)
                            setPage(1)
                          }}
                          className={limit === l ? 'bg-accent' : ''}
                        >
                          {l}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages || totalPages === 0}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
          </>
        )}
        </CardContent>
      </Card>

      {/* Add Property Modal */}
      <AddPropertyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchRecords()
        }}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => {
          fetchRecords()
        }}
      />

      {/* Bulk Action Modals */}
      {/* Filter Panel */}
      <RecordFilterPanel
        isOpen={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        onApply={(filters) => {
          setActiveFilters(filters)
          setShowFilterPanel(false)
          setPage(1)
        }}
        tags={tags}
        motivations={motivations}
        statuses={statuses}
        users={users}
      />

      {bulkActionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {bulkActionModal === 'addTags' && 'Add Tags'}
                {bulkActionModal === 'removeTags' && 'Remove Tags'}
                {bulkActionModal === 'addMotivations' && 'Add Motivations'}
                {bulkActionModal === 'removeMotivations' && 'Remove Motivations'}
                {bulkActionModal === 'updateStatus' && 'Update Status'}
                {bulkActionModal === 'updateTemperature' && 'Update Temperature'}
                {bulkActionModal === 'assignToUser' && 'Assign to User'}
                {bulkActionModal === 'addTaskTemplate' && 'Add Task Template'}
                {bulkActionModal === 'clearTasks' && 'Clear Tasks'}
                {bulkActionModal === 'deletePhones' && 'Delete Phones'}
                {bulkActionModal === 'deleteRecords' && 'Delete Records'}
              </h3>
              <button onClick={() => { setBulkActionModal(null); setBulkSearchQuery('') }} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              This will affect {selectedIds.size} selected {selectedIds.size === 1 ? 'record' : 'records'}.
            </p>

            {/* Tags selection */}
            {(bulkActionModal === 'addTags' || bulkActionModal === 'removeTags') && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={bulkSearchQuery}
                    onChange={(e) => setBulkSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary bg-background text-foreground"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {tags
                    .filter(tag => tag.name.toLowerCase().includes(bulkSearchQuery.toLowerCase()))
                    .map((tag) => (
                      <label key={tag.id} className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer border-b last:border-b-0">
                        <input
                          type="checkbox"
                          checked={selectedBulkItems.includes(tag.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBulkItems([...selectedBulkItems, tag.id])
                            } else {
                              setSelectedBulkItems(selectedBulkItems.filter(id => id !== tag.id))
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm">{tag.name}</span>
                      </label>
                    ))}
                  {tags.filter(tag => tag.name.toLowerCase().includes(bulkSearchQuery.toLowerCase())).length === 0 && bulkSearchQuery.trim() && bulkActionModal === 'addTags' && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token')
                          const res = await fetch('/api/tags', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ name: bulkSearchQuery.trim() }),
                          })
                          if (res.ok) {
                            const newTag = await res.json()
                            setTags([...tags, newTag])
                            setSelectedBulkItems([...selectedBulkItems, newTag.id])
                            setBulkSearchQuery('')
                            toast.success(`Tag "${newTag.name}" created`)
                          }
                        } catch (error) {
                          toast.error('Failed to create tag')
                        }
                      }}
                      className="w-full p-3 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create "{bulkSearchQuery.trim()}"
                    </button>
                  )}
                  {tags.filter(tag => tag.name.toLowerCase().includes(bulkSearchQuery.toLowerCase())).length === 0 && (!bulkSearchQuery.trim() || bulkActionModal === 'removeTags') && (
                    <p className="text-sm text-muted-foreground p-3 text-center">No tags found</p>
                  )}
                </div>
                {selectedBulkItems.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedBulkItems.length} selected</p>
                )}
              </div>
            )}

            {/* Motivations selection */}
            {(bulkActionModal === 'addMotivations' || bulkActionModal === 'removeMotivations') && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search motivations..."
                    value={bulkSearchQuery}
                    onChange={(e) => setBulkSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary bg-background text-foreground"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {motivations
                    .filter(m => m.name.toLowerCase().includes(bulkSearchQuery.toLowerCase()))
                    .map((motivation) => (
                      <label key={motivation.id} className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer border-b last:border-b-0">
                        <input
                          type="checkbox"
                          checked={selectedBulkItems.includes(motivation.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBulkItems([...selectedBulkItems, motivation.id])
                            } else {
                              setSelectedBulkItems(selectedBulkItems.filter(id => id !== motivation.id))
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm">{motivation.name}</span>
                      </label>
                    ))}
                  {motivations.filter(m => m.name.toLowerCase().includes(bulkSearchQuery.toLowerCase())).length === 0 && bulkSearchQuery.trim() && bulkActionModal === 'addMotivations' && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token')
                          const res = await fetch('/api/motivations', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ name: bulkSearchQuery.trim() }),
                          })
                          if (res.ok) {
                            const newMotivation = await res.json()
                            setMotivations([...motivations, newMotivation])
                            setSelectedBulkItems([...selectedBulkItems, newMotivation.id])
                            setBulkSearchQuery('')
                            toast.success(`Motivation "${newMotivation.name}" created`)
                          }
                        } catch (error) {
                          toast.error('Failed to create motivation')
                        }
                      }}
                      className="w-full p-3 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Create "{bulkSearchQuery.trim()}"
                    </button>
                  )}
                  {motivations.filter(m => m.name.toLowerCase().includes(bulkSearchQuery.toLowerCase())).length === 0 && (!bulkSearchQuery.trim() || bulkActionModal === 'removeMotivations') && (
                    <p className="text-sm text-muted-foreground p-3 text-center">No motivations found</p>
                  )}
                </div>
                {selectedBulkItems.length > 0 && (
                  <p className="text-xs text-muted-foreground">{selectedBulkItems.length} selected</p>
                )}
              </div>
            )}

            {/* Status selection */}
            {bulkActionModal === 'updateStatus' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search statuses..."
                    value={bulkSearchQuery}
                    onChange={(e) => setBulkSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary bg-background text-foreground"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {statuses
                    .filter(s => s.name.toLowerCase().includes(bulkSearchQuery.toLowerCase()))
                    .map((status) => (
                      <label key={status.id} className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer border-b last:border-b-0">
                        <input
                          type="radio"
                          name="status"
                          checked={selectedBulkItems[0] === status.id}
                          onChange={() => setSelectedBulkItems([status.id])}
                          className="w-4 h-4 border-gray-300 text-blue-600"
                        />
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: status.color }}
                        >
                          {status.name}
                        </span>
                      </label>
                    ))}
                  {statuses.filter(s => s.name.toLowerCase().includes(bulkSearchQuery.toLowerCase())).length === 0 && (
                    <p className="text-sm text-muted-foreground p-3 text-center">No statuses found</p>
                  )}
                </div>
              </div>
            )}

            {/* Temperature selection */}
            {bulkActionModal === 'updateTemperature' && (
              <div className="flex gap-2">
                {['COLD', 'WARM', 'HOT'].map((temp) => (
                  <button
                    key={temp}
                    type="button"
                    onClick={() => setSelectedTemperature(temp)}
                    className={`flex-1 py-3 rounded-lg border transition ${
                      selectedTemperature === temp
                        ? temp === 'COLD'
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : temp === 'WARM'
                          ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                          : 'bg-red-100 border-red-300 text-red-700'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {temp === 'COLD' && '❄️ Cold'}
                    {temp === 'WARM' && '🌡️ Warm'}
                    {temp === 'HOT' && '🔥 Hot'}
                  </button>
                ))}
              </div>
            )}

            {/* User selection */}
            {bulkActionModal === 'assignToUser' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={bulkSearchQuery}
                    onChange={(e) => setBulkSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary bg-background text-foreground"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <label className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer border-b">
                    <input
                      type="radio"
                      name="user"
                      checked={selectedBulkItems.length === 0}
                      onChange={() => setSelectedBulkItems([])}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  </label>
                  {users
                    .filter(u => (u.name || u.email).toLowerCase().includes(bulkSearchQuery.toLowerCase()))
                    .map((user) => (
                      <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-muted cursor-pointer border-b last:border-b-0">
                        <input
                          type="radio"
                          name="user"
                          checked={selectedBulkItems[0] === user.id}
                          onChange={() => setSelectedBulkItems([user.id])}
                          className="w-4 h-4 border-gray-300 text-blue-600"
                        />
                        <span className="text-sm">{user.name || user.email}</span>
                      </label>
                    ))}
                  {users.filter(u => (u.name || u.email).toLowerCase().includes(bulkSearchQuery.toLowerCase())).length === 0 && bulkSearchQuery && (
                    <p className="text-sm text-muted-foreground p-3 text-center">No users found</p>
                  )}
                </div>
              </div>
            )}

            {/* Remove confirmations */}
            {bulkActionModal === 'removeTags' && selectedBulkItems.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-yellow-800">
                  Are you sure? This will remove the selected tags from {selectedIds.size} record(s).
                </p>
              </div>
            )}

            {bulkActionModal === 'removeMotivations' && selectedBulkItems.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                <p className="text-sm text-yellow-800">
                  Are you sure? This will remove the selected motivations from {selectedIds.size} record(s).
                </p>
              </div>
            )}

            {/* Task Template selection */}
            {bulkActionModal === 'addTaskTemplate' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={bulkSearchQuery}
                    onChange={(e) => setBulkSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary bg-background text-foreground"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  {taskTemplates
                    .filter(t => t.name.toLowerCase().includes(bulkSearchQuery.toLowerCase()) || t.title.toLowerCase().includes(bulkSearchQuery.toLowerCase()))
                    .map((template) => (
                      <label key={template.id} className="flex items-center gap-2 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0">
                        <input
                          type="radio"
                          name="taskTemplate"
                          checked={selectedTaskTemplate === template.id}
                          onChange={() => setSelectedTaskTemplate(template.id)}
                          className="text-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{template.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{template.title}</div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          template.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                          template.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                          template.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {template.priority}
                        </span>
                      </label>
                    ))}
                  {taskTemplates.filter(t => t.name.toLowerCase().includes(bulkSearchQuery.toLowerCase()) || t.title.toLowerCase().includes(bulkSearchQuery.toLowerCase())).length === 0 && (
                    <p className="text-sm text-muted-foreground p-3 text-center">No templates found</p>
                  )}
                </div>
                {selectedTaskTemplate && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                    <p className="text-sm text-blue-800">
                      This will create a task from the selected template for each of the {selectedIds.size} selected record(s).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Clear Tasks confirmation */}
            {bulkActionModal === 'clearTasks' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Are you sure?</strong> This will permanently delete all tasks associated with the selected {selectedIds.size} record(s). This action cannot be undone.
                </p>
              </div>
            )}

            {/* Delete confirmations */}
            {bulkActionModal === 'deletePhones' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Are you sure?</strong> This will permanently delete all phone numbers from the selected records. This action cannot be undone.
                </p>
              </div>
            )}

            {bulkActionModal === 'deleteRecords' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  <strong>Are you sure?</strong> This will permanently delete the selected records and all their associated data. This action cannot be undone.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setBulkActionModal(null); setBulkSearchQuery('') }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={executeBulkAction}
                disabled={bulkActionLoading || (
                  (bulkActionModal === 'addTags' || bulkActionModal === 'removeTags' || 
                   bulkActionModal === 'addMotivations' || bulkActionModal === 'removeMotivations') && 
                  selectedBulkItems.length === 0
                ) || (
                  bulkActionModal === 'updateTemperature' && !selectedTemperature
                ) || (
                  bulkActionModal === 'addTaskTemplate' && !selectedTaskTemplate
                )}
                className={`px-4 py-2 rounded-lg text-white transition ${
                  bulkActionModal === 'deleteRecords'
                    ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-300'
                    : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300'
                }`}
              >
                {bulkActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : bulkActionModal === 'deleteRecords' ? (
                  'Delete'
                ) : bulkActionModal === 'deletePhones' ? (
                  'Delete Phones'
                ) : (
                  'Apply'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
