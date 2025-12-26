'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface TableWidgetProps {
  widgetId: string
  title: string
  subtitle?: string | null
  config: {
    dataSource: string
    columns?: string[]
    sortBy?: string
    sortOrder?: string
    limit?: number
    filters?: Array<{ field: string; operator: string; value: string }>
  }
  appearance?: {
    showHeader?: boolean
    striped?: boolean
    compact?: boolean
  } | null
}

interface TableRow {
  id: string
  [key: string]: string | number | null
}

export default function TableWidget({
  widgetId,
  title,
  subtitle,
  config,
  appearance,
}: TableWidgetProps) {
  const [data, setData] = useState<TableRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchData()
  }, [widgetId, JSON.stringify(config)])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/analytics-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          widgetId,
          type: 'table',
          config,
        }),
      })

      if (response.ok) {
        const result = await response.json()
        setData(result.data || [])
      } else {
        setError('Failed to load data')
      }
    } catch (err) {
      console.error('Error fetching widget data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-500 text-sm">
        {error}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
        No data available
      </div>
    )
  }

  // Get columns from first row or config
  const columns = config.columns || Object.keys(data[0]).filter(k => k !== 'id')

  const formatColumnName = (col: string) => {
    return col
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim()
  }

  const formatValue = (value: string | number | null) => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'number') return value.toLocaleString()
    return value
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {subtitle && (
        <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
      )}
      
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          {appearance?.showHeader !== false && (
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {formatColumnName(col)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-gray-100">
            {data.map((row, idx) => (
              <tr
                key={row.id || idx}
                className={`${
                  appearance?.striped && idx % 2 === 1 ? 'bg-gray-50' : ''
                } hover:bg-blue-50`}
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className={`px-3 ${appearance?.compact ? 'py-1' : 'py-2'} text-gray-900`}
                  >
                    {formatValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
