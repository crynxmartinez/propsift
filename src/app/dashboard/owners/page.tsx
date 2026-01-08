'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Filter, 
  Phone, 
  Mail, 
  MessageSquare, 
  Voicemail,
  Home,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Plus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { cn } from '@/lib/utils'

interface OwnerItem {
  id: string
  ownerFullName: string
  isCompany: boolean
  mailingStreet: string | null
  mailingCity: string | null
  mailingState: string | null
  mailingZip: string | null
  propertyCount: number
  totalPhones: number
  verifiedPhones: number
  verifiedPercent: number
  callAttempts: number
  directMailAttempts: number
  smsAttempts: number
  rvmAttempts: number
  isComplete: boolean
}

type FilterType = 'all' | 'incomplete' | 'company' | 'person'

export default function OwnerRecordsPage() {
  const router = useRouter()
  const [owners, setOwners] = useState<OwnerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchOwners()
  }, [page, filter])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1)
      fetchOwners()
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [search])

  const fetchOwners = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        filter,
      })
      if (search) {
        params.append('search', search)
      }

      const res = await fetch(`/api/owners?${params}`)
      if (res.ok) {
        const data = await res.json()
        setOwners(data.owners)
        setTotal(data.pagination.total)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error('Error fetching owners:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatAddress = (street: string | null, city: string | null, state: string | null, zip: string | null) => {
    const line1 = street || ''
    const line2 = [city, state, zip].filter(Boolean).join(', ')
    return { line1, line2 }
  }

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'incomplete', label: 'Incomplete' },
    { key: 'company', label: 'Company' },
    { key: 'person', label: 'Person' },
  ]

  return (
    <div className="p-6">
      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/records"
          className="text-gray-500 hover:text-gray-700 font-medium"
        >
          Property Records
        </Link>
        <span className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1">
          Owner Records
        </span>
      </div>

      {/* Filter Tabs and Search */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key)
                setPage(1)
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for records..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            Filter Records
          </button>
          <button 
            onClick={() => router.push('/dashboard/records/new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add New Owner
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mailing Address
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phones
              </th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Marketing Attempts
              </th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Properties
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                </td>
              </tr>
            ) : owners.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  No owners found
                </td>
              </tr>
            ) : (
              owners.map((owner) => {
                const address = formatAddress(
                  owner.mailingStreet,
                  owner.mailingCity,
                  owner.mailingState,
                  owner.mailingZip
                )
                return (
                  <tr key={owner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/owners/${owner.id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {owner.ownerFullName}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {owner.isCompany ? '' : 'Person'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-900">{address.line1 || '—'}</p>
                        {address.line2 && (
                          <p className="text-gray-500">{address.line2}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm ${
                        owner.verifiedPercent > 0 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {owner.totalPhones} ({owner.verifiedPercent}% Verified)
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1" title="Call Attempts">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{owner.callAttempts}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Direct Mail Attempts">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{owner.directMailAttempts}</span>
                        </div>
                        <div className="flex items-center gap-1" title="SMS Attempts">
                          <MessageSquare className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{owner.smsAttempts}</span>
                        </div>
                        <div className="flex items-center gap-1" title="RVM Attempts">
                          <Voicemail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{owner.rvmAttempts}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Home className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-gray-900">{owner.propertyCount}</span>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">
          Showing {owners.length} of {total} owners
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Page</span>
          <input
            type="number"
            value={page}
            onChange={(e) => {
              const newPage = parseInt(e.target.value) || 1
              setPage(Math.min(Math.max(1, newPage), totalPages))
            }}
            min={1}
            max={totalPages}
            className="w-16 px-2 py-1 text-center border border-gray-300 rounded"
          />
          <span className="text-sm text-gray-500">of {totalPages}</span>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
