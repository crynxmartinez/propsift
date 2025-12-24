'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Loader2, Search, Check } from 'lucide-react'

interface AddPropertyModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface AddressResult {
  display_name: string
  address: {
    house_number?: string
    road?: string
    city?: string
    town?: string
    village?: string
    state?: string
    postcode?: string
  }
}

interface StatusItem {
  id: string
  name: string
  color: string
  isActive: boolean
}

interface MotivationItem {
  id: string
  name: string
}

interface TagItem {
  id: string
  name: string
}

interface UserItem {
  id: string
  name: string | null
  email: string
}

interface FormData {
  // Step 1: Property Address
  propertyStreet: string
  propertyCity: string
  propertyState: string
  propertyZip: string
  // Step 2: Owner & Contact
  ownerFirstName: string
  ownerLastName: string
  ownerFullName: string
  isCompany: boolean
  sameAsProperty: boolean
  mailingStreet: string
  mailingCity: string
  mailingState: string
  mailingZip: string
  phone: string
  email: string
  // Step 3: Assignment
  statusId: string
  motivationIds: string[]
  tagIds: string[]
  assignedToId: string
  notes: string
}

const initialFormData: FormData = {
  propertyStreet: '',
  propertyCity: '',
  propertyState: '',
  propertyZip: '',
  ownerFirstName: '',
  ownerLastName: '',
  ownerFullName: '',
  isCompany: false,
  sameAsProperty: false,
  mailingStreet: '',
  mailingCity: '',
  mailingState: '',
  mailingZip: '',
  phone: '',
  email: '',
  statusId: '',
  motivationIds: [],
  tagIds: [],
  assignedToId: '',
  notes: '',
}

