/**
 * DockInsight 3.0 Drilldown Modal
 * 
 * Right slide panel showing records with Assign and More actions.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Loader2, ChevronLeft, ChevronRight, MoreHorizontal, UserPlus, Eye, Edit, ListTodo } from 'lucide-react'

interface DrilldownRecord {
  id: string
  ownerName: string
  propertyAddress: string | null
  phone: string | null
  temperature: string | null
  assigneeId: string | null
  assigneeName: string | null
}

interface Assignee {
  id: string
  name: string
}

interface DrilldownModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  filterType: string
  isExecutiveView: boolean
  assignees: Assignee[]
  onRecordClick?: (recordId: string) => void
}

export function DrilldownModal({
  isOpen,
  onClose,
  title,
  filterType,
  isExecutiveView,
  assignees,
  onRecordClick
}: DrilldownModalProps) {
  const [records, setRecords] = useState<DrilldownRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 50

  const fetchRecords = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('filterType', filterType)
      params.set('page', String(page))
      params.set('pageSize', String(pageSize))
      params.set('executive', String(isExecutiveView))

      const response = await fetch(`/api/dockinsight/drilldown?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setRecords(data.records)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error('Failed to fetch drilldown records:', error)
    } finally {
      setLoading(false)
    }
  }, [filterType, page, isExecutiveView])

  useEffect(() => {
    if (isOpen) {
      setPage(1)
      fetchRecords()
    }
  }, [isOpen, filterType])

  useEffect(() => {
    if (isOpen) {
      fetchRecords()
    }
  }, [page, fetchRecords, isOpen])

  const handleAssign = async (recordId: string, assigneeId: string) => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const response = await fetch('/api/dockinsight/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ recordId, assigneeId })
      })

      if (response.ok) {
        // Update local state
        setRecords(prev => prev.map(r => {
          if (r.id === recordId) {
            const assignee = assignees.find(a => a.id === assigneeId)
            return {
              ...r,
              assigneeId,
              assigneeName: assignee?.name || null
            }
          }
          return r
        }))
      }
    } catch (error) {
      console.error('Failed to assign record:', error)
    }
  }

  if (!isOpen) return null

  const temperatureColors: Record<string, string> = {
    hot: 'bg-red-100 text-red-700',
    warm: 'bg-orange-100 text-orange-700',
    cold: 'bg-blue-100 text-blue-700'
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-3xl bg-white shadow-xl z-50 animate-slide-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">{total.toLocaleString()} records</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : records.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Property Address</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Temp</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span 
                        className="text-blue-600 hover:underline cursor-pointer font-medium"
                        onClick={() => onRecordClick?.(record.id)}
                      >
                        {record.ownerName}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 max-w-[200px] truncate">
                      {record.propertyAddress || '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {record.phone || '-'}
                    </td>
                    <td className="py-3 px-4">
                      {record.temperature && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${temperatureColors[record.temperature] || 'bg-gray-100 text-gray-700'}`}>
                          {record.temperature.charAt(0).toUpperCase() + record.temperature.slice(1)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Assign Button (only if unassigned) */}
                        {!record.assigneeId && (
                          <AssignDropdown
                            assignees={assignees}
                            onAssign={(assigneeId) => handleAssign(record.id, assigneeId)}
                          />
                        )}
                        
                        {/* More Dropdown */}
                        <MoreDropdown
                          onView={() => onRecordClick?.(record.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No records found
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Assign Dropdown Component
function AssignDropdown({ 
  assignees, 
  onAssign 
}: { 
  assignees: Assignee[]
  onAssign: (assigneeId: string) => void 
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
      >
        <UserPlus className="w-3 h-3" />
        Assign
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[150px] max-h-48 overflow-y-auto">
            {assignees.map((assignee) => (
              <button
                key={assignee.id}
                onClick={() => { onAssign(assignee.id); setOpen(false) }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
              >
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-medium">
                  {assignee.name.charAt(0).toUpperCase()}
                </div>
                {assignee.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// More Dropdown Component
function MoreDropdown({ onView }: { onView: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1 hover:bg-gray-100 rounded transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-gray-500" />
      </button>
      
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 min-w-[140px]">
            <button
              onClick={() => { onView(); setOpen(false) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Eye className="w-4 h-4 text-gray-500" />
              View
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Edit className="w-4 h-4 text-gray-500" />
              Edit
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <ListTodo className="w-4 h-4 text-gray-500" />
              Add Task
            </button>
          </div>
        </>
      )}
    </div>
  )
}
