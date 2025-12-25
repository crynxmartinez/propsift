'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  X, 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  Trash2,
  Save,
  FolderOpen,
  RotateCcw
} from 'lucide-react'

// Types
export interface FilterBlock {
  id: string
  field: string
  fieldLabel: string
  fieldType: 'select' | 'multiselect' | 'text' | 'number' | 'date' | 'boolean' | 'user'
  operator: string
  value: string | string[] | number | boolean | null
  connector: 'AND' | 'OR'
}

export interface FilterPreset {
  id: string
  name: string
  filters: FilterBlock[]
  isShared: boolean
}

interface FilterCategory {
  name: string
  fields: FilterField[]
}

interface FilterField {
  key: string
  label: string
  type: 'select' | 'multiselect' | 'text' | 'number' | 'date' | 'boolean' | 'user'
  category: string
  options?: { id: string; name: string; color?: string }[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onApply: (filters: FilterBlock[]) => void
  tags: { id: string; name: string }[]
  motivations: { id: string; name: string }[]
  statuses: { id: string; name: string; color: string }[]
  users: { id: string; name: string | null; email: string }[]
  customFields?: { id: string; name: string; type: string }[]
}

// Operators by field type
const OPERATORS: Record<string, { value: string; label: string }[]> = {
  select: [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  multiselect: [
    { value: 'contains_any', label: 'contains any of' },
    { value: 'contains_all', label: 'contains all of' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  text: [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'neq', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
    { value: 'between', label: 'between' },
    { value: 'is_empty', label: 'is empty' },
  ],
  date: [
    { value: 'is', label: 'is' },
    { value: 'is_before', label: 'is before' },
    { value: 'is_after', label: 'is after' },
    { value: 'is_between', label: 'is between' },
    { value: 'in_last', label: 'in the last' },
    { value: 'is_empty', label: 'is empty' },
    { value: 'is_not_empty', label: 'is not empty' },
  ],
  boolean: [
    { value: 'is_true', label: 'is true' },
    { value: 'is_false', label: 'is false' },
  ],
  user: [
    { value: 'is', label: 'is' },
    { value: 'is_not', label: 'is not' },
    { value: 'is_any_of', label: 'is any of' },
    { value: 'is_me', label: 'is me' },
    { value: 'is_empty', label: 'is unassigned' },
    { value: 'is_not_empty', label: 'is assigned' },
  ],
}

export default function RecordFilterPanel({
  isOpen,
  onClose,
  onApply,
  tags,
  motivations,
  statuses,
  users,
  customFields = [],
}: Props) {
  const [filters, setFilters] = useState<FilterBlock[]>([])
  const [showFieldSelector, setShowFieldSelector] = useState(false)
  const [fieldSearch, setFieldSearch] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['GENERAL']))
  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [showPresets, setShowPresets] = useState(false)
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [resultCount, setResultCount] = useState<number | null>(null)

  // Build filter categories
  const filterCategories: FilterCategory[] = [
    {
      name: 'GENERAL',
      fields: [
        { key: 'status', label: 'Status', type: 'multiselect', category: 'GENERAL', options: statuses },
        { key: 'tags', label: 'Tags', type: 'multiselect', category: 'GENERAL', options: tags },
        { key: 'motivations', label: 'Motivations', type: 'multiselect', category: 'GENERAL', options: motivations },
        { key: 'assignedTo', label: 'Assigned To', type: 'user', category: 'GENERAL', options: users.map(u => ({ id: u.id, name: u.name || u.email })) },
        { key: 'isComplete', label: 'Completion Status', type: 'boolean', category: 'GENERAL' },
      ],
    },
    {
      name: 'PROPERTY',
      fields: [
        { key: 'propertyStreet', label: 'Property Street', type: 'text', category: 'PROPERTY' },
        { key: 'propertyCity', label: 'Property City', type: 'text', category: 'PROPERTY' },
        { key: 'propertyState', label: 'Property State', type: 'text', category: 'PROPERTY' },
        { key: 'propertyZip', label: 'Property ZIP', type: 'text', category: 'PROPERTY' },
      ],
    },
    {
      name: 'OWNER',
      fields: [
        { key: 'ownerFullName', label: 'Owner Name', type: 'text', category: 'OWNER' },
        { key: 'mailingStreet', label: 'Mailing Street', type: 'text', category: 'OWNER' },
        { key: 'mailingCity', label: 'Mailing City', type: 'text', category: 'OWNER' },
        { key: 'mailingState', label: 'Mailing State', type: 'text', category: 'OWNER' },
        { key: 'mailingZip', label: 'Mailing ZIP', type: 'text', category: 'OWNER' },
        { key: 'isCompany', label: 'Is Company', type: 'boolean', category: 'OWNER' },
      ],
    },
    {
      name: 'CONTACT',
      fields: [
        { key: 'hasPhone', label: 'Has Phone', type: 'boolean', category: 'CONTACT' },
        { key: 'hasEmail', label: 'Has Email', type: 'boolean', category: 'CONTACT' },
        { key: 'phoneCount', label: 'Phone Count', type: 'number', category: 'CONTACT' },
        { key: 'emailCount', label: 'Email Count', type: 'number', category: 'CONTACT' },
      ],
    },
    {
      name: 'DATES',
      fields: [
        { key: 'createdAt', label: 'Created Date', type: 'date', category: 'DATES' },
        { key: 'updatedAt', label: 'Updated Date', type: 'date', category: 'DATES' },
        { key: 'skiptraceDate', label: 'Skip Trace Date', type: 'date', category: 'DATES' },
      ],
    },
    {
      name: 'TASKS',
      fields: [
        { key: 'hasOpenTasks', label: 'Has Open Tasks', type: 'boolean', category: 'TASKS' },
        { key: 'hasOverdueTasks', label: 'Has Overdue Tasks', type: 'boolean', category: 'TASKS' },
        { key: 'taskCount', label: 'Task Count', type: 'number', category: 'TASKS' },
        { key: 'taskAssignedTo', label: 'Task Assigned To', type: 'user', category: 'TASKS', options: users.map(u => ({ id: u.id, name: u.name || u.email })) },
      ],
    },
  ]

  // Add custom fields category if any exist
  if (customFields.length > 0) {
    filterCategories.push({
      name: 'CUSTOM FIELDS',
      fields: customFields.map(cf => ({
        key: `custom_${cf.id}`,
        label: cf.name,
        type: cf.type === 'number' ? 'number' : cf.type === 'date' ? 'date' : 'text',
        category: 'CUSTOM FIELDS',
      })),
    })
  }

  // Get all fields flat
  const allFields = filterCategories.flatMap(c => c.fields)

  // Filter fields by search
  const filteredCategories = filterCategories.map(cat => ({
    ...cat,
    fields: cat.fields.filter(f => 
      f.label.toLowerCase().includes(fieldSearch.toLowerCase())
    ),
  })).filter(cat => cat.fields.length > 0)

  // Add a new filter block
  const addFilterBlock = (field: FilterField) => {
    const defaultOperator = OPERATORS[field.type][0].value
    const newFilter: FilterBlock = {
      id: `filter_${Date.now()}`,
      field: field.key,
      fieldLabel: field.label,
      fieldType: field.type,
      operator: defaultOperator,
      value: field.type === 'multiselect' ? [] : field.type === 'boolean' ? true : null,
      connector: 'AND',
    }
    setFilters([...filters, newFilter])
    setShowFieldSelector(false)
    setFieldSearch('')
  }

  // Update a filter block
  const updateFilter = (id: string, updates: Partial<FilterBlock>) => {
    setFilters(filters.map(f => f.id === id ? { ...f, ...updates } : f))
  }

  // Remove a filter block
  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id))
  }

  // Toggle connector (AND/OR)
  const toggleConnector = (id: string) => {
    setFilters(filters.map(f => 
      f.id === id ? { ...f, connector: f.connector === 'AND' ? 'OR' : 'AND' } : f
    ))
  }

  // Clear all filters
  const clearFilters = () => {
    setFilters([])
    setResultCount(null)
  }

  // Apply filters
  const handleApply = () => {
    onApply(filters)
  }

  // Toggle category expansion
  const toggleCategory = (name: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(name)) {
        next.delete(name)
      } else {
        next.add(name)
      }
      return next
    })
  }

  // Get field options
  const getFieldOptions = (fieldKey: string): { id: string; name: string; color?: string }[] => {
    const field = allFields.find(f => f.key === fieldKey)
    if (!field) return []
    
    if (fieldKey === 'status') return statuses
    if (fieldKey === 'tags') return tags
    if (fieldKey === 'motivations') return motivations
    if (fieldKey === 'assignedTo' || fieldKey === 'taskAssignedTo') {
      return users.map(u => ({ id: u.id, name: u.name || u.email }))
    }
    
    return field.options || []
  }

  // Load presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('filterPresets')
    if (saved) {
      try {
        setPresets(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to load presets:', e)
      }
    }
  }, [])

  // Save preset
  const savePreset = () => {
    if (!presetName.trim()) return
    
    const newPreset: FilterPreset = {
      id: `preset_${Date.now()}`,
      name: presetName.trim(),
      filters: filters,
      isShared: false,
    }
    
    const updatedPresets = [...presets, newPreset]
    setPresets(updatedPresets)
    localStorage.setItem('filterPresets', JSON.stringify(updatedPresets))
    setShowSavePreset(false)
    setPresetName('')
  }

  // Load preset
  const loadPreset = (preset: FilterPreset) => {
    setFilters(preset.filters)
    setShowPresets(false)
  }

  // Delete preset
  const deletePreset = (id: string) => {
    const updatedPresets = presets.filter(p => p.id !== id)
    setPresets(updatedPresets)
    localStorage.setItem('filterPresets', JSON.stringify(updatedPresets))
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-[400px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Filter Records</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-white hover:text-gray-900 rounded-lg transition border border-transparent hover:border-gray-200"
          >
            <FolderOpen className="w-4 h-4" />
            Load
          </button>
          <button
            onClick={() => setShowSavePreset(true)}
            disabled={filters.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-white hover:text-gray-900 rounded-lg transition border border-transparent hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={clearFilters}
            disabled={filters.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-white hover:text-gray-900 rounded-lg transition border border-transparent hover:border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Clear
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Add Filter Block Button */}
          <div className="relative mb-4">
            <button
              onClick={() => setShowFieldSelector(!showFieldSelector)}
              className="w-full flex items-center justify-between px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add filter block
              </span>
              <Plus className="w-4 h-4" />
            </button>

            {/* Field Selector Dropdown */}
            {showFieldSelector && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-10 max-h-80 overflow-hidden">
                {/* Search */}
                <div className="p-2 border-b sticky top-0 bg-white">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search for filter blocks..."
                      value={fieldSearch}
                      onChange={(e) => setFieldSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Categories */}
                <div className="overflow-y-auto max-h-64">
                  {filteredCategories.map(category => (
                    <div key={category.name}>
                      <button
                        onClick={() => toggleCategory(category.name)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:bg-gray-100"
                      >
                        {category.name}
                        {expandedCategories.has(category.name) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      {expandedCategories.has(category.name) && (
                        <div>
                          {category.fields.map(field => (
                            <button
                              key={field.key}
                              onClick={() => addFilterBlock(field)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            >
                              {field.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Filter Blocks */}
          {filters.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-medium mb-2">Build your own filter presets</h3>
              <p className="text-sm text-gray-500 mb-4">
                You can build your very own filter set by adding filter blocks and applying conditions to it.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filters.map((filter, index) => (
                <div key={filter.id}>
                  {/* Connector (between blocks) */}
                  {index > 0 && (
                    <div className="flex justify-center my-2">
                      <button
                        onClick={() => toggleConnector(filter.id)}
                        className="px-3 py-1 text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition"
                      >
                        {filter.connector}
                      </button>
                    </div>
                  )}

                  {/* Filter Block */}
                  <FilterBlockComponent
                    filter={filter}
                    options={getFieldOptions(filter.field)}
                    operators={OPERATORS[filter.fieldType] || []}
                    onUpdate={(updates) => updateFilter(filter.id, updates)}
                    onRemove={() => removeFilter(filter.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Presets Panel */}
          {showPresets && (
            <div className="mt-4 border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                Saved Presets
                <button onClick={() => setShowPresets(false)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              {presets.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No saved presets yet
                </div>
              ) : (
                <div>
                  {presets.map(preset => (
                    <div
                      key={preset.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <button
                        onClick={() => loadPreset(preset)}
                        className="text-sm text-gray-700 hover:text-blue-600"
                      >
                        {preset.name}
                      </button>
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50">
          {resultCount !== null && (
            <p className="text-sm text-gray-500 mb-3">
              Showing {resultCount.toLocaleString()} records
            </p>
          )}
          <button
            onClick={handleApply}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Apply Filters
          </button>
        </div>

        {/* Save Preset Modal */}
        {showSavePreset && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-4 w-80 shadow-xl">
              <h3 className="text-lg font-semibold mb-3">Save Filter Preset</h3>
              <input
                type="text"
                placeholder="Preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowSavePreset(false); setPresetName('') }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={savePreset}
                  disabled={!presetName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

// Filter Block Component
function FilterBlockComponent({
  filter,
  options,
  operators,
  onUpdate,
  onRemove,
}: {
  filter: FilterBlock
  options: { id: string; name: string; color?: string }[]
  operators: { value: string; label: string }[]
  onUpdate: (updates: Partial<FilterBlock>) => void
  onRemove: () => void
}) {
  const [showOperatorDropdown, setShowOperatorDropdown] = useState(false)
  const [showValueDropdown, setShowValueDropdown] = useState(false)
  const [valueSearch, setValueSearch] = useState('')

  const selectedOperator = operators.find(o => o.value === filter.operator)
  const isEmptyOperator = filter.operator === 'is_empty' || filter.operator === 'is_not_empty'

  // For multiselect, get selected items
  const selectedValues = Array.isArray(filter.value) ? filter.value : []
  const selectedItems = options.filter(o => selectedValues.includes(o.id))

  // Filter options by search
  const filteredOptions = options.filter(o => 
    o.name.toLowerCase().includes(valueSearch.toLowerCase())
  )

  // Toggle value for multiselect
  const toggleValue = (id: string) => {
    if (Array.isArray(filter.value)) {
      if (filter.value.includes(id)) {
        onUpdate({ value: filter.value.filter(v => v !== id) })
      } else {
        onUpdate({ value: [...filter.value, id] })
      }
    } else {
      onUpdate({ value: [id] })
    }
  }

  // Remove a selected value
  const removeValue = (id: string) => {
    if (Array.isArray(filter.value)) {
      onUpdate({ value: filter.value.filter(v => v !== id) })
    }
  }

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <span className="text-sm font-medium text-gray-700">{filter.fieldLabel}</span>
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Operator Selector */}
        <div className="relative">
          <button
            onClick={() => setShowOperatorDropdown(!showOperatorDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            {selectedOperator?.label || 'Select operator'}
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {showOperatorDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowOperatorDropdown(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                {operators.map(op => (
                  <button
                    key={op.value}
                    onClick={() => {
                      onUpdate({ operator: op.value })
                      setShowOperatorDropdown(false)
                    }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                      filter.operator === op.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Value Selector (not shown for empty operators) */}
        {!isEmptyOperator && (
          <>
            {/* Multiselect / Select with options */}
            {(filter.fieldType === 'multiselect' || filter.fieldType === 'select' || filter.fieldType === 'user') && options.length > 0 && (
              <div className="relative">
                {/* Search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Search ${filter.fieldLabel.toLowerCase()}...`}
                    value={valueSearch}
                    onChange={(e) => setValueSearch(e.target.value)}
                    onFocus={() => setShowValueDropdown(true)}
                    className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Selected values as bubbles */}
                {selectedItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedItems.map(item => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: item.color ? `${item.color}20` : '#E5E7EB',
                          color: item.color || '#374151',
                          border: item.color ? `1px solid ${item.color}40` : '1px solid #D1D5DB',
                        }}
                      >
                        {item.name}
                        <button
                          onClick={() => removeValue(item.id)}
                          className="hover:opacity-70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Dropdown */}
                {showValueDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowValueDropdown(false)} />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                      {filteredOptions.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
                      ) : (
                        filteredOptions.map(option => (
                          <button
                            key={option.id}
                            onClick={() => toggleValue(option.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                              selectedValues.includes(option.id) ? 'bg-blue-50' : ''
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              selectedValues.includes(option.id) 
                                ? 'bg-blue-600 border-blue-600' 
                                : 'border-gray-300'
                            }`}>
                              {selectedValues.includes(option.id) && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            {option.color && (
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: option.color }}
                              />
                            )}
                            <span className="text-gray-700">{option.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Text input */}
            {filter.fieldType === 'text' && (
              <input
                type="text"
                placeholder="Enter value..."
                value={typeof filter.value === 'string' ? filter.value : ''}
                onChange={(e) => onUpdate({ value: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}

            {/* Number input */}
            {filter.fieldType === 'number' && (
              <input
                type="number"
                placeholder="Enter number..."
                value={typeof filter.value === 'number' ? filter.value : ''}
                onChange={(e) => onUpdate({ value: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}

            {/* Date input */}
            {filter.fieldType === 'date' && filter.operator !== 'in_last' && (
              <input
                type="date"
                value={typeof filter.value === 'string' ? filter.value : ''}
                onChange={(e) => onUpdate({ value: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}

            {/* Date "in last X days" */}
            {filter.fieldType === 'date' && filter.operator === 'in_last' && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="7"
                  value={typeof filter.value === 'number' ? filter.value : ''}
                  onChange={(e) => onUpdate({ value: e.target.value ? Number(e.target.value) : null })}
                  className="w-20 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-sm text-gray-500">days</span>
              </div>
            )}

            {/* Boolean */}
            {filter.fieldType === 'boolean' && (
              <div className="flex gap-2">
                <button
                  onClick={() => onUpdate({ value: true })}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                    filter.value === true
                      ? 'bg-green-100 border-green-300 text-green-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => onUpdate({ value: false })}
                  className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${
                    filter.value === false
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  No
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
