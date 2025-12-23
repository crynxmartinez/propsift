'use client'

import { useState } from 'react'
import { Search, Home, MapPin, Bed, Bath, Square, Calendar, DollarSign } from 'lucide-react'

interface PropertyData {
  propertyDetails?: {
    streetAddress?: string
    city?: string
    state?: string
    zipcode?: string
    bedrooms?: number
    bathrooms?: number
    livingArea?: number
    yearBuilt?: number
    homeType?: string
    price?: number
    zestimate?: number
  }
}

export default function SearchPage() {
  const [address, setAddress] = useState('')
  const [property, setProperty] = useState<PropertyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!address.trim()) return

    setLoading(true)
    setError(null)
    setProperty(null)

    try {
      const res = await fetch(`/api/property/search?address=${encodeURIComponent(address)}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch property')
      }

      setProperty(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Property Search</h1>
        <p className="text-gray-500 mt-1">Search for property details by address</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <form onSubmit={handleSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter property address (e.g., 123 Main St, City, State ZIP)"
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 flex items-center gap-2"
          >
            <Search className="w-5 h-5" />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {property?.propertyDetails && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {property.propertyDetails.streetAddress}
              </h2>
              <p className="text-gray-500">
                {property.propertyDetails.city}, {property.propertyDetails.state} {property.propertyDetails.zipcode}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Bed className="w-4 h-4" />
                <span className="text-sm">Bedrooms</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {property.propertyDetails.bedrooms ?? '-'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Bath className="w-4 h-4" />
                <span className="text-sm">Bathrooms</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {property.propertyDetails.bathrooms ?? '-'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Square className="w-4 h-4" />
                <span className="text-sm">Sq Ft</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {property.propertyDetails.livingArea?.toLocaleString() ?? '-'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm">Year Built</span>
              </div>
              <p className="text-xl font-bold text-gray-900">
                {property.propertyDetails.yearBuilt ?? '-'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Price</span>
              </div>
              <p className="text-2xl font-bold text-green-700">
                {property.propertyDetails.price ? formatPrice(property.propertyDetails.price) : '-'}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Zestimate</span>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {property.propertyDetails.zestimate ? formatPrice(property.propertyDetails.zestimate) : '-'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
