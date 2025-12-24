'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function OwnerDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const ownerId = params.id as string

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <button
          onClick={() => router.push('/dashboard/records')}
          className="flex items-center gap-1 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Records
        </button>
        <span>/</span>
        <span className="text-gray-700">Owner Details</span>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">👤</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Owner Details</h1>
        <p className="text-gray-500 mb-4">
          This page is under construction.
        </p>
        <p className="text-sm text-gray-400">
          Owner ID: {ownerId}
        </p>
        <button
          onClick={() => router.push(`/dashboard/records/${ownerId}`)}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          View Property Details Instead
        </button>
      </div>
    </div>
  )
}
