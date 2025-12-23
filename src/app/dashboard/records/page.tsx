'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Filter, Loader2, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import AddPropertyModal from '@/components/AddPropertyModal'

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
  const [activeTab, setActiveTab] = useState<'property' | 'owner'>('property')
  const [assignedToMe, setAssignedToMe] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

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
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

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
          <button
            onClick={() => setActiveTab('property')}
            className={`text-sm font-medium pb-2 border-b-2 transition ${
              activeTab === 'property'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Property Records
          </button>
          <button
            onClick={() => setActiveTab('owner')}
            className={`text-sm font-medium pb-2 border-b-2 transition ${
              activeTab === 'owner'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            Owner Records
          </button>
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
                <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100">
                  Bulk Import
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Filter Tabs + Assigned to me + Filter Button */}
      <div className="flex items-center justify-between mb-6">
        {/* Left: Filter Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter('complete')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'complete'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Complete
          </button>
          <button
            onClick={() => setFilter('incomplete')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'incomplete'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Incomplete
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
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
                        <input
                          type="checkbox"
                          checked={selectedIds.size > 0 && selectedIds.size === records.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
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
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(record.id)}
                          onChange={() => toggleSelect(record.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <button className="text-blue-600 hover:text-blue-800 hover:underline text-left font-medium">
                          {record.ownerFullName}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <button className="text-left hover:text-blue-600">
                          {formatAddress(record.mailingStreet, record.mailingCity, record.mailingState, record.mailingZip)}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <button className="text-left hover:text-blue-600">
                          {formatAddress(record.propertyStreet, record.propertyCity, record.propertyState, record.propertyZip)}
                        </button>
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
                          {record.recordTags.length}
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
    </div>
  )
}
