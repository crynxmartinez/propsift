'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { X, Loader2, Check, Upload, FileText, AlertCircle, GripVertical, Search } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface BulkImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface MotivationItem {
  id: string
  name: string
}

interface TagItem {
  id: string
  name: string
}

interface FieldMapping {
  csvColumn: string
  systemField: string
}

interface ImportState {
  // Step 1
  importType: 'add' | 'update'
  importOption: 'new_motivation' | 'existing_motivation' | 'property_address' | 'mailing_address'
  
  // Step 2
  motivationIds: string[]
  tagIds: string[]
  
  // Step 3
  csvFile: File | null
  csvData: string[][]
  csvHeaders: string[]
  rowCount: number
  
  // Step 4
  fieldMapping: Record<string, string> // systemField -> csvColumn
}

const initialState: ImportState = {
  importType: 'add',
  importOption: 'new_motivation',
  motivationIds: [],
  tagIds: [],
  csvFile: null,
  csvData: [],
  csvHeaders: [],
  rowCount: 0,
  fieldMapping: {},
}

const SYSTEM_FIELDS = [
  // Property Address
  { key: 'propertyStreet', label: 'Property Street', group: 'property' },
  { key: 'propertyCity', label: 'Property City', group: 'property' },
  { key: 'propertyState', label: 'Property State', group: 'property' },
  { key: 'propertyZip', label: 'Property ZIP', group: 'property' },
  // Mailing Address
  { key: 'mailingStreet', label: 'Mailing Street', group: 'mailing' },
  { key: 'mailingCity', label: 'Mailing City', group: 'mailing' },
  { key: 'mailingState', label: 'Mailing State', group: 'mailing' },
  { key: 'mailingZip', label: 'Mailing ZIP', group: 'mailing' },
  // Owner Info
  { key: 'ownerFirstName', label: 'Owner First Name', group: 'owner' },
  { key: 'ownerLastName', label: 'Owner Last Name', group: 'owner' },
  { key: 'ownerFullName', label: 'Owner Full Name', group: 'owner' },
  // Phone fields (max 15)
  { key: 'phone1', label: 'Phone 1', group: 'phone' },
  { key: 'phone2', label: 'Phone 2', group: 'phone' },
  { key: 'phone3', label: 'Phone 3', group: 'phone' },
  { key: 'phone4', label: 'Phone 4', group: 'phone' },
  { key: 'phone5', label: 'Phone 5', group: 'phone' },
  { key: 'phone6', label: 'Phone 6', group: 'phone' },
  { key: 'phone7', label: 'Phone 7', group: 'phone' },
  { key: 'phone8', label: 'Phone 8', group: 'phone' },
  { key: 'phone9', label: 'Phone 9', group: 'phone' },
  { key: 'phone10', label: 'Phone 10', group: 'phone' },
  { key: 'phone11', label: 'Phone 11', group: 'phone' },
  { key: 'phone12', label: 'Phone 12', group: 'phone' },
  { key: 'phone13', label: 'Phone 13', group: 'phone' },
  { key: 'phone14', label: 'Phone 14', group: 'phone' },
  { key: 'phone15', label: 'Phone 15', group: 'phone' },
  // Email fields (max 5)
  { key: 'email1', label: 'Email 1', group: 'email' },
  { key: 'email2', label: 'Email 2', group: 'email' },
  { key: 'email3', label: 'Email 3', group: 'email' },
  { key: 'email4', label: 'Email 4', group: 'email' },
  { key: 'email5', label: 'Email 5', group: 'email' },
  // Attempts
  { key: 'callAttempts', label: 'Call Attempts', group: 'attempts' },
  { key: 'directMailAttempts', label: 'Direct Mail Attempts', group: 'attempts' },
  { key: 'smsAttempts', label: 'SMS Attempts', group: 'attempts' },
  { key: 'rvmAttempts', label: 'RVM Attempts', group: 'attempts' },
  // Property Details
  { key: 'estimatedValue', label: 'Estimated Value', group: 'details' },
  { key: 'bedrooms', label: 'Bedrooms', group: 'details' },
  { key: 'bathrooms', label: 'Bathrooms', group: 'details' },
  { key: 'sqft', label: 'Sqft', group: 'details' },
  { key: 'lotSize', label: 'Lot Size', group: 'details' },
  { key: 'yearBuilt', label: 'Year Built', group: 'details' },
  { key: 'structureType', label: 'Structure Type', group: 'details' },
  { key: 'heatingType', label: 'Heating Type', group: 'details' },
  { key: 'airConditioner', label: 'Air Conditioner', group: 'details' },
  // Other
  { key: 'notes', label: 'Notes', group: 'other' },
  { key: 'description', label: 'Description', group: 'other' },
  { key: 'temperature', label: 'Temperature', group: 'other' },
]

