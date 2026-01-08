'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Loader2, Search, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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
  const [activeListTab, setActiveListTab] = useState<'motivations' | 'tags'>('motivations')
  const [isListSearchFocused, setIsListSearchFocused] = useState(false)

  // Fetch options on mount
  useEffect(() => {
    if (isOpen) {
      fetchOptions()
    }
  }, [isOpen])

  const fetchOptions = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [statusRes, motivationRes, tagRes] = await Promise.all([
        fetch('/api/statuses', { headers }),
        fetch('/api/motivations', { headers }),
        fetch('/api/tags', { headers }),
      ])
      
      if (statusRes.ok) {
        const data = await statusRes.json()
        setStatuses(Array.isArray(data) ? data.filter((s: StatusItem) => s.isActive) : [])
      }
      if (motivationRes.ok) {
        const data = await motivationRes.json()
        setMotivations(Array.isArray(data) ? data : [])
      }
      if (tagRes.ok) {
        const data = await tagRes.json()
        setTags(Array.isArray(data) ? data : [])
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

      const token = localStorage.getItem('token')
      const response = await fetch('/api/records', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add New Property</DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="py-4 border-b">
          <div className="flex items-center justify-center">
            {/* Step 1 */}
            <div className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {step > 1 ? <Check className="w-4 h-4" /> : '1'}
              </div>
              <span className={cn("ml-2 text-sm", step >= 1 ? 'text-foreground' : 'text-muted-foreground')}>
                Property
              </span>
            </div>
            
            {/* Line 1-2 */}
            <div className={cn("w-16 h-0.5 mx-2", step > 1 ? 'bg-primary' : 'bg-muted')} />
            
            {/* Step 2 */}
            <div className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {step > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className={cn("ml-2 text-sm", step >= 2 ? 'text-foreground' : 'text-muted-foreground')}>
                Owner
              </span>
            </div>
            
            {/* Line 2-3 */}
            <div className={cn("w-16 h-0.5 mx-2", step > 2 ? 'bg-primary' : 'bg-muted')} />
            
            {/* Step 3 */}
            <div className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                3
              </div>
              <span className={cn("ml-2 text-sm", step >= 3 ? 'text-foreground' : 'text-muted-foreground')}>
                Assignment
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="py-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Property Address */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Search Address</Label>
                <div className="relative mt-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={addressQuery}
                    onChange={(e) => setAddressQuery(e.target.value)}
                    placeholder="Start typing an address..."
                    className="pl-10"
                  />
                  {searchingAddress && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                  
                  {/* Address Dropdown */}
                  {showAddressDropdown && addressResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
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
                            className="w-full px-4 py-2 text-left text-sm hover:bg-accent border-b last:border-0"
                          >
                            {displayAddress || result.display_name}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Select from dropdown or manually enter below
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label>Street</Label>
                  <Input
                    value={formData.propertyStreet}
                    onChange={(e) => updateFormData('propertyStreet', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={formData.propertyCity}
                      onChange={(e) => updateFormData('propertyCity', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      value={formData.propertyState}
                      onChange={(e) => updateFormData('propertyState', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Zip</Label>
                    <Input
                      value={formData.propertyZip}
                      onChange={(e) => updateFormData('propertyZip', e.target.value)}
                      className="mt-1"
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
                <Switch
                  checked={formData.isCompany}
                  onCheckedChange={(checked) => updateFormData('isCompany', checked)}
                />
                <span className="text-sm">This is a company</span>
              </div>

              {/* Owner Name */}
              {formData.isCompany ? (
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={formData.ownerFullName}
                    onChange={(e) => updateFormData('ownerFullName', e.target.value)}
                    className="mt-1"
                  />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <Input
                        value={formData.ownerFirstName}
                        onChange={(e) => updateFormData('ownerFirstName', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Last Name</Label>
                      <Input
                        value={formData.ownerLastName}
                        onChange={(e) => updateFormData('ownerLastName', e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>
                      Full Name / Company Name <span className="text-muted-foreground font-normal">(optional override)</span>
                    </Label>
                    <Input
                      value={formData.ownerFullName}
                      onChange={(e) => updateFormData('ownerFullName', e.target.value)}
                      placeholder={`${formData.ownerFirstName} ${formData.ownerLastName}`.trim() || 'Auto-generated from first + last name'}
                      className="mt-1"
                    />
                  </div>
                </>
              )}

              {/* Mailing Address */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">Mailing Address</h3>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="sameAsProperty"
                      checked={formData.sameAsProperty}
                      onCheckedChange={(checked) => updateFormData('sameAsProperty', !!checked)}
                    />
                    <label htmlFor="sameAsProperty" className="text-sm text-muted-foreground cursor-pointer">Same as property</label>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <Label>Street</Label>
                    <Input
                      value={formData.mailingStreet}
                      onChange={(e) => updateFormData('mailingStreet', e.target.value)}
                      disabled={formData.sameAsProperty}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>City</Label>
                      <Input
                        value={formData.mailingCity}
                        onChange={(e) => updateFormData('mailingCity', e.target.value)}
                        disabled={formData.sameAsProperty}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>State</Label>
                      <Input
                        value={formData.mailingState}
                        onChange={(e) => updateFormData('mailingState', e.target.value)}
                        disabled={formData.sameAsProperty}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Zip</Label>
                      <Input
                        value={formData.mailingZip}
                        onChange={(e) => updateFormData('mailingZip', e.target.value)}
                        disabled={formData.sameAsProperty}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-3">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateFormData('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateFormData('email', e.target.value)}
                      placeholder="owner@example.com"
                      className="mt-1"
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
                  <Label>Status</Label>
                  <Select value={formData.statusId} onValueChange={(value) => updateFormData('statusId', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assign To */}
                <div>
                  <Label>Assign To</Label>
                  <Select value={formData.assignedToId} onValueChange={(value) => updateFormData('assignedToId', value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Lists & Tags + Notes Side by Side */}
              <div className="grid grid-cols-2 gap-4">
                {/* Lists & Tags Box */}
                <div className="border border-gray-200 rounded-lg flex flex-col h-64">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <span className="text-blue-600">—</span>
                    <span className="text-sm font-medium text-blue-600">MOTIVATIONS & TAGS</span>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveListTab('motivations')}
                      className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition ${
                        activeListTab === 'motivations'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Motivations ({formData.motivationIds.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveListTab('tags')}
                      className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition ${
                        activeListTab === 'tags'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Tags ({formData.tagIds.length})
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="p-3 border-b border-gray-100 flex-shrink-0">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={activeListTab === 'motivations' ? motivationSearch : tagSearch}
                        onChange={(e) => {
                          if (activeListTab === 'motivations') {
                            setMotivationSearch(e.target.value)
                          } else {
                            setTagSearch(e.target.value)
                          }
                        }}
                        onFocus={() => setIsListSearchFocused(true)}
                        onBlur={() => setTimeout(() => setIsListSearchFocused(false), 200)}
                        placeholder={`Search ${activeListTab}...`}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <button
                        type="button"
                        className="px-3 py-2 text-blue-600 text-sm font-medium hover:text-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                  
                  {/* Scrollable Content Area - shows either dropdown or selected items */}
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {/* Dropdown - when focused or searching */}
                    {activeListTab === 'motivations' && (isListSearchFocused || motivationSearch) ? (
                      <div className="bg-gray-50">
                        {motivations
                          .filter(m => 
                            m.name.toLowerCase().includes(motivationSearch.toLowerCase()) &&
                            !formData.motivationIds.includes(m.id)
                          )
                          .map((motivation) => (
                            <button
                              key={motivation.id}
                              type="button"
                              onClick={() => {
                                toggleArrayItem('motivationIds', motivation.id)
                                setMotivationSearch('')
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-100 last:border-0"
                            >
                              {motivation.name}
                            </button>
                          ))}
                        {motivations.filter(m => 
                          m.name.toLowerCase().includes(motivationSearch.toLowerCase()) &&
                          !formData.motivationIds.includes(m.id)
                        ).length === 0 && (
                          <div className="px-4 py-2 text-sm text-gray-500">No matching motivations</div>
                        )}
                      </div>
                    ) : activeListTab === 'tags' && (isListSearchFocused || tagSearch) ? (
                      <div className="bg-gray-50">
                        {tags
                          .filter(t => 
                            t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
                            !formData.tagIds.includes(t.id)
                          )
                          .map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => {
                                toggleArrayItem('tagIds', tag.id)
                                setTagSearch('')
                              }}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-100 last:border-0"
                            >
                              {tag.name}
                            </button>
                          ))}
                        {tags.filter(t => 
                          t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
                          !formData.tagIds.includes(t.id)
                        ).length === 0 && (
                          <div className="px-4 py-2 text-sm text-gray-500">No matching tags</div>
                        )}
                      </div>
                    ) : (
                      /* Selected Items List - when not searching */
                      activeListTab === 'motivations' ? (
                        <>
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
                          {formData.motivationIds.length === 0 && (
                            <div className="px-4 py-6 text-center text-sm text-gray-400">
                              No motivations selected
                            </div>
                          )}
                        </>
                      ) : (
                        <>
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
                          {formData.tagIds.length === 0 && (
                            <div className="px-4 py-6 text-center text-sm text-gray-400">
                              No tags selected
                            </div>
                          )}
                        </>
                      )
                    )}
                  </div>
                </div>

                {/* Notes Box */}
                <div className="border rounded-lg overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted">
                    <span className="text-primary">—</span>
                    <span className="text-sm font-medium text-primary">NOTES</span>
                  </div>
                  
                  {/* Notes Textarea */}
                  <div className="p-3">
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => updateFormData('notes', e.target.value)}
                      rows={8}
                      placeholder="Add any notes about this property..."
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          
          <div className="flex items-center gap-3">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {submitting ? 'Creating...' : 'Create Property'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
