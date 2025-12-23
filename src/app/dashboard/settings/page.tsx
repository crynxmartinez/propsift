'use client'

import { useState } from 'react'
import { Settings, Key, Save } from 'lucide-react'

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Configure your PropSift settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
            <Key className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">API Configuration</h2>
            <p className="text-sm text-gray-500">Configure your RapidAPI key</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RapidAPI Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your RapidAPI key"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <p className="text-sm text-gray-500 mt-2">
              Get your API key from{' '}
              <a href="https://rapidapi.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                RapidAPI
              </a>
            </p>
          </div>

          <button
            onClick={handleSave}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
