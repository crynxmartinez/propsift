'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Filter, Loader2, ChevronDown, ChevronLeft, ChevronRight, Search, Settings, Trash2, Tag, Target, Thermometer, User, Phone, X, Upload, Download } from 'lucide-react'
import AddPropertyModal from '@/components/AddPropertyModal'
import BulkImportModal from '@/components/BulkImportModal'
import { useToast } from '@/components/Toast'

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

export default function RecordsPage() {
  const router = useRouter()
  const { showToast } = useToast()
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
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

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/records?page=${page}&limit=${limit}&filter=${filter}`)
      if (!res.ok) throw new Error('Failed to fetch records')
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
  }, [page, limit, filter])

  useEffect(() => {
    setPage(1)
    setSelectedIds(new Set())
  }, [filter])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown]')) {
        setShowAddDropdown(false)
        setShowSelectDropdown(false)
        setShowLimitDropdown(false)
        setShowManageDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Fetch options for bulk actions
  const fetchBulkOptions = async () => {
    try {
      const [tagsRes, motivationsRes, statusesRes, usersRes] = await Promise.all([
        fetch('/api/tags'),
        fetch('/api/motivations'),
        fetch('/api/statuses'),
        fetch('/api/users'),
      ])
      if (tagsRes.ok) setTags(await tagsRes.json())
      if (motivationsRes.ok) setMotivations(await motivationsRes.json())
      if (statusesRes.ok) setStatuses(await statusesRes.json())
      if (usersRes.ok) setUsers(await usersRes.json())
    } catch (error) {
      console.error('Error fetching bulk options:', error)
    }
  }

  const openBulkActionModal = (action: string) => {
    setBulkActionModal(action)
    setShowManageDropdown(false)
    setSelectedBulkItems([])
    setSelectedTemperature('')
    if (tags.length === 0) fetchBulkOptions()
  }

  const handleExportRecords = async () => {
    setShowManageDropdown(false)
    
    try {
      const recordIds = selectedIds.size > 0 ? Array.from(selectedIds) : null
      const recordCount = selectedIds.size > 0 ? selectedIds.size : totalCount
      
      // Call export API which creates activity log and stores CSV
      const exportRes = await fetch('/api/records/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordIds }),
      })
      
      if (!exportRes.ok) {
        throw new Error('Export failed')
      }
      
      showToast(`Export started! ${recordCount} records queued. Go to Activity > Download to download your file.`, 'success', 5000)
    } catch (error) {
      console.error('Export error:', error)
      showToast('Failed to export records', 'error')
    }
  }

  const executeBulkAction = async () => {
    if (!bulkActionModal) return
    setBulkActionLoading(true)
    try {
      const recordIds = Array.from(selectedIds)
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        setBulkActionModal(null)
        setSelectedIds(new Set())
        fetchRecords()
        showToast('Bulk action completed successfully', 'success')
      } else {
        const error = await res.json()
        showToast(error.error || 'Bulk action failed', 'error')
      }
    } catch (error) {
      console.error('Error executing bulk action:', error)
      showToast('Failed to execute bulk action', 'error')
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
          <div className="text-gray-500">{city}, {state} {zip}</div>
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
      <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-4">
        {/* Left: Tab Navigation */}
        <div className="flex items-center gap-6">
          <span className="text-sm font-medium pb-2 border-b-2 text-blue-600 border-blue-600">
            Property Records
          </span>
        </div>

        {/* Right: Search + Add Button */}
        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search for records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>

          {/* Add New Property Button */}
          <div className="relative" data-dropdown>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowAddDropdown(!showAddDropdown)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
            >
              Add New Property
            </button>
            {showAddDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button 
                  onClick={() => {
                    setShowAddModal(true)
                    setShowAddDropdown(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  Add Single Property
                </button>
                <button 
                  onClick={() => {
                    setShowBulkImportModal(true)
                    setShowAddDropdown(false)
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Bulk Import
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Filter Toggle + Selection Info + Manage Button */}
      <div className="flex items-center justify-between mb-6">
        {/* Left: 3-way Toggle Filter (pill style) */}
        <div className="flex items-center gap-4">
          <div className="inline-flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setFilter('complete')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                filter === 'complete'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Clean
            </button>
            <button
              onClick={() => setFilter('incomplete')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                filter === 'incomplete'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Incomplete
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                filter === 'all'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              All
            </button>
          </div>

          {/* Selection indicator + Manage button (only when items selected) */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                Selecting {selectedIds.size} {selectedIds.size === 1 ? 'property' : 'properties'}
              </span>
              <div className="relative" data-dropdown>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowManageDropdown(!showManageDropdown)
                  }}
                  className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  Manage
                  <Settings className="w-4 h-4" />
                </button>
                {showManageDropdown && (
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => openBulkActionModal('addTags')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Tag className="w-4 h-4" /> Add tags
                    </button>
                    <button
                      onClick={() => openBulkActionModal('removeTags')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Tag className="w-4 h-4" /> Remove tags
                    </button>
                    <button
                      onClick={() => openBulkActionModal('addMotivations')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Target className="w-4 h-4" /> Add motivation
                    </button>
                    <button
                      onClick={() => openBulkActionModal('removeMotivations')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Target className="w-4 h-4" /> Remove motivation
                    </button>
                    <button
                      onClick={() => openBulkActionModal('updateStatus')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" /> Update status
                    </button>
                    <button
                      onClick={() => openBulkActionModal('updateTemperature')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Thermometer className="w-4 h-4" /> Update temperature
                    </button>
                    <button
                      onClick={() => openBulkActionModal('assignToUser')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <User className="w-4 h-4" /> Assign to user
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={() => openBulkActionModal('deletePhones')}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" /> Delete phones
                    </button>
                    <button
                      onClick={() => openBulkActionModal('deleteRecords')}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={handleExportRecords}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" /> Export properties
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Assigned to me + Filter Records */}
        <div className="flex items-center gap-4">
          {/* Assigned to me toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              onClick={() => setAssignedToMe(!assignedToMe)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                assignedToMe ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  assignedToMe ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">Assigned to me</span>
          </label>

          {/* Filter Records Button */}
          <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition text-sm">
            <Filter className="w-4 h-4" />
            Filter Records
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
            <p className="text-gray-500 mt-2">Loading records...</p>
          </div>
        ) : (
          <>
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <div className="relative" data-dropdown>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowSelectDropdown(!showSelectDropdown)
                        }}
                        className="flex items-center gap-1"
                      >
                        <div className="w-4 h-4 rounded border border-gray-300 bg-white flex items-center justify-center">
                          {selectedIds.size > 0 && selectedIds.size === records.length && (
                            <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {selectedIds.size > 0 && selectedIds.size < records.length && (
                            <div className="w-2 h-2 bg-blue-600 rounded-sm" />
                          )}
                        </div>
                        <ChevronDown className="w-3 h-3 text-gray-400" />
                      </button>
                      {showSelectDropdown && (
                        <div className="absolute left-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <div className="px-3 py-1 text-xs text-gray-500">Choose selection</div>
                          <button
                            onClick={handleSelectVisible}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Select visible ({records.length})
                          </button>
                          <button
                            onClick={handleSelectAll}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Select all ({totalCount})
                          </button>
                          {selectedIds.size > 0 && (
                            <button
                              onClick={handleClearSelection}
                              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                            >
                              Clear selection
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                  <th className="w-1/6 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="w-1/5 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mailing Address</th>
                  <th className="w-1/5 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property Address</th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Skiptrace</th>
                  <th className="w-20 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Motivation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No records found</p>
                      <p className="text-sm text-gray-400">
                        {filter === 'complete' ? 'No complete records yet' : 
                         filter === 'incomplete' ? 'No incomplete records' : 
                         'Add your first property record'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  records.map((record) => (
                    <tr 
                      key={record.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/records/${record.id}`)}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(record.id)}
                          onChange={() => toggleSelect(record.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/owners/${record.id}`)
                          }}
                          className="text-left hover:text-blue-600"
                        >
                          <div className="text-sm text-gray-900 font-medium hover:text-blue-600">
                            {record.ownerFirstName || record.ownerLastName 
                              ? `${record.ownerFirstName || ''} ${record.ownerLastName || ''}`.trim()
                              : record.ownerFullName}
                          </div>
                          {(record.ownerFirstName || record.ownerLastName) && record.ownerFullName !== `${record.ownerFirstName || ''} ${record.ownerLastName || ''}`.trim() && (
                            <div className="text-xs text-gray-500">
                              {record.ownerFullName}
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className="text-left hover:text-blue-600">
                          {formatAddress(record.mailingStreet, record.mailingCity, record.mailingState, record.mailingZip)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className="text-left hover:text-blue-600">
                          {formatAddress(record.propertyStreet, record.propertyCity, record.propertyState, record.propertyZip)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {record.status ? (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: record.status.color }}
                          >
                            {record.status.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatSkiptraceDate(record.skiptraceDate)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                          <span className="text-lg">📋</span>
                          {record.recordMotivations.length}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Show</span>
                <div className="relative" data-dropdown>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowLimitDropdown(!showLimitDropdown)
                    }}
                    className="flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50"
                  >
                    {limit}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showLimitDropdown && (
                    <div className="absolute bottom-full mb-1 left-0 w-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      {[10, 20, 50, 100].map((l) => (
                        <button
                          key={l}
                          onClick={() => {
                            setLimit(l)
                            setPage(1)
                            setShowLimitDropdown(false)
                          }}
                          className={`w-full px-3 py-1 text-left text-sm hover:bg-gray-100 ${
                            limit === l ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-500">per page</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages || totalPages === 0}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

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
      {bulkActionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {bulkActionModal === 'addTags' && 'Add Tags'}
                {bulkActionModal === 'removeTags' && 'Remove Tags'}
                {bulkActionModal === 'addMotivations' && 'Add Motivations'}
                {bulkActionModal === 'removeMotivations' && 'Remove Motivations'}
                {bulkActionModal === 'updateStatus' && 'Update Status'}
                {bulkActionModal === 'updateTemperature' && 'Update Temperature'}
                {bulkActionModal === 'assignToUser' && 'Assign to User'}
                {bulkActionModal === 'deletePhones' && 'Delete Phones'}
                {bulkActionModal === 'deleteRecords' && 'Delete Records'}
              </h3>
              <button onClick={() => { setBulkActionModal(null); setBulkSearchQuery('') }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              This will affect {selectedIds.size} selected {selectedIds.size === 1 ? 'record' : 'records'}.
            </p>

            {/* Tags selection */}
            {(bulkActionModal === 'addTags' || bulkActionModal === 'removeTags') && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search tags..."
                    value={bulkSearchQuery}
                    onChange={(e) => setBulkSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {tags
                    .filter(tag => tag.name.toLowerCase().includes(bulkSearchQuery.toLowerCase()))
                    .map((tag) => (
                      <label key={tag.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
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
                  {tags.filter(tag => tag.name.toLowerCase().includes(bulkSearchQuery.toLowerCase())).length === 0 && (
                    <p className="text-sm text-gray-400 p-3 text-center">No tags found</p>
                  )}
                </div>
                {selectedBulkItems.length > 0 && (
                  <p className="text-xs text-gray-500">{selectedBulkItems.length} selected</p>
                )}
              </div>
            )}

            {/* Motivations selection */}
            {(bulkActionModal === 'addMotivations' || bulkActionModal === 'removeMotivations') && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search motivations..."
                    value={bulkSearchQuery}
                    onChange={(e) => setBulkSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {motivations
                    .filter(m => m.name.toLowerCase().includes(bulkSearchQuery.toLowerCase()))
                    .map((motivation) => (
                      <label key={motivation.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
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
                  {motivations.filter(m => m.name.toLowerCase().includes(bulkSearchQuery.toLowerCase())).length === 0 && (
                    <p className="text-sm text-gray-400 p-3 text-center">No motivations found</p>
                  )}
                </div>
                {selectedBulkItems.length > 0 && (
                  <p className="text-xs text-gray-500">{selectedBulkItems.length} selected</p>
                )}
              </div>
            )}

            {/* Status selection */}
            {bulkActionModal === 'updateStatus' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search statuses..."
                    value={bulkSearchQuery}
                    onChange={(e) => setBulkSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {statuses
                    .filter(s => s.name.toLowerCase().includes(bulkSearchQuery.toLowerCase()))
                    .map((status) => (
                      <label key={status.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
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
                    <p className="text-sm text-gray-400 p-3 text-center">No statuses found</p>
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
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
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
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={bulkSearchQuery}
                    onChange={(e) => setBulkSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  <label className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
                    <input
                      type="radio"
                      name="user"
                      checked={selectedBulkItems.length === 0}
                      onChange={() => setSelectedBulkItems([])}
                      className="w-4 h-4 border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-500">Unassigned</span>
                  </label>
                  {users
                    .filter(u => (u.name || u.email).toLowerCase().includes(bulkSearchQuery.toLowerCase()))
                    .map((user) => (
                      <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
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
                    <p className="text-sm text-gray-400 p-3 text-center">No users found</p>
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
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
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
