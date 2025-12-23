'use client'

import { useState, useEffect } from 'react'
import { Database, Trash2, RefreshCw } from 'lucide-react'

interface Property {
  id: string
  address: string
  streetAddress?: string
  city?: string
  state?: string
  zipcode?: string
  bedrooms?: number
  bathrooms?: number
  price?: number
  zestimate?: number
  updatedAt: string
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/property/list')
      const data = await res.json()
      if (res.ok) {
        setProperties(data.properties || [])
      }
    } catch (err) {
      console.error('Failed to fetch properties:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saved Properties</h1>
          <p className="text-gray-500 mt-1">Properties cached in your database</p>
        </div>
        <button
          onClick={fetchProperties}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : properties.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No properties saved yet</p>
            <p className="text-sm text-gray-400">Search for properties to save them</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">Address</th>
                <th className="text-left p-4 font-medium text-gray-600">Beds</th>
                <th className="text-left p-4 font-medium text-gray-600">Baths</th>
                <th className="text-left p-4 font-medium text-gray-600">Price</th>
                <th className="text-left p-4 font-medium text-gray-600">Zestimate</th>
                <th className="text-left p-4 font-medium text-gray-600">Updated</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {properties.map((property) => (
                <tr key={property.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <p className="font-medium text-gray-900">{property.streetAddress}</p>
                    <p className="text-sm text-gray-500">
                      {property.city}, {property.state} {property.zipcode}
                    </p>
                  </td>
                  <td className="p-4 text-gray-600">{property.bedrooms ?? '-'}</td>
                  <td className="p-4 text-gray-600">{property.bathrooms ?? '-'}</td>
                  <td className="p-4 text-gray-600">
                    {property.price ? formatPrice(property.price) : '-'}
                  </td>
                  <td className="p-4 text-gray-600">
                    {property.zestimate ? formatPrice(property.zestimate) : '-'}
                  </td>
                  <td className="p-4 text-gray-500 text-sm">
                    {new Date(property.updatedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <button className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