const GROUP_LABELS: Record<string, string> = {
  property: 'Property Address',
  mailing: 'Mailing Address',
  owner: 'Owner Info',
  phone: 'Phone Numbers',
  email: 'Email Addresses',
  attempts: 'Attempts',
  details: 'Property Details',
  other: 'Other',
  custom: 'Custom Fields',
}

interface CustomField {
  id: string
  name: string
  fieldType: string
}

export default function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const { showToast } = useToast()
  const [step, setStep] = useState(1)
  const [state, setState] = useState<ImportState>(initialState)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  
  // Data fetching
  const [motivations, setMotivations] = useState<MotivationItem[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  
  // Search states for Step 2
  const [motivationSearch, setMotivationSearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [activeListTab, setActiveListTab] = useState<'motivations' | 'tags'>('motivations')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [creatingMotivation, setCreatingMotivation] = useState(false)
  const [creatingTag, setCreatingTag] = useState(false)
  
  // Search state for Step 4 (field mapping)
  const [fieldSearch, setFieldSearch] = useState('')
  
  // Drag state for field mapping
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Drag and drop state for CSV upload
  const [isDragging, setIsDragging] = useState(false)

  // Fetch motivations, tags, and custom fields
  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      
      fetch('/api/motivations', { headers })
        .then(res => res.json())
        .then(data => Array.isArray(data) ? setMotivations(data) : setMotivations([]))
        .catch(console.error)
      
      fetch('/api/tags', { headers })
        .then(res => res.json())
        .then(data => Array.isArray(data) ? setTags(data) : setTags([]))
        .catch(console.error)
      
      fetch('/api/custom-fields', { headers })
        .then(res => res.json())
        .then(data => Array.isArray(data) ? setCustomFields(data) : setCustomFields([]))
        .catch(console.error)
    }
  }, [isOpen])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1)
      setState(initialState)
      setMotivationSearch('')
      setTagSearch('')
      setActiveListTab('motivations')
      setFieldSearch('')
      setDraggedColumn(null)
      setIsDropdownOpen(false)
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-dropdown-container]')) {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isDropdownOpen])

  // Combine system fields with custom fields
  const allSystemFields = useMemo(() => {
    const fields = [...SYSTEM_FIELDS]
    customFields.forEach(cf => {
      fields.push({
        key: `custom_${cf.id}`,
        label: cf.name,
        group: 'custom'
      })
    })
    return fields
  }, [customFields])

  // Get all unique groups in order
  const fieldGroups = useMemo(() => {
    const groups: string[] = []
    allSystemFields.forEach(field => {
      if (!groups.includes(field.group)) {
        groups.push(field.group)
      }
    })
    return groups
  }, [allSystemFields])

  // Filter fields by search
  const filteredFields = useMemo(() => {
    if (!fieldSearch.trim()) return allSystemFields
    const search = fieldSearch.toLowerCase()
    return allSystemFields.filter(field => 
      field.label.toLowerCase().includes(search) ||
      field.group.toLowerCase().includes(search) ||
      GROUP_LABELS[field.group]?.toLowerCase().includes(search)
    )
  }, [allSystemFields, fieldSearch])

  // Get mapped CSV columns (to show which ones are already used)
  const mappedColumns = useMemo(() => {
    return new Set(Object.values(state.fieldMapping))
  }, [state.fieldMapping])

  // reverseMapping is not needed - fieldMapping is already systemField -> csvColumn
  // Just use state.fieldMapping directly for the right side display

  // Get required fields based on import type and option
  const getRequiredFields = useCallback(() => {
    if (state.importType === 'update' && state.importOption === 'mailing_address') {
      return ['mailingStreet', 'mailingCity', 'mailingState', 'mailingZip']
    }
    return ['propertyStreet', 'propertyCity', 'propertyState', 'propertyZip']
  }, [state.importType, state.importOption])

  // Check if all required fields are mapped
  const areRequiredFieldsMapped = useCallback(() => {
    const required = getRequiredFields()
    return required.every(field => state.fieldMapping[field])
  }, [getRequiredFields, state.fieldMapping])

  // Toggle array item (for motivations/tags)
  const toggleArrayItem = (field: 'motivationIds' | 'tagIds', id: string) => {
    setState(prev => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter(i => i !== id)
        : [...prev[field], id]
    }))
  }

  // Create new motivation
  const createMotivation = async (name: string) => {
    if (!name.trim()) return
    setCreatingMotivation(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/motivations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        const newMotivation = await res.json()
        setMotivations(prev => [...prev, newMotivation])
        toggleArrayItem('motivationIds', newMotivation.id)
        setMotivationSearch('')
        setIsDropdownOpen(false)
      }
    } catch (error) {
      console.error('Error creating motivation:', error)
    } finally {
      setCreatingMotivation(false)
    }
  }

  // Create new tag
  const createTag = async (name: string) => {
    if (!name.trim()) return
    setCreatingTag(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        const newTag = await res.json()
        setTags(prev => [...prev, newTag])
        toggleArrayItem('tagIds', newTag.id)
        setTagSearch('')
        setIsDropdownOpen(false)
      }
    } catch (error) {
      console.error('Error creating tag:', error)
    } finally {
      setCreatingTag(false)
    }
  }

  // Parse CSV file
  const parseCSV = (text: string): { headers: string[], data: string[][] } => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) return { headers: [], data: [] }
    
    const parseRow = (row: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }
    
    const headers = parseRow(lines[0])
    const data = lines.slice(1).map(parseRow)
    
    return { headers, data }
  }

  // Handle file upload
  const handleFileUpload = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      showToast('Please upload a CSV file', 'error')
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const { headers, data } = parseCSV(text)
      
      // Auto-map fields based on column names
      const autoMapping: Record<string, string> = {}
      const usedHeaders = new Set<string>()
      
      headers.forEach(header => {
        const normalizedHeader = header.toLowerCase().replace(/[_\s-]/g, '')
        
        // Find best match for this header
        let bestMatchKey: string | null = null
        let bestMatchScore = 0
        
        SYSTEM_FIELDS.forEach(field => {
          const normalizedField = field.key.toLowerCase()
          const normalizedLabel = field.label.toLowerCase().replace(/[_\s-]/g, '')
          
          let score = 0
          
          // Exact match gets highest score
          if (normalizedHeader === normalizedField || normalizedHeader === normalizedLabel) {
            score = 100
          }
          // For numbered fields (phone1-15, email1-5), require exact number match
          else if (/^(phone|email)\d+$/.test(normalizedField)) {
            const fieldNum = normalizedField.match(/\d+$/)?.[0]
            const headerNum = normalizedHeader.match(/\d+$/)?.[0]
            if (fieldNum && headerNum && fieldNum === headerNum) {
              const fieldBase = normalizedField.replace(/\d+$/, '')
              const headerBase = normalizedHeader.replace(/\d+$/, '')
              if (headerBase.includes(fieldBase) || fieldBase.includes(headerBase)) {
                score = 90
              }
            }
          }
          
          if (score > 0 && score > bestMatchScore) {
            bestMatchKey = field.key
            bestMatchScore = score
          }
        })
        
        if (bestMatchKey && !autoMapping[bestMatchKey] && !usedHeaders.has(header)) {
          autoMapping[bestMatchKey] = header
          usedHeaders.add(header)
        }
        
        // Special mappings for address fields
        if (!usedHeaders.has(header)) {
          if (normalizedHeader.includes('propertyaddress') || normalizedHeader === 'property_address') {
            if (!autoMapping['propertyStreet']) {
              autoMapping['propertyStreet'] = header
              usedHeaders.add(header)
            }
          }
          if (normalizedHeader.includes('mailingaddress') || normalizedHeader === 'mailing_address') {
            if (!autoMapping['mailingStreet']) {
              autoMapping['mailingStreet'] = header
              usedHeaders.add(header)
            }
          }
          // Map full_name/company_name/owner_company to ownerFullName
          if (normalizedHeader === 'fullname' || normalizedHeader === 'companyname' || 
              normalizedHeader === 'ownercompany' || normalizedHeader === 'ownerfullname' ||
              normalizedHeader === 'owner_company' || normalizedHeader === 'full_name' ||
              normalizedHeader === 'company_name' || normalizedHeader === 'owner_full_name') {
            if (!autoMapping['ownerFullName']) {
              autoMapping['ownerFullName'] = header
              usedHeaders.add(header)
            }
          }
        }
      })
      
      setState(prev => ({
        ...prev,
        csvFile: file,
        csvHeaders: headers,
        csvData: data,
        rowCount: data.length,
        fieldMapping: autoMapping,
      }))
    }
    reader.readAsText(file)
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }

  // Handle import - now runs in background
  const handleImport = async () => {
    setImporting(true)
    
    try {
      // 1. Create activity log entry first
      const activityRes = await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'upload',
          action: 'bulk_import',
          filename: state.csvFile?.name || 'Unknown file',
          description: `${state.importType === 'add' ? 'Add new properties' : 'Update existing'} - ${state.importOption}`,
          total: state.rowCount,
          metadata: {
            importType: state.importType,
            importOption: state.importOption,
            motivationIds: state.motivationIds,
            tagIds: state.tagIds,
          },
        }),
      })
      
      if (!activityRes.ok) {
        throw new Error('Failed to create activity log')
      }
      
      const activity = await activityRes.json()
      
      // 2. Close modal immediately and show toast
      onClose()
      showToast('Upload started! View progress in Activity > Upload', 'success', 5000)
      
      // 3. Start background import (fire and forget)
      // API handles activity log updates internally
      const token = localStorage.getItem('token')
      fetch('/api/records/bulk-import', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          activityId: activity.id,
          importType: state.importType,
          importOption: state.importOption,
          motivationIds: state.motivationIds,
          tagIds: state.tagIds,
          fieldMapping: state.fieldMapping,
          csvHeaders: state.csvHeaders,
          csvData: state.csvData,
        }),
      }).then(() => {
        onSuccess()
      }).catch((error) => {
        console.error('Import error:', error)
      })
      
    } catch (error) {
      console.error('Import error:', error)
      showToast('Failed to start import. Please try again.', 'error')
    } finally {
      setImporting(false)
    }
  }

  // Navigation
  const canProceed = () => {
    switch (step) {
      case 1:
        return state.importType && state.importOption
      case 2:
        // Motivation is required when "existing_motivation" option is selected
        if (state.importOption === 'existing_motivation') {
          return state.motivationIds.length > 0
        }
        return true // Otherwise motivations/tags are optional
      case 3:
        return state.csvFile && state.rowCount > 0
      case 4:
        return areRequiredFieldsMapped()
      case 5:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceed() && step < 5) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleClose = () => {
    if (!importing) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Bulk Import Properties</h2>
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
                Import Type
              </span>
            </div>
            
            {/* Line 1-2 */}
            <div className={`w-12 h-0.5 mx-2 ${step > 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            
            {/* Step 2 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > 2 ? <Check className="w-4 h-4" /> : '2'}
              </div>
              <span className={`ml-2 text-sm ${step >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>
                Motivations
              </span>
            </div>
            
            {/* Line 2-3 */}
            <div className={`w-12 h-0.5 mx-2 ${step > 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            
            {/* Step 3 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > 3 ? <Check className="w-4 h-4" /> : '3'}
              </div>
              <span className={`ml-2 text-sm ${step >= 3 ? 'text-gray-900' : 'text-gray-500'}`}>
                Upload
              </span>
            </div>
            
            {/* Line 3-4 */}
            <div className={`w-12 h-0.5 mx-2 ${step > 3 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            
            {/* Step 4 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > 4 ? <Check className="w-4 h-4" /> : '4'}
              </div>
              <span className={`ml-2 text-sm ${step >= 4 ? 'text-gray-900' : 'text-gray-500'}`}>
                Map Fields
              </span>
            </div>
            
            {/* Line 4-5 */}
            <div className={`w-12 h-0.5 mx-2 ${step > 4 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            
            {/* Step 5 */}
            <div className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 5 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                5
              </div>
              <span className={`ml-2 text-sm ${step >= 5 ? 'text-gray-900' : 'text-gray-500'}`}>
                Review
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 overflow-y-auto flex-1">
          {/* Step 1: Import Type */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What would you like to do?
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setState(prev => ({ 
                      ...prev, 
                      importType: 'add',
                      importOption: 'new_motivation'
                    }))}
                    className={`flex-1 p-4 border-2 rounded-lg text-center transition ${
                      state.importType === 'add'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">Add Data</div>
                    <div className="text-sm text-gray-500 mt-1">Import new records</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setState(prev => ({ 
                      ...prev, 
                      importType: 'update',
                      importOption: 'property_address'
                    }))}
                    className={`flex-1 p-4 border-2 rounded-lg text-center transition ${
                      state.importType === 'update'
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">Update Data</div>
                    <div className="text-sm text-gray-500 mt-1">Update existing records</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select an option
                </label>
                <select
                  value={state.importOption}
                  onChange={(e) => setState(prev => ({ 
                    ...prev, 
                    importOption: e.target.value as ImportState['importOption']
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  {state.importType === 'add' ? (
                    <>
                      <option value="new_motivation">Upload new list to a motivation</option>
                      <option value="existing_motivation">Upload new list to an existing motivation</option>
                    </>
                  ) : (
                    <>
                      <option value="property_address">Update records using Property Address</option>
                      <option value="mailing_address">Update records using Mailing Address</option>
                    </>
                  )}
                </select>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    {state.importType === 'add' ? (
                      <>
                        <strong>Add Data:</strong> New records will be created. If a record with the same property address already exists, it will be overwritten with the new data.
                      </>
                    ) : (
                      <>
                        <strong>Update Data:</strong> Only existing records will be updated. Only non-empty fields from the CSV will overwrite existing data. Records not found will be skipped.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Motivations & Tags */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Select motivations and tags to apply to all imported records.
                {state.importOption === 'existing_motivation' && (
                  <span className="text-red-600 font-medium"> At least one motivation is required.</span>
                )}
              </p>
              
              {/* Motivations & Tags Box */}
              <div className="border border-gray-200 rounded-lg flex flex-col h-72">
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
                    Motivations ({state.motivationIds.length})
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
                    Tags ({state.tagIds.length})
                  </button>
                </div>

                {/* Search Input */}
                <div className="p-3 border-b border-gray-100 flex-shrink-0" data-dropdown-container>
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
                      onFocus={() => setIsDropdownOpen(true)}
                      placeholder={`Search ${activeListTab}...`}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>
                
                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto min-h-0" data-dropdown-container>
                  {/* Dropdown - when focused or searching */}
                  {activeListTab === 'motivations' && isDropdownOpen ? (
                    <div className="bg-gray-50">
                      {motivations
                        .filter(m => 
                          m.name.toLowerCase().includes(motivationSearch.toLowerCase()) &&
                          !state.motivationIds.includes(m.id)
                        )
                        .map((motivation) => (
                          <button
                            key={motivation.id}
                            type="button"
                            onClick={() => {
                              toggleArrayItem('motivationIds', motivation.id)
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-100 last:border-0"
                          >
                            {motivation.name}
                          </button>
                        ))}
                      {motivations.filter(m => 
                        m.name.toLowerCase().includes(motivationSearch.toLowerCase()) &&
                        !state.motivationIds.includes(m.id)
                      ).length === 0 && !motivationSearch.trim() && (
                        <div className="px-4 py-2 text-sm text-gray-500">No motivations available</div>
                      )}
                      {/* Create new motivation button */}
                      {motivationSearch.trim() && !motivations.some(m => m.name.toLowerCase() === motivationSearch.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => createMotivation(motivationSearch)}
                          disabled={creatingMotivation}
                          className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-200 flex items-center gap-2"
                        >
                          {creatingMotivation ? (
                            <span className="animate-spin">⏳</span>
                          ) : (
                            <span>+</span>
                          )}
                          Create "{motivationSearch.trim()}"
                        </button>
                      )}
                    </div>
                  ) : activeListTab === 'tags' && isDropdownOpen ? (
                    <div className="bg-gray-50">
                      {tags
                        .filter(t => 
                          t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
                          !state.tagIds.includes(t.id)
                        )
                        .map((tag) => (
                          <button
                            key={tag.id}
                            type="button"
                            onClick={() => {
                              toggleArrayItem('tagIds', tag.id)
                            }}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-100 last:border-0"
                          >
                            {tag.name}
                          </button>
                        ))}
                      {tags.filter(t => 
                        t.name.toLowerCase().includes(tagSearch.toLowerCase()) &&
                        !state.tagIds.includes(t.id)
                      ).length === 0 && !tagSearch.trim() && (
                        <div className="px-4 py-2 text-sm text-gray-500">No tags available</div>
                      )}
                      {/* Create new tag button */}
                      {tagSearch.trim() && !tags.some(t => t.name.toLowerCase() === tagSearch.toLowerCase()) && (
                        <button
                          type="button"
                          onClick={() => createTag(tagSearch)}
                          disabled={creatingTag}
                          className="w-full px-4 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 border-t border-gray-200 flex items-center gap-2"
                        >
                          {creatingTag ? (
                            <span className="animate-spin">⏳</span>
                          ) : (
                            <span>+</span>
                          )}
                          Create "{tagSearch.trim()}"
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Selected Items List - when not searching */
                    activeListTab === 'motivations' ? (
                      <>
                        {state.motivationIds.map((id) => {
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
                        {state.motivationIds.length === 0 && (
                          <div className="px-4 py-6 text-center text-sm text-gray-400">
                            No motivations selected
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {state.tagIds.map((id) => {
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
                        {state.tagIds.length === 0 && (
                          <div className="px-4 py-6 text-center text-sm text-gray-400">
                            No tags selected
                          </div>
                        )}
                      </>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Upload CSV */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Upload a CSV file containing your property data.
              </p>
              
              {!state.csvFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center transition ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    Drag and drop your CSV file here
                  </p>
                  <p className="text-gray-400 text-sm mb-4">or</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Browse Files
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file)
                    }}
                    className="hidden"
                  />
                  <p className="text-gray-400 text-xs mt-4">
                    Accepted format: .csv
                  </p>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FileText className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{state.csvFile.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {state.rowCount} rows detected • {state.csvHeaders.length} columns
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setState(prev => ({
                            ...prev,
                            csvFile: null,
                            csvData: [],
                            csvHeaders: [],
                            rowCount: 0,
                            fieldMapping: {},
                          }))
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 mt-2 font-medium"
                      >
                        REUPLOAD FILE
                      </button>
                    </div>
                  </div>
                  
                  {/* Preview first few columns */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2">Columns detected:</p>
                    <div className="flex flex-wrap gap-2">
                      {state.csvHeaders.slice(0, 10).map((header, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                          {header}
                        </span>
                      ))}
                      {state.csvHeaders.length > 10 && (
                        <span className="px-2 py-1 text-xs text-gray-400">
                          +{state.csvHeaders.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Map Fields */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-2">
                Drag CSV columns from the left and drop them onto system fields on the right.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Left: CSV Columns (Draggable) */}
                <div className="border border-gray-200 rounded-lg flex flex-col h-96">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">CSV Columns</span>
                      <span className="text-xs text-gray-400">({state.csvHeaders.length - mappedColumns.size} remaining)</span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {state.csvHeaders
                      .filter(header => !mappedColumns.has(header))
                      .map((header) => {
                        const originalIndex = state.csvHeaders.indexOf(header)
                        const sampleValue = state.csvData[0]?.[originalIndex] || ''
                        
                        return (
                          <div
                            key={header}
                            draggable
                            onDragStart={(e) => {
                              setDraggedColumn(header)
                              e.dataTransfer.setData('text/plain', header)
                              e.dataTransfer.effectAllowed = 'move'
                            }}
                            onDragEnd={() => setDraggedColumn(null)}
                            className={`px-3 py-2 rounded-lg border transition-all ${
                              draggedColumn === header
                                ? 'bg-blue-50 border-blue-300 shadow-md'
                                : 'bg-white border-gray-200 hover:border-gray-300 cursor-grab active:cursor-grabbing'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 truncate">{header}</div>
                                <div className="text-xs text-gray-500 truncate">{sampleValue || '(empty)'}</div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    {mappedColumns.size === state.csvHeaders.length && (
                      <div className="text-center text-sm text-gray-500 py-4">
                        All columns mapped
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: System Fields (Drop Zones) */}
                <div className="border border-gray-200 rounded-lg flex flex-col h-96">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-gray-700">System Fields</span>
                    </div>
                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={fieldSearch}
                        onChange={(e) => setFieldSearch(e.target.value)}
                        placeholder="Search fields..."
                        className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {fieldGroups.map(group => {
                      const groupFields = filteredFields.filter(f => f.group === group)
                      if (groupFields.length === 0) return null
                      
                      return (
                        <div key={group} className="mb-3">
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 py-1 sticky top-0 bg-white">
                            {GROUP_LABELS[group] || group}
                          </div>
                          <div className="space-y-1">
                            {groupFields.map((field) => {
                              const isRequired = getRequiredFields().includes(field.key)
                              const mappedFrom = state.fieldMapping[field.key]
                              
                              return (
                                <div
                                  key={field.key}
                                  onDragOver={(e) => {
                                    e.preventDefault()
                                    e.dataTransfer.dropEffect = 'move'
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault()
                                    const csvColumn = e.dataTransfer.getData('text/plain')
                                    if (csvColumn) {
                                      setState(prev => {
                                        const newMapping = { ...prev.fieldMapping }
                                        // Remove old mapping for this CSV column if exists
                                        Object.keys(newMapping).forEach(key => {
                                          if (newMapping[key] === csvColumn) {
                                            delete newMapping[key]
                                          }
                                        })
                                        // Add new mapping
                                        newMapping[field.key] = csvColumn
                                        return { ...prev, fieldMapping: newMapping }
                                      })
                                    }
                                    setDraggedColumn(null)
                                  }}
                                  className={`px-3 py-2 rounded-lg border-2 border-dashed transition-all ${
                                    mappedFrom 
                                      ? 'bg-green-50 border-green-300 border-solid' 
                                      : draggedColumn
                                        ? 'border-blue-300 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm text-gray-900">{field.label}</span>
                                        {isRequired && (
                                          <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded">
                                            Required
                                          </span>
                                        )}
                                      </div>
                                      {mappedFrom ? (
                                        <div className="text-xs text-green-600 mt-0.5 flex items-center gap-1">
                                          <Check className="w-3 h-3" />
                                          {mappedFrom}
                                        </div>
                                      ) : (
                                        <div className="text-xs text-gray-400 mt-0.5">
                                          Drop CSV column here
                                        </div>
                                      )}
                                    </div>
                                    {mappedFrom && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setState(prev => {
                                            const newMapping = { ...prev.fieldMapping }
                                            delete newMapping[field.key]
                                            return { ...prev, fieldMapping: newMapping }
                                          })
                                        }}
                                        className="text-gray-400 hover:text-gray-600 p-1"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Mapping Summary */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {Object.keys(state.fieldMapping).length} of {state.csvHeaders.length} columns mapped
                </span>
                {Object.keys(state.fieldMapping).length > 0 && (
                  <button
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, fieldMapping: {} }))}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Clear all mappings
                  </button>
                )}
              </div>

              {!areRequiredFieldsMapped() && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      Please map all required fields before proceeding.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4">Import Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Import Type:</span>
                    <span className="text-gray-900 font-medium">
                      {state.importType === 'add' ? 'Add Data' : 'Update Data'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Option:</span>
                    <span className="text-gray-900 font-medium">
                      {state.importOption === 'new_motivation' && 'Upload new list to a motivation'}
                      {state.importOption === 'existing_motivation' && 'Upload new list to an existing motivation'}
                      {state.importOption === 'property_address' && 'Update using Property Address'}
                      {state.importOption === 'mailing_address' && 'Update using Mailing Address'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Motivations:</span>
                    <span className="text-gray-900 font-medium">
                      {state.motivationIds.length > 0
                        ? state.motivationIds.map(id => motivations.find(m => m.id === id)?.name).join(', ')
                        : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tags:</span>
                    <span className="text-gray-900 font-medium">
                      {state.tagIds.length > 0
                        ? state.tagIds.map(id => tags.find(t => t.id === id)?.name).join(', ')
                        : 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">File:</span>
                    <span className="text-gray-900 font-medium">{state.csvFile?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Records:</span>
                    <span className="text-gray-900 font-medium">{state.rowCount}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 mb-4">Field Mapping</h3>
                <div className="space-y-2">
                  {Object.entries(state.fieldMapping).map(([systemField, csvColumn]) => (
                    <div key={systemField} className="flex items-center text-sm">
                      <span className="text-gray-500 w-40">{csvColumn}</span>
                      <span className="text-gray-400 mx-2">→</span>
                      <span className="text-gray-900 font-medium">
                        {SYSTEM_FIELDS.find(f => f.key === systemField)?.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            type="button"
            onClick={step === 1 ? handleClose : handleBack}
            disabled={importing}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          
          {step < 5 ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Next Step →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${state.rowCount} Records`
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
