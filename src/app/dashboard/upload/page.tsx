'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setMessage(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/property/batch', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setMessage({ type: 'success', text: `Successfully processed ${data.count} properties` })
      setFile(null)
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Upload failed' })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Batch Upload</h1>
        <p className="text-gray-500 mt-1">Upload CSV or Excel file with property addresses</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-1">
              {file ? file.name : 'Click to upload a file'}
            </p>
            <p className="text-sm text-gray-500">
              CSV or Excel file with an "address" column
            </p>
          </label>
        </div>

        {file && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              {uploading ? 'Processing...' : 'Upload & Process'}
            </button>
          </div>
        )}

        {message && (
          <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <p className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
              {message.text}
            </p>
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">File Format</h3>
          <p className="text-sm text-gray-600 mb-3">
            Your file should have a column named "address" with full property addresses.
          </p>
          <div className="bg-white rounded border p-3 font-mono text-sm">
            <p className="text-gray-500">address</p>
            <p>123 Main St, New York, NY 10001</p>
            <p>456 Oak Ave, Los Angeles, CA 90001</p>
            <p>789 Pine Rd, Chicago, IL 60601</p>
          </div>
        </div>
      </div>
    </div>
  )
}