export default function AddPropertyModal({ isOpen, onClose, onSuccess }: AddPropertyModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Address autocomplete
  const [addressQuery, setAddressQuery] = useState('')
  const [addressResults, setAddressResults] = useState<AddressResult[]>([])
  const [searchingAddress, setSearchingAddress] = useState(false)
  const [showAddressDropdown, setShowAddressDropdown] = useState(false)
  const skipNextSearchRef = useRef(false)
  
  // Options for dropdowns
  const [statuses, setStatuses] = useState<StatusItem[]>([])
  const [motivations, setMotivations] = useState<MotivationItem[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [users, setUsers] = useState<UserItem[]>([])
  
  // Search states for motivations and tags
  const [motivationSearch, setMotivationSearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [showMotivationDropdown, setShowMotivationDropdown] = useState(false)
  const [showTagDropdown, setShowTagDropdown] = useState(false)

  // Fetch options on mount
  useEffect(() => {
    if (isOpen) {
      fetchOptions()
    }
  }, [isOpen])

  const fetchOptions = async () => {
    try {
      const [statusRes, motivationRes, tagRes] = await Promise.all([
        fetch('/api/statuses'),
        fetch('/api/motivations'),
        fetch('/api/tags'),
      ])
      
      if (statusRes.ok) {
        const data = await statusRes.json()
        setStatuses(data.filter((s: StatusItem) => s.isActive))
      }
      if (motivationRes.ok) {
        const data = await motivationRes.json()
        setMotivations(data)
      }
      if (tagRes.ok) {
        const data = await tagRes.json()
        setTags(data)
      }
      
      // For now, set current user as the only option
      // In future, fetch from /api/users
      setUsers([{ id: 'current', name: 'Me', email: '' }])
    } catch (error) {
      console.error('Error fetching options:', error)
    }
  }

  // Debounced address search
  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 3) {
      setAddressResults([])
      return
    }
    
    setSearchingAddress(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=us&q=${encodeURIComponent(query)}`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      )
      if (response.ok) {
        const data = await response.json()
        setAddressResults(data.slice(0, 5))
        setShowAddressDropdown(true)
      }
    } catch (error) {
      console.error('Error searching address:', error)
    } finally {
      setSearchingAddress(false)
    }
  }, [])

  // Debounce effect for address search
  useEffect(() => {
    // Skip search if address was just selected from dropdown
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false
      return
    }
    const timer = setTimeout(() => {
      if (addressQuery) {
        searchAddress(addressQuery)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [addressQuery, searchAddress])

  const selectAddress = (result: AddressResult) => {
    const street = [result.address.house_number, result.address.road].filter(Boolean).join(' ')
    const city = result.address.city || result.address.town || result.address.village || ''
    
    setFormData(prev => ({
      ...prev,
      propertyStreet: street,
      propertyCity: city,
      propertyState: result.address.state || '',
      propertyZip: result.address.postcode || '',
    }))
    skipNextSearchRef.current = true
    setAddressQuery(street)
    setAddressResults([])
    setShowAddressDropdown(false)
  }

  // Handle same as property checkbox
  useEffect(() => {
    if (formData.sameAsProperty) {
      setFormData(prev => ({
        ...prev,
        mailingStreet: prev.propertyStreet,
        mailingCity: prev.propertyCity,
        mailingState: prev.propertyState,
        mailingZip: prev.propertyZip,
      }))
    }
  }, [formData.sameAsProperty, formData.propertyStreet, formData.propertyCity, formData.propertyState, formData.propertyZip])

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Limit to 11 digits (1 + 10 digit US number)
    const limited = digits.slice(0, 11)
    
    // Format based on length
    if (limited.length === 0) return ''
    if (limited.length <= 3) return `(${limited}`
    if (limited.length <= 6) return `(${limited.slice(0, 3)}) ${limited.slice(3)}`
    if (limited.length <= 10) return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
    // 11 digits - includes country code
    return `+${limited.slice(0, 1)} (${limited.slice(1, 4)}) ${limited.slice(4, 7)}-${limited.slice(7)}`
  }

  const updateFormData = (field: keyof FormData, value: string | boolean | string[]) => {
    // Auto-format phone number
    if (field === 'phone' && typeof value === 'string') {
      setFormData(prev => ({ ...prev, [field]: formatPhoneNumber(value) }))
    } else {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const toggleArrayItem = (field: 'motivationIds' | 'tagIds', id: string) => {
    setFormData(prev => {
      const current = prev[field]
      if (current.includes(id)) {
        return { ...prev, [field]: current.filter(i => i !== id) }
      } else {
        return { ...prev, [field]: [...current, id] }
      }
    })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // Build owner full name - use manual input if provided, otherwise auto-generate
      const autoGeneratedName = `${formData.ownerFirstName} ${formData.ownerLastName}`.trim()
      const ownerFullName = formData.ownerFullName.trim() || autoGeneratedName

      const payload = {
        ownerFirstName: formData.ownerFirstName || null,
        ownerLastName: formData.ownerLastName || null,
        ownerFullName,
        isCompany: formData.isCompany,
        propertyStreet: formData.propertyStreet,
        propertyCity: formData.propertyCity,
        propertyState: formData.propertyState,
        propertyZip: formData.propertyZip,
        mailingStreet: formData.mailingStreet,
        mailingCity: formData.mailingCity,
        mailingState: formData.mailingState,
        mailingZip: formData.mailingZip,
        phone: formData.phone || null,
        email: formData.email || null,
        notes: formData.notes || null,
        statusId: formData.statusId || null,
        assignedToId: formData.assignedToId === 'current' ? null : formData.assignedToId || null,
        motivationIds: formData.motivationIds,
        tagIds: formData.tagIds,
      }

      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to create record')
      }

      onSuccess()
      handleClose()
    } catch (error) {
      console.error('Error creating record:', error)
      alert('Failed to create property record')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setStep(1)
    setFormData(initialFormData)
    setAddressQuery('')
    setAddressResults([])
    setMotivationSearch('')
    setTagSearch('')
    setShowMotivationDropdown(false)
    setShowTagDropdown(false)
    onClose()
  }

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-motivation-dropdown]')) {
        setShowMotivationDropdown(false)
      }
      if (!target.closest('[data-tag-dropdown]')) {
        setShowTagDropdown(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  const canProceed = () => {
    if (step === 1) {
      return formData.propertyStreet.trim() !== ''
    }
    if (step === 2) {
      // Need either fullName OR first/last name
      return formData.ownerFullName.trim() !== '' || formData.ownerFirstName.trim() !== '' || formData.ownerLastName.trim() !== ''
    }
    return true
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add New Property</h2>
          <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-center">
            {/* Step 1 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className={`ml-2 text-sm ${step >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>
                Property
              </span>
            </div>
            
            {/* Line 1-2 */}
            <div className={`w-16 h-0.5 mx-2 ${step > 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            
            {/* Step 2 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className={`ml-2 text-sm ${step >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                Owner
              </span>
            </div>
            
            {/* Line 2-3 */}
            <div className={`w-16 h-0.5 mx-2 ${step > 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            
            {/* Step 3 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                3
              </div>
              <span className={`ml-2 text-sm ${step >= 3 ? 'text-gray-900' : 'text-gray-500'}`}>
                Assignment
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto max-h-[50vh]">
          {/* Step 1: Property Address */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={addressQuery}
                    onChange={(e) => setAddressQuery(e.target.value)}
                    placeholder="Start typing an address..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  {searchingAddress && (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                  
                  {/* Address Dropdown */}
                  {showAddressDropdown && addressResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {addressResults.map((result, index) => {
                        const street = [result.address.house_number, result.address.road].filter(Boolean).join(' ')
                        const city = result.address.city || result.address.town || result.address.village || ''
                        const state = result.address.state || ''
                        const zip = result.address.postcode || ''
                        const displayAddress = [street, city, state, zip].filter(Boolean).join(', ')
                        return (
                          <button
                            key={index}
                            onClick={() => selectAddress(result)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-100 last:border-0"
                          >
                            {displayAddress || result.display_name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Select from dropdown or manually enter below
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                  <input
                    type="text"
                    value={formData.propertyStreet}
                    onChange={(e) => updateFormData('propertyStreet', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      value={formData.propertyCity}
                      onChange={(e) => updateFormData('propertyCity', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      value={formData.propertyState}
                      onChange={(e) => updateFormData('propertyState', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                    <input
                      type="text"
                      value={formData.propertyZip}
                      onChange={(e) => updateFormData('propertyZip', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Owner & Contact */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Is Company Toggle */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    onClick={() => updateFormData('isCompany', !formData.isCompany)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      formData.isCompany ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        formData.isCompany ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-700">This is a company</span>
                </label>
              </div>

              {/* Owner Name */}
              {formData.isCompany ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.ownerFullName}
                    onChange={(e) => updateFormData('ownerFullName', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        value={formData.ownerFirstName}
                        onChange={(e) => updateFormData('ownerFirstName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        value={formData.ownerLastName}
                        onChange={(e) => updateFormData('ownerLastName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name / Company Name <span className="text-gray-400 font-normal">(optional override)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.ownerFullName}
                      onChange={(e) => updateFormData('ownerFullName', e.target.value)}
                      placeholder={`${formData.ownerFirstName} ${formData.ownerLastName}`.trim() || 'Auto-generated from first + last name'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </>
              )}

              {/* Mailing Address */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">Mailing Address</h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sameAsProperty}
                      onChange={(e) => updateFormData('sameAsProperty', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">Same as property</span>
                  </label>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                    <input
                      type="text"
                      value={formData.mailingStreet}
                      onChange={(e) => updateFormData('mailingStreet', e.target.value)}
                      disabled={formData.sameAsProperty}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={formData.mailingCity}
                        onChange={(e) => updateFormData('mailingCity', e.target.value)}
                        disabled={formData.sameAsProperty}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={formData.mailingState}
                        onChange={(e) => updateFormData('mailingState', e.target.value)}
                        disabled={formData.sameAsProperty}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Zip</label>
                      <input
                        type="text"
                        value={formData.mailingZip}
                        onChange={(e) => updateFormData('mailingZip', e.target.value)}
                        disabled={formData.sameAsProperty}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      placeholder="owner@example.com"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Assignment & Notes */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Status & Assign To Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.statusId}
                    onChange={(e) => updateFormData('statusId', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Select a status</option>
                    {statuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assign To */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <select
                    value={formData.assignedToId}
                    onChange={(e) => updateFormData('assignedToId', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lists & Tags + Notes Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Lists & Tags Box */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
                    <span className="text-blue-600">—</span>
                    <span className="text-sm font-medium text-blue-600">MOTIVATIONS & TAGS</span>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200">
                    <button
                      type="button"
                      onClick={() => setMotivationSearch('')}
                      className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition ${
                        !showTagDropdown && !tagSearch
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Motivations ({formData.motivationIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTagSearch('')}
                      className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition ${
                        showTagDropdown || tagSearch
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Tags ({formData.tagIds.length})
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative" data-motivation-dropdown data-tag-dropdown>
                      <input
                        type="text"
                        value={motivationSearch || tagSearch}
                        onChange={(e) => {
                          setMotivationSearch(e.target.value)
                          setTagSearch(e.target.value)
                        }}
                        placeholder="Search or add..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-sm font-medium hover:text-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Selected Items List */}
                  <div className="max-h-48 overflow-y-auto">
                    {/* Motivations */}
                    {formData.motivationIds.map((id) => {
                      const motivation = motivations.find(m => m.id === id)
                      return motivation ? (
                        <div
                          key={id}
                          className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0"
                        >
                          <span className="text-sm text-gray-700">{motivation.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleArrayItem('motivationIds', id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ×
                          </button>
                        </div>
                      ) : null
                    })}
                    {/* Tags */}
                    {formData.tagIds.map((id) => {
                      const tag = tags.find(t => t.id === id)
                      return tag ? (
                        <div
                          key={id}
                          className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0"
                        >
                          <span className="text-sm text-gray-700">{tag.name}</span>
                          <button
                            type="button"
                            onClick={() => toggleArrayItem('tagIds', id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            ×
                          </button>
                        </div>
                      ) : null
                    })}
                    {formData.motivationIds.length === 0 && formData.tagIds.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">
                        No motivations or tags selected
                      </div>
                    )}
                  </div>

                  {/* Available Items Dropdown */}
                  {(motivationSearch || tagSearch) && (
                    <div className="border-t border-gray-200 max-h-32 overflow-y-auto bg-gray-50">
                      {motivations
                        .filter(m => 
                          m.name.toLowerCase().includes((motivationSearch || '').toLowerCase()) &&
                          !formData.motivationIds.includes(m.id)
                        )
                        .map((motivation) => (
                          <button
                            key={motivation.id}
                            type="button"
                            onClick={() => {
                              toggleArrayItem('motivationIds', motivation.id)
                              setMotivationSearch('')
                              setTagSearch('')
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-100 last:border-0 flex items-center gap-2"
                          >
                            <span className="text-purple-600 text-xs">M</span>
                            {motivation.name}
                          </button>
                        ))}
                      {tags
                        .filter(t => 
                          t.name.toLowerCase().includes((tagSearch || '').toLowerCase()) &&
                          !formData.tagIds.includes(t.id)
                        )
                        .map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              toggleArrayItem('tagIds', tag.id)
                              setMotivationSearch('')
                              setTagSearch('')
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-100 last:border-0 flex items-center gap-2"
                          >
                            <span className="text-blue-600 text-xs">T</span>
                            {tag.name}
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                {/* Notes Box */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
                    <span className="text-blue-600">—</span>
                    <span className="text-sm font-medium text-blue-600">NOTES</span>
                  </div>
                  
                  {/* Notes Textarea */}
                  <div className="p-3">
                    <textarea
                      value={formData.notes}
                      onChange={(e) => updateFormData('notes', e.target.value)}
                      rows={8}
                      placeholder="Add any notes about this property..."
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
          >
            Cancel
          </button>
          
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                Back
              </button>
            )}
            
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Creating...' : 'Create Property'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
