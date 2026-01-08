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
          className="text-muted-foreground hover:text-foreground font-medium"
        >
          Property Records
        </Link>
        <span className="text-primary font-medium border-b-2 border-primary pb-1">
          Owner Records
        </span>
      </div>

      {/* Filter Tabs and Search */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {filters.map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'secondary'}
              size="sm"
              onClick={() => {
                setFilter(f.key)
                setPage(1)
              }}
            >
              {f.label}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for records..."
              className="pl-10 w-64"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filter Records
          </Button>
          <Button onClick={() => router.push('/dashboard/records/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Owner
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Mailing Address</TableHead>
                <TableHead>Phones</TableHead>
                <TableHead>Marketing Attempts</TableHead>
                <TableHead className="text-right">Properties</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : owners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No owners found
                  </TableCell>
                </TableRow>
              ) : (
                owners.map((owner) => {
                  const address = formatAddress(
                    owner.mailingStreet,
                    owner.mailingCity,
                    owner.mailingState,
                    owner.mailingZip
                  )
                  return (
                    <TableRow key={owner.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/owners/${owner.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {owner.ownerFullName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {owner.isCompany ? 'Company' : 'Person'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{address.line1 || '—'}</p>
                          {address.line2 && (
                            <p className="text-muted-foreground">{address.line2}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-sm", owner.verifiedPercent > 0 ? 'text-green-600' : 'text-muted-foreground')}>
                          {owner.totalPhones} ({owner.verifiedPercent}% Verified)
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1" title="Call Attempts">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{owner.callAttempts}</span>
                          </div>
                          <div className="flex items-center gap-1" title="Direct Mail Attempts">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{owner.directMailAttempts}</span>
                          </div>
                          <div className="flex items-center gap-1" title="SMS Attempts">
                            <MessageSquare className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{owner.smsAttempts}</span>
                          </div>
                          <div className="flex items-center gap-1" title="RVM Attempts">
                            <Voicemail className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{owner.rvmAttempts}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Home className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{owner.propertyCount}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Showing {owners.length} of {total} owners
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Page</span>
          <Input
            type="number"
            value={page}
            onChange={(e) => {
              const newPage = parseInt(e.target.value) || 1
              setPage(Math.min(Math.max(1, newPage), totalPages))
            }}
            min={1}
            max={totalPages}
            className="w-16 text-center"
          />
          <span className="text-sm text-muted-foreground">of {totalPages}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
