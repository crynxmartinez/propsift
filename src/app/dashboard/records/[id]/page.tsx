'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ChevronRight, 
  Pencil, 
  Phone, 
  Mail, 
  Plus, 
  Loader2,
  User,
  Building2,
  MapPin,
  Snowflake,
  Flame,
  Thermometer,
  X,
  Check,
  Ban,
  PhoneOff,
  Skull,
  ChevronDown,
  MessageSquare,
  Clock,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface RecordData {
  id: string
  ownerFirstName: string | null
  ownerLastName: string | null
  ownerFullName: string
  isCompany: boolean
  propertyStreet: string | null
  propertyCity: string | null
  propertyState: string | null
  propertyZip: string | null
  mailingStreet: string | null
  mailingCity: string | null
  mailingState: string | null
  mailingZip: string | null
  phone: string | null
  email: string | null
  notes: string | null
  description: string | null
  temperature: string | null
  estimatedValue: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  lotSize: number | null
  structureType: string | null
  heatingType: string | null
  airConditioner: string | null
  yearBuilt: number | null
  callAttempts: number
  directMailAttempts: number
  smsAttempts: number
  rvmAttempts: number
  skiptraceDate: string | null
  isComplete: boolean
  statusId: string | null
  status: {
    id: string
    name: string
    color: string
  } | null
  assignedToId: string | null
  assignedTo: {
    id: string
    name: string | null
    email: string
  } | null
  phoneNumbers: PhoneNumber[]
  emails: EmailRecord[]
  recordTags: { tag: { id: string; name: string } }[]
  recordMotivations: { motivation: { id: string; name: string } }[]
  createdAt: string
  updatedAt: string
}

interface PhoneNumber {
  id: string
  number: string
  type: string
  statuses: string[]
  createdAt: string
}

interface EmailRecord {
  id: string
  email: string
  isPrimary: boolean
  createdAt: string
}

interface Comment {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface ActivityLog {
  id: string
  action: string
  field: string | null
  oldValue: string | null
  newValue: string | null
  source: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  } | null
}

interface CustomFieldDefinition {
  id: string
  name: string
  fieldType: string
  displayType: string
  options: string | null
  isRequired: boolean
  order: number
}

interface CustomFieldValue {
  id: string
  value: string | null
  fieldId: string
  recordId: string
  field: CustomFieldDefinition
}

interface UserItem {
  id: string
  name: string | null
  email: string
}

interface StatusItem {
  id: string
  name: string
  color: string
}

interface MotivationItem {
  id: string
  name: string
}

interface TagItem {
  id: string
  name: string
}

interface BoardColumn {
  id: string
  name: string
  color: string
}

interface Board {
  id: string
  name: string
  columns: BoardColumn[]
}

interface RecordBoardPosition {
  id: string
  columnId: string
  column: BoardColumn & { board: { id: string; name: string } }
}

type TabType = 'overview' | 'conversation' | 'activity' | 'additional'

const PHONE_STATUSES = [
  { value: 'NONE', label: 'None', icon: null, color: 'gray' },
  { value: 'PRIMARY', label: 'Primary', icon: Check, color: 'green' },
  { value: 'CORRECT', label: 'Correct', icon: Check, color: 'blue' },
  { value: 'WRONG', label: 'Wrong', icon: X, color: 'red' },
  { value: 'NO_ANSWER', label: 'No Answer', icon: PhoneOff, color: 'yellow' },
  { value: 'DNC', label: 'DNC', icon: Ban, color: 'orange' },
  { value: 'DEAD', label: 'Dead', icon: Skull, color: 'gray' },
]

const ADDITIONAL_INFO_SECTIONS = [
  'Structure Characteristics',
  'Land Details',
  'Tax Details',
  'Sale Details',
  'Lien Details',
  'Probate Details',
  'Foreclosure Details',
  'Bankruptcy Details',
  'Divorce Details',
  'Mortgage Details',
  'Ownership Details',
  'Direct Mail Details',
]

export default function PropertyDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const recordId = params.id as string

  const [record, setRecord] = useState<RecordData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  
  // Dropdowns
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)
  const [showAddPhoneModal, setShowAddPhoneModal] = useState(false)
  const [showAddEmailModal, setShowAddEmailModal] = useState(false)
  
  // Data
  const [users, setUsers] = useState<UserItem[]>([])
  const [statuses, setStatuses] = useState<StatusItem[]>([])
  const [motivations, setMotivations] = useState<MotivationItem[]>([])
  const [tags, setTags] = useState<TagItem[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  
  // Form states
  const [newComment, setNewComment] = useState('')
  const [newPhone, setNewPhone] = useState({ number: '', type: 'MOBILE' })
  const [newEmail, setNewEmail] = useState('')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  
  // Activity filters
  const [activityEventType, setActivityEventType] = useState('all')
  const [activityUserId, setActivityUserId] = useState('all')
  
  // Motivations & Tags tab
  const [activeListTab, setActiveListTab] = useState<'motivations' | 'tags'>('motivations')
  const [listSearch, setListSearch] = useState('')
  const [showMotivationDropdown, setShowMotivationDropdown] = useState(false)
  const [showTagDropdown, setShowTagDropdown] = useState(false)
  const [addingMotivationId, setAddingMotivationId] = useState<string | null>(null)
  const [addingTagId, setAddingTagId] = useState<string | null>(null)
  const [removingMotivation, setRemovingMotivation] = useState<string | null>(null)
  const [removingTag, setRemovingTag] = useState<string | null>(null)
  const [creatingMotivation, setCreatingMotivation] = useState(false)
  const [creatingTag, setCreatingTag] = useState(false)
  
  // Notes editing
  const [showEditNotesModal, setShowEditNotesModal] = useState(false)
  const [editNotesValue, setEditNotesValue] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  
  // Confirmation dialogs
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'phone' | 'email' | null; id: string | null }>({ type: null, id: null })
  
  // Edit field modal
  const [editFieldModal, setEditFieldModal] = useState<{ field: string; label: string; value: string; type: 'text' | 'number' | 'currency' | 'date' } | null>(null)
  
  // Add custom field modal
  const [showAddFieldModal, setShowAddFieldModal] = useState(false)
  const [newFieldData, setNewFieldData] = useState({ name: '', fieldType: 'text', displayType: 'card' })
  
  // Custom fields
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValue[]>([])
  const [editCustomFieldModal, setEditCustomFieldModal] = useState<{ fieldId: string; name: string; value: string; fieldType: string } | null>(null)
  
  // Edit property address modal
  const [showEditAddressModal, setShowEditAddressModal] = useState(false)
  const [editAddressData, setEditAddressData] = useState({ street: '', city: '', state: '', zip: '' })
  
  // Board stage
  const [boards, setBoards] = useState<Board[]>([])
  const [recordBoardPositions, setRecordBoardPositions] = useState<RecordBoardPosition[]>([])
  const [showBoardDropdown, setShowBoardDropdown] = useState(false)
  const [expandedBoards, setExpandedBoards] = useState<Set<string>>(new Set())
  
  // Loading states
  const [savingField, setSavingField] = useState(false)
  const [savingCustomField, setSavingCustomField] = useState(false)
  const [savingCustomFieldValue, setSavingCustomFieldValue] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [savingPhone, setSavingPhone] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [deletingItem, setDeletingItem] = useState(false)

  useEffect(() => {
    fetchRecord()
    fetchCustomFields()
    fetchOptions()
    fetchBoards()
    fetchRecordBoardPositions()
  }, [recordId])

  useEffect(() => {
    if (activeTab === 'conversation') {
      fetchComments()
    } else if (activeTab === 'activity') {
      fetchActivityLogs()
    }
  }, [activeTab, recordId])

  const fetchRecord = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/records/${recordId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        if (res.status === 404) {
          router.push('/dashboard/records')
          return
        }
        throw new Error('Failed to fetch record')
      }
      const data = await res.json()
      setRecord(data)
    } catch (error) {
      console.error('Error fetching record:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomFields = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [fieldsRes, valuesRes] = await Promise.all([
        fetch('/api/custom-fields', { headers }),
        fetch(`/api/records/${recordId}/custom-fields`, { headers }),
      ])
      if (fieldsRes.ok) {
        const fields = await fieldsRes.json()
        setCustomFields(Array.isArray(fields) ? fields : [])
      }
      if (valuesRes.ok) {
        const values = await valuesRes.json()
        setCustomFieldValues(Array.isArray(values) ? values : [])
      }
    } catch (error) {
      console.error('Error fetching custom fields:', error)
    }
  }

  const fetchBoards = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/boards', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setBoards(data)
      }
    } catch (error) {
      console.error('Error fetching boards:', error)
    }
  }

  const fetchRecordBoardPositions = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/records/${recordId}/boards`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setRecordBoardPositions(data)
      }
    } catch (error) {
      console.error('Error fetching record board positions:', error)
    }
  }

  const handleAddToBoard = async (boardId: string, columnId: string) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/boards/${boardId}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recordId, columnId }),
      })
      if (res.ok) {
        fetchRecordBoardPositions()
        setShowBoardDropdown(false)
      }
    } catch (error) {
      console.error('Error adding to board:', error)
    }
  }

  const createCustomField = async () => {
    if (!newFieldData.name.trim()) return
    setSavingCustomField(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newFieldData),
      })
      if (res.ok) {
        const field = await res.json()
        setCustomFields([...customFields, field])
        setShowAddFieldModal(false)
        setNewFieldData({ name: '', fieldType: 'text', displayType: 'card' })
      }
    } catch (error) {
      console.error('Error creating custom field:', error)
    } finally {
      setSavingCustomField(false)
    }
  }

  const saveCustomFieldValue = async () => {
    if (!editCustomFieldModal) return
    setSavingCustomFieldValue(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/records/${recordId}/custom-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          fieldId: editCustomFieldModal.fieldId,
          value: editCustomFieldModal.value,
        }),
      })
      if (res.ok) {
        const savedValue = await res.json()
        setCustomFieldValues(prev => {
          const existing = prev.findIndex(v => v.fieldId === savedValue.fieldId)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = savedValue
            return updated
          }
          return [...prev, savedValue]
        })
        setEditCustomFieldModal(null)
      }
    } catch (error) {
      console.error('Error saving custom field value:', error)
    } finally {
      setSavingCustomFieldValue(false)
    }
  }

  const fetchOptions = async () => {
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }
      const [usersRes, statusesRes, motivationsRes, tagsRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/statuses', { headers }),
        fetch('/api/motivations', { headers }),
        fetch('/api/tags', { headers }),
      ])
      
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(Array.isArray(data) ? data : [])
      }
      if (statusesRes.ok) {
        const data = await statusesRes.json()
        setStatuses(Array.isArray(data) ? data : [])
      }
      if (motivationsRes.ok) {
        const data = await motivationsRes.json()
        setMotivations(Array.isArray(data) ? data : [])
      }
      if (tagsRes.ok) {
        const data = await tagsRes.json()
        setTags(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching options:', error)
    }
  }

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/records/${recordId}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(data)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const fetchActivityLogs = async () => {
    try {
      let url = `/api/records/${recordId}/activity?`
      if (activityEventType !== 'all') url += `eventType=${activityEventType}&`
      if (activityUserId !== 'all') url += `userId=${activityUserId}&`
      
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setActivityLogs(data)
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error)
    }
  }

  const saveFieldEdit = async () => {
    if (!editFieldModal) return
    setSavingField(true)
    try {
      let value: string | number | Date | null = editFieldModal.value
      if (editFieldModal.type === 'number' || editFieldModal.type === 'currency') {
        value = editFieldModal.value ? parseFloat(editFieldModal.value.replace(/[^0-9.-]/g, '')) : null
      } else if (editFieldModal.type === 'date') {
        value = editFieldModal.value ? new Date(editFieldModal.value).toISOString() : null
      }
      await updateRecord({ [editFieldModal.field]: value })
      setEditFieldModal(null)
    } finally {
      setSavingField(false)
    }
  }

  const updateRecord = async (updates: Partial<RecordData>) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      })
      if (res.ok) {
        const data = await res.json()
        setRecord(data)
      }
    } catch (error) {
      console.error('Error updating record:', error)
    }
  }

  const handleTemperatureChange = (temp: string) => {
    updateRecord({ temperature: temp })
  }

  const handleAssignUser = (userId: string) => {
    updateRecord({ assignedToId: userId || null })
    setShowUserDropdown(false)
  }

  const handleAttemptChange = (field: keyof Pick<RecordData, 'callAttempts' | 'directMailAttempts' | 'smsAttempts' | 'rvmAttempts'>, delta: number) => {
    if (!record) return
    const currentValue = record[field]
    const newValue = Math.max(0, currentValue + delta)
    updateRecord({ [field]: newValue })
  }

  const addPhone = async () => {
    if (!newPhone.number.trim()) return
    setSavingPhone(true)
    try {
      const res = await fetch(`/api/records/${recordId}/phones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPhone),
      })
      if (res.ok) {
        fetchRecord()
        setNewPhone({ number: '', type: 'MOBILE' })
        setShowAddPhoneModal(false)
      }
    } catch (error) {
      console.error('Error adding phone:', error)
    } finally {
      setSavingPhone(false)
    }
  }

  const togglePhoneStatus = async (phoneId: string, statusValue: string, currentStatuses: string[]) => {
    try {
      let newStatuses: string[]
      if (currentStatuses.includes(statusValue)) {
        // Remove the status
        newStatuses = currentStatuses.filter(s => s !== statusValue)
      } else {
        // Add the status
        newStatuses = [...currentStatuses, statusValue]
      }
      await fetch(`/api/records/${recordId}/phones/${phoneId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statuses: newStatuses }),
      })
      fetchRecord()
    } catch (error) {
      console.error('Error updating phone statuses:', error)
    }
  }

  const deletePhone = async (phoneId: string) => {
    setDeletingItem(true)
    try {
      await fetch(`/api/records/${recordId}/phones/${phoneId}`, {
        method: 'DELETE',
      })
      fetchRecord()
      setConfirmDelete({ type: null, id: null })
    } catch (error) {
      console.error('Error deleting phone:', error)
    } finally {
      setDeletingItem(false)
    }
  }

  const addEmail = async () => {
    if (!newEmail.trim()) return
    setSavingEmail(true)
    try {
      const res = await fetch(`/api/records/${recordId}/emails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail }),
      })
      if (res.ok) {
        fetchRecord()
        setNewEmail('')
        setShowAddEmailModal(false)
      }
    } catch (error) {
      console.error('Error adding email:', error)
    } finally {
      setSavingEmail(false)
    }
  }

  const deleteEmail = async (emailId: string) => {
    setDeletingItem(true)
    try {
      await fetch(`/api/records/${recordId}/emails/${emailId}`, {
        method: 'DELETE',
      })
      fetchRecord()
      setConfirmDelete({ type: null, id: null })
    } catch (error) {
      console.error('Error deleting email:', error)
    } finally {
      setDeletingItem(false)
    }
  }
  
  const saveAddress = async () => {
    setSavingAddress(true)
    try {
      await updateRecord({
        propertyStreet: editAddressData.street,
        propertyCity: editAddressData.city,
        propertyState: editAddressData.state,
        propertyZip: editAddressData.zip,
      })
      setShowEditAddressModal(false)
    } finally {
      setSavingAddress(false)
    }
  }

  const addMotivation = async (motivationId: string) => {
    setAddingMotivationId(motivationId)
    try {
      const res = await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          addMotivationIds: [motivationId]
        }),
      })
      if (res.ok) {
        fetchRecord()
        setShowMotivationDropdown(false)
        setListSearch('')
      }
    } catch (error) {
      console.error('Error adding motivation:', error)
    } finally {
      setAddingMotivationId(null)
    }
  }

  const removeMotivation = async (motivationId: string) => {
    setRemovingMotivation(motivationId)
    try {
      const res = await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          removeMotivationIds: [motivationId]
        }),
      })
      if (res.ok) {
        fetchRecord()
      }
    } catch (error) {
      console.error('Error removing motivation:', error)
    } finally {
      setRemovingMotivation(null)
    }
  }

  const addTag = async (tagId: string) => {
    setAddingTagId(tagId)
    try {
      const res = await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          addTagIds: [tagId]
        }),
      })
      if (res.ok) {
        fetchRecord()
        setShowTagDropdown(false)
        setListSearch('')
      }
    } catch (error) {
      console.error('Error adding tag:', error)
    } finally {
      setAddingTagId(null)
    }
  }

  const removeTag = async (tagId: string) => {
    setRemovingTag(tagId)
    try {
      const res = await fetch(`/api/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          removeTagIds: [tagId]
        }),
      })
      if (res.ok) {
        fetchRecord()
      }
    } catch (error) {
      console.error('Error removing tag:', error)
    } finally {
      setRemovingTag(null)
    }
  }

  const createAndAddMotivation = async (name: string) => {
    if (!name.trim()) return
    setCreatingMotivation(true)
    try {
      const token = localStorage.getItem('token')
      // First create the motivation
      const createRes = await fetch('/api/motivations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (createRes.ok) {
        const newMotivation = await createRes.json()
        // Add to local motivations list
        setMotivations([...motivations, newMotivation])
        // Then add it to the record
        const addRes = await fetch(`/api/records/${recordId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ addMotivationIds: [newMotivation.id] }),
        })
        if (addRes.ok) {
          fetchRecord()
          setShowMotivationDropdown(false)
          setListSearch('')
        }
      }
    } catch (error) {
      console.error('Error creating motivation:', error)
    } finally {
      setCreatingMotivation(false)
    }
  }

  const createAndAddTag = async (name: string) => {
    if (!name.trim()) return
    setCreatingTag(true)
    try {
      const token = localStorage.getItem('token')
      // First create the tag
      const createRes = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (createRes.ok) {
        const newTag = await createRes.json()
        // Add to local tags list
        setTags([...tags, newTag])
        // Then add it to the record
        const addRes = await fetch(`/api/records/${recordId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ addTagIds: [newTag.id] }),
        })
        if (addRes.ok) {
          fetchRecord()
          setShowTagDropdown(false)
          setListSearch('')
        }
      }
    } catch (error) {
      console.error('Error creating tag:', error)
    } finally {
      setCreatingTag(false)
    }
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      await updateRecord({ notes: editNotesValue })
      setShowEditNotesModal(false)
    } finally {
      setSavingNotes(false)
    }
  }

  const addComment = async () => {
    if (!newComment.trim()) return
    try {
      // For now, use the first user as the commenter (in real app, use logged-in user)
      const userId = users[0]?.id || 'current'
      const res = await fetch(`/api/records/${recordId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, userId }),
      })
      if (res.ok) {
        setNewComment('')
        fetchComments()
      }
    } catch (error) {
      console.error('Error adding comment:', error)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const formatPhoneNumber = (phone: string) => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else if (digits.length <= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    } else if (digits.length === 11) {
      return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
    }
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatCurrency = (value: number | null) => {
    if (value === null) return '—'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getZillowUrl = () => {
    if (!record) return '#'
    const address = `${record.propertyStreet || ''}, ${record.propertyCity || ''}, ${record.propertyState || ''} ${record.propertyZip || ''}`.trim()
    return `https://www.zillow.com/homes/${encodeURIComponent(address)}_rb/`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!record) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Record not found</p>
      </div>
    )
  }

  const fullAddress = [record.propertyStreet, record.propertyCity, record.propertyState, record.propertyZip]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/dashboard/records" className="text-primary hover:underline">
          Records
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground">Property Details</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {record.propertyStreet || 'No Address'}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {[record.propertyCity, record.propertyState, record.propertyZip].filter(Boolean).join(', ')}
            </p>
          </div>
          {/* Edit Button - beside address */}
          <Button 
            variant="outline"
            size="icon"
            onClick={() => {
              setEditAddressData({
                street: record.propertyStreet || '',
                city: record.propertyCity || '',
                state: record.propertyState || '',
                zip: record.propertyZip || '',
              })
              setShowEditAddressModal(true)
            }}
            className="mt-1"
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:bg-gray-800"
              style={record.status ? { backgroundColor: record.status.color + '20', borderColor: record.status.color } : {}}
            >
              {record.status ? (
                <span className="text-sm font-medium" style={{ color: record.status.color }}>
                  {record.status.name}
                </span>
              ) : (
                <span className="text-sm text-gray-500 dark:text-gray-400">Set Status</span>
              )}
              <ChevronDown className="w-4 h-4" />
            </button>
            {showStatusDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                <button
                  onClick={() => { updateRecord({ statusId: null }); setShowStatusDropdown(false) }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                >
                  No Status
                </button>
                {statuses.map((status) => (
                  <button
                    key={status.id}
                    onClick={() => { updateRecord({ statusId: status.id }); setShowStatusDropdown(false) }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:bg-gray-800 flex items-center gap-2"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Choose User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:bg-gray-800"
            >
              <User className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              <span className="text-sm">
                {record.assignedTo?.name || record.assignedTo?.email || 'Choose user'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 min-w-[200px] max-w-[280px] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                <button
                  onClick={() => handleAssignUser('')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:bg-gray-800"
                >
                  Unassigned
                </button>
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAssignUser(user.id)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:bg-gray-800 truncate"
                  >
                    {user.name || user.email}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Board Stage Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowBoardDropdown(!showBoardDropdown)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:bg-gray-800"
            >
              <span className="text-sm">
                {recordBoardPositions.length > 0 
                  ? `${recordBoardPositions.length} Board${recordBoardPositions.length > 1 ? 's' : ''}`
                  : 'Add to Board'}
              </span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {showBoardDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-80 overflow-y-auto">
                {/* Current board positions */}
                {recordBoardPositions.length > 0 && (
                  <div className="p-2 border-b border-gray-100">
                    <p className="text-xs text-gray-500 dark:text-gray-400 px-2 mb-1">Current Boards</p>
                    {recordBoardPositions.map((pos) => (
                      <div
                        key={pos.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:bg-gray-800"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: pos.column.color }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                          {pos.column.board.name} → {pos.column.name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Add to board */}
                <div className="p-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 px-2 mb-1">Add to Board</p>
                  {boards.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 px-2 py-1">No boards available</p>
                  ) : (
                    boards.map((board) => {
                      const isExpanded = expandedBoards.has(board.id)
                      const alreadyOnBoard = recordBoardPositions.some(
                        p => p.column.board.id === board.id
                      )
                      return (
                        <div key={board.id} className="mb-1">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedBoards)
                              if (isExpanded) {
                                newExpanded.delete(board.id)
                              } else {
                                newExpanded.add(board.id)
                              }
                              setExpandedBoards(newExpanded)
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 text-left text-sm rounded hover:bg-gray-100 dark:bg-gray-800 ${
                              alreadyOnBoard ? 'text-green-600' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <span className="font-medium">{board.name}</span>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          {isExpanded && (
                            <div className="ml-2 border-l-2 border-gray-200 dark:border-gray-700 pl-2 mt-1">
                              {board.columns.map((column) => (
                                <button
                                  key={column.id}
                                  onClick={() => handleAddToBoard(board.id, column.id)}
                                  disabled={alreadyOnBoard}
                                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded ${
                                    alreadyOnBoard 
                                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:bg-gray-800'
                                  }`}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: column.color }}
                                  />
                                  {column.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Zillow Button */}
          <a
            href={getZillowUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
            title="View on Zillow"
          >
            <span className="text-xs font-bold">Z</span>
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column - Map & Tabs */}
        <div className="col-span-8">
          {/* Map Section */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">MAP</span>
            </div>
            <div className="h-64 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {fullAddress ? (
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  allowFullScreen
                />
              ) : (
                <p className="text-gray-400 dark:text-gray-500">No address available for map</p>
              )}
            </div>
            {/* Description */}
            <div className="p-4">
              <textarea
                value={record.description || ''}
                onChange={(e) => updateRecord({ description: e.target.value })}
                placeholder="Enter a short description of the property here..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                rows={2}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="flex gap-8 px-6">
                {[
                  { id: 'overview', label: 'Property Overview', icon: Info },
                  { id: 'conversation', label: 'Conversation Board', icon: MessageSquare },
                  { id: 'activity', label: 'Activity Log', icon: Clock },
                  { id: 'additional', label: 'Additional Info', icon: Info },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`py-4 text-sm font-medium border-b-2 transition ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Property Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Attempt Counters */}
                  <div className="grid grid-cols-4 gap-4">
                    {([
                      { key: 'callAttempts' as const, label: 'Call Attempts' },
                      { key: 'directMailAttempts' as const, label: 'Direct Mail Attempts' },
                      { key: 'smsAttempts' as const, label: 'SMS Attempts' },
                      { key: 'rvmAttempts' as const, label: 'RVM Attempts' },
                    ]).map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAttemptChange(item.key, -1)}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium">
                            {record[item.key]}
                          </span>
                          <button
                            onClick={() => handleAttemptChange(item.key, 1)}
                            className="w-6 h-6 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:bg-gray-800"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Property Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="relative group text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <button 
                        onClick={() => setEditFieldModal({ field: 'estimatedValue', label: 'Estimated Value', value: record.estimatedValue?.toString() || '', type: 'currency' })}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-200 rounded"
                      >
                        <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      </button>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(record.estimatedValue)}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Estimated Value</p>
                    </div>
                    <div className="relative group text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <button 
                        onClick={() => setEditFieldModal({ field: 'bedrooms', label: 'Bedrooms', value: record.bedrooms?.toString() || '', type: 'number' })}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-200 rounded"
                      >
                        <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      </button>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{record.bedrooms ?? '—'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Bedrooms</p>
                    </div>
                    <div className="relative group text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <button 
                        onClick={() => setEditFieldModal({ field: 'sqft', label: 'Square Feet', value: record.sqft?.toString() || '', type: 'number' })}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-200 rounded"
                      >
                        <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      </button>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{record.sqft ? `${record.sqft} sqft` : '—'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Sqft</p>
                    </div>
                    <div className="relative group text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <button 
                        onClick={() => setEditFieldModal({ field: 'yearBuilt', label: 'Year Built', value: record.yearBuilt?.toString() || '', type: 'number' })}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-200 rounded"
                      >
                        <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      </button>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{record.yearBuilt ?? '—'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Year</p>
                    </div>
                    <div className="relative group text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <button 
                        onClick={() => setEditFieldModal({ field: 'skiptraceDate', label: 'Skiptrace Date', value: record.skiptraceDate ? record.skiptraceDate.split('T')[0] : '', type: 'date' })}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-200 rounded"
                      >
                        <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      </button>
                      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {record.skiptraceDate ? new Date(record.skiptraceDate).toLocaleDateString() : '—'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Skiptrace</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    <div className="relative group text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <button 
                        onClick={() => setEditFieldModal({ field: 'structureType', label: 'Structure Type', value: record.structureType || '', type: 'text' })}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-100 dark:bg-gray-800 rounded"
                      >
                        <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      </button>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{record.structureType || '—'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Structure Type</p>
                    </div>
                    <div className="relative group text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <button 
                        onClick={() => setEditFieldModal({ field: 'heatingType', label: 'Heating Type', value: record.heatingType || '', type: 'text' })}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-100 dark:bg-gray-800 rounded"
                      >
                        <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      </button>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{record.heatingType || '—'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Heating Type</p>
                    </div>
                    <div className="relative group text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <button 
                        onClick={() => setEditFieldModal({ field: 'airConditioner', label: 'Air Conditioner', value: record.airConditioner || '', type: 'text' })}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-100 dark:bg-gray-800 rounded"
                      >
                        <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      </button>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{record.airConditioner || '—'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Air Conditioner</p>
                    </div>
                    <div className="relative group text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <button 
                        onClick={() => setEditFieldModal({ field: 'bathrooms', label: 'Bathrooms', value: record.bathrooms?.toString() || '', type: 'number' })}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-100 dark:bg-gray-800 rounded"
                      >
                        <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                      </button>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{record.bathrooms ?? '—'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Bathrooms</p>
                    </div>
                  </div>

                  {/* Motivations & Tags + Notes */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Motivations & Tags Box */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                      {/* Header */}
                      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <span className="text-blue-600">—</span>
                        <span className="text-sm font-medium text-blue-600">MOTIVATIONS & TAGS</span>
                      </div>
                      
                      {/* Tabs */}
                      <div className="flex border-b border-gray-200 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={() => setActiveListTab('motivations')}
                          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition ${
                            activeListTab === 'motivations'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          Motivations ({record.recordMotivations.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveListTab('tags')}
                          className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition ${
                            activeListTab === 'tags'
                              ? 'border-blue-600 text-blue-600'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          Tags ({record.recordTags.length})
                        </button>
                      </div>

                      {/* Search Input with Dropdown */}
                      <div className="p-3 border-b border-gray-100">
                        <div className="relative">
                          <input
                            type="text"
                            value={listSearch}
                            onChange={(e) => setListSearch(e.target.value)}
                            onFocus={() => activeListTab === 'motivations' ? setShowMotivationDropdown(true) : setShowTagDropdown(true)}
                            placeholder={`Search ${activeListTab}...`}
                            className="w-full px-3 py-2 pr-12 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => activeListTab === 'motivations' ? setShowMotivationDropdown(!showMotivationDropdown) : setShowTagDropdown(!showTagDropdown)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600 text-sm font-medium hover:text-blue-700"
                          >
                            Add
                          </button>
                          
                          {/* Motivation Dropdown */}
                          {activeListTab === 'motivations' && showMotivationDropdown && (
                            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {motivations
                                .filter(m => !record.recordMotivations.some(rm => rm.motivation.id === m.id))
                                .filter(m => m.name.toLowerCase().includes(listSearch.toLowerCase()))
                                .map(motivation => (
                                  <button
                                    key={motivation.id}
                                    type="button"
                                    onClick={() => addMotivation(motivation.id)}
                                    disabled={addingMotivationId !== null}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {addingMotivationId === motivation.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                    {motivation.name}
                                  </button>
                                ))}
                              {motivations.filter(m => !record.recordMotivations.some(rm => rm.motivation.id === m.id)).filter(m => m.name.toLowerCase().includes(listSearch.toLowerCase())).length === 0 && listSearch.trim() && (
                                <button
                                  type="button"
                                  onClick={() => createAndAddMotivation(listSearch)}
                                  disabled={creatingMotivation}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 disabled:opacity-50 flex items-center gap-2 text-blue-600"
                                >
                                  {creatingMotivation ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                  Create &quot;{listSearch}&quot;
                                </button>
                              )}
                              {motivations.filter(m => !record.recordMotivations.some(rm => rm.motivation.id === m.id)).filter(m => m.name.toLowerCase().includes(listSearch.toLowerCase())).length === 0 && !listSearch.trim() && (
                                <div className="px-4 py-2 text-sm text-gray-400 dark:text-gray-500">No motivations available</div>
                              )}
                            </div>
                          )}
                          
                          {/* Tag Dropdown */}
                          {activeListTab === 'tags' && showTagDropdown && (
                            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {tags
                                .filter(t => !record.recordTags.some(rt => rt.tag.id === t.id))
                                .filter(t => t.name.toLowerCase().includes(listSearch.toLowerCase()))
                                .map(tag => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => addTag(tag.id)}
                                    disabled={addingTagId !== null}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {addingTagId === tag.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                    {tag.name}
                                  </button>
                                ))}
                              {tags.filter(t => !record.recordTags.some(rt => rt.tag.id === t.id)).filter(t => t.name.toLowerCase().includes(listSearch.toLowerCase())).length === 0 && listSearch.trim() && (
                                <button
                                  type="button"
                                  onClick={() => createAndAddTag(listSearch)}
                                  disabled={creatingTag}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 disabled:opacity-50 flex items-center gap-2 text-blue-600"
                                >
                                  {creatingTag ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                  Create &quot;{listSearch}&quot;
                                </button>
                              )}
                              {tags.filter(t => !record.recordTags.some(rt => rt.tag.id === t.id)).filter(t => t.name.toLowerCase().includes(listSearch.toLowerCase())).length === 0 && !listSearch.trim() && (
                                <div className="px-4 py-2 text-sm text-gray-400 dark:text-gray-500">No tags available</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Selected Items List */}
                      <div className="max-h-48 overflow-y-auto">
                        {activeListTab === 'motivations' ? (
                          <>
                            {record.recordMotivations.map((rm) => (
                              <div
                                key={rm.motivation.id}
                                className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0"
                              >
                                <span className="text-sm text-gray-700 dark:text-gray-300">{rm.motivation.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeMotivation(rm.motivation.id)}
                                  disabled={removingMotivation === rm.motivation.id}
                                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 disabled:opacity-50"
                                >
                                  {removingMotivation === rm.motivation.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '×'}
                                </button>
                              </div>
                            ))}
                            {record.recordMotivations.length === 0 && (
                              <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                                No motivations selected
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {record.recordTags.map((rt) => (
                              <div
                                key={rt.tag.id}
                                className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0"
                              >
                                <span className="text-sm text-gray-700 dark:text-gray-300">{rt.tag.name}</span>
                                <button
                                  type="button"
                                  onClick={() => removeTag(rt.tag.id)}
                                  disabled={removingTag === rt.tag.id}
                                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:text-gray-400 disabled:opacity-50"
                                >
                                  {removingTag === rt.tag.id ? <Loader2 className="w-3 h-3 animate-spin" /> : '×'}
                                </button>
                              </div>
                            ))}
                            {record.recordTags.length === 0 && (
                              <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                                No tags selected
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Notes Box */}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">—</span>
                          <span className="text-sm font-medium text-blue-600">NOTES</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditNotesValue(record.notes || '')
                            setShowEditNotesModal(true)
                          }}
                          className="p-1 hover:bg-gray-100 dark:bg-gray-800 rounded"
                        >
                          <Pencil className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        </button>
                      </div>
                      
                      {/* Notes Content */}
                      <div className="p-4">
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap min-h-[120px]">
                          {record.notes || <span className="text-gray-400 dark:text-gray-500">No notes added</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Conversation Board Tab */}
              {activeTab === 'conversation' && (
                <div className="space-y-4">
                  {/* Message Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addComment()}
                      placeholder="Write a message..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <button
                      onClick={addComment}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Send
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    💡 Tip: You can type @ to tag users and # to tag roles.
                  </p>

                  {/* Comments List */}
                  <div className="space-y-4 mt-6">
                    {comments.map((comment) => (
                      <div key={comment.id} className="border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {comment.user.name || comment.user.email}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400">commented</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{formatDate(comment.createdAt)}</p>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    {comments.length === 0 && (
                      <p className="text-center text-gray-400 dark:text-gray-500 py-8">No comments yet</p>
                    )}
                  </div>
                </div>
              )}

              {/* Activity Log Tab */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex gap-4">
                    <select
                      value={activityEventType}
                      onChange={(e) => {
                        setActivityEventType(e.target.value)
                        setTimeout(fetchActivityLogs, 0)
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    >
                      <option value="all">Showing All Events</option>
                      <option value="created">Created</option>
                      <option value="updated">Updated</option>
                      <option value="deleted">Deleted</option>
                    </select>
                    <select
                      value={activityUserId}
                      onChange={(e) => {
                        setActivityUserId(e.target.value)
                        setTimeout(fetchActivityLogs, 0)
                      }}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
                    >
                      <option value="all">From all users</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Activity List */}
                  <div className="space-y-4 mt-4">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex gap-4 border-b border-gray-100 pb-4">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Pencil className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {log.user?.name || log.user?.email || 'System'} {log.action} the property
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(log.createdAt)} • {log.source || 'Unknown'}
                          </p>
                          {log.field && (
                            <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                              <p className="text-sm">
                                <span className="font-medium">{log.field}</span>
                                {log.oldValue && (
                                  <span className="text-gray-400 dark:text-gray-500 line-through ml-2">{log.oldValue}</span>
                                )}
                                {log.newValue && (
                                  <span className="text-gray-900 dark:text-gray-100 ml-2">{log.newValue}</span>
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {activityLogs.length === 0 && (
                      <p className="text-center text-gray-400 dark:text-gray-500 py-8">No activity logs yet</p>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Info Tab - Custom Fields */}
              {activeTab === 'additional' && (
                <div className="space-y-6">
                  {/* Display existing custom fields */}
                  {customFields.length > 0 && (
                    <>
                      {/* Card style fields */}
                      {customFields.filter(f => f.displayType === 'card').length > 0 && (
                        <div className="grid grid-cols-4 gap-4">
                          {customFields.filter(f => f.displayType === 'card').map(field => {
                            const fieldValue = customFieldValues.find(v => v.fieldId === field.id)
                            return (
                              <div key={field.id} className="relative group text-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                                <button 
                                  onClick={() => setEditCustomFieldModal({ 
                                    fieldId: field.id, 
                                    name: field.name, 
                                    value: fieldValue?.value || '', 
                                    fieldType: field.fieldType 
                                  })}
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 hover:bg-gray-100 dark:bg-gray-800 rounded"
                                >
                                  <Pencil className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                                </button>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                  {field.fieldType === 'boolean' 
                                    ? (fieldValue?.value === 'true' ? 'Yes' : fieldValue?.value === 'false' ? 'No' : '—')
                                    : fieldValue?.value || '—'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{field.name}</p>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Row style fields */}
                      {customFields.filter(f => f.displayType === 'row').map(field => {
                        const fieldValue = customFieldValues.find(v => v.fieldId === field.id)
                        return (
                          <div key={field.id} className="relative group flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{field.name}</p>
                              <p className="font-medium text-gray-900 dark:text-gray-100">
                                {field.fieldType === 'boolean' 
                                  ? (fieldValue?.value === 'true' ? 'Yes' : fieldValue?.value === 'false' ? 'No' : '—')
                                  : fieldValue?.value || '—'}
                              </p>
                            </div>
                            <button 
                              onClick={() => setEditCustomFieldModal({ 
                                fieldId: field.id, 
                                name: field.name, 
                                value: fieldValue?.value || '', 
                                fieldType: field.fieldType 
                              })}
                              className="opacity-0 group-hover:opacity-100 transition p-2 hover:bg-gray-100 dark:bg-gray-800 rounded"
                            >
                              <Pencil className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            </button>
                          </div>
                        )
                      })}
                    </>
                  )}

                  {/* Add new field button */}
                  <div className="flex flex-col items-center justify-center text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
                    <button 
                      onClick={() => setShowAddFieldModal(true)}
                      className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-blue-50 flex items-center justify-center transition mb-3"
                    >
                      <Plus className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    </button>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Custom Field</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                      Custom fields apply to all records
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="col-span-4 space-y-6">
          {/* Temperature */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">PROPERTY TEMPERATURE</h3>
            <div className="flex items-center gap-2">
              {[
                { value: 'COLD', icon: Snowflake, color: 'blue', label: 'Cold' },
                { value: 'WARM', icon: Thermometer, color: 'yellow', label: 'Warm' },
                { value: 'HOT', icon: Flame, color: 'red', label: 'Hot' },
              ].map((temp) => (
                <button
                  key={temp.value}
                  onClick={() => handleTemperatureChange(temp.value)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition ${
                    record.temperature === temp.value
                      ? temp.color === 'blue'
                        ? 'bg-blue-100 border-blue-300 text-blue-700'
                        : temp.color === 'yellow'
                        ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                        : 'bg-red-100 border-red-300 text-red-700'
                      : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-800'
                  }`}
                >
                  <temp.icon className="w-4 h-4" />
                  <span className="text-sm">{temp.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Owner Info */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              {record.isCompany ? (
                <Building2 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              ) : (
                <User className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              )}
              <Link 
                href={`/dashboard/owners/${record.id}`}
                className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary hover:underline transition-colors"
              >
                {record.ownerFullName}
              </Link>
              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                {record.isCompany ? 'Company' : 'Person'}
              </span>
            </div>
            
            {/* Property Address */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Property Address</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{record.propertyStreet || '—'}</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {[record.propertyCity, record.propertyState, record.propertyZip].filter(Boolean).join(', ') || '—'}
              </p>
            </div>

            {/* Mailing Address */}
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Mailing Address</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">{record.mailingStreet || '—'}</p>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {[record.mailingCity, record.mailingState, record.mailingZip].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
          </div>

          {/* Phone Numbers */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                PHONE NUMBERS ({record.phoneNumbers.length}/30)
              </h3>
              <button
                onClick={() => setShowAddPhoneModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Add New Phone
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {record.phoneNumbers.map((phone) => (
                <div key={phone.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm">{formatPhoneNumber(phone.number)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      phone.type === 'MOBILE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}>
                      {phone.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {PHONE_STATUSES.filter(s => s.value !== 'NONE').map((status) => {
                      const isActive = phone.statuses.includes(status.value)
                      const StatusIcon = status.icon
                      return (
                        <button
                          key={status.value}
                          onClick={() => togglePhoneStatus(phone.id, status.value, phone.statuses)}
                          title={status.label}
                          className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            isActive
                              ? status.color === 'green'
                                ? 'bg-green-100 text-green-600'
                                : status.color === 'blue'
                                ? 'bg-blue-100 text-blue-600'
                                : status.color === 'red'
                                ? 'bg-red-100 text-red-600'
                                : status.color === 'yellow'
                                ? 'bg-yellow-100 text-yellow-600'
                                : status.color === 'orange'
                                ? 'bg-orange-100 text-orange-600'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                              : 'text-gray-300 hover:text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {StatusIcon && <StatusIcon className="w-3 h-3" />}
                        </button>
                      )
                    })}
                    <button
                      onClick={() => setConfirmDelete({ type: 'phone', id: phone.id })}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {record.phoneNumbers.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No phone numbers</p>
              )}
            </div>
          </div>

          {/* Emails */}
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                EMAILS ({record.emails.length}/15)
              </h3>
              <button
                onClick={() => setShowAddEmailModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Add New Email
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {record.emails.map((email) => (
                <div key={email.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    <span className="text-sm">{email.email}</span>
                    {email.isPrimary && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Primary</span>
                    )}
                  </div>
                  <button
                    onClick={() => setConfirmDelete({ type: 'email', id: email.id })}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {record.emails.length === 0 && (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No emails</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Phone Modal */}
      {showAddPhoneModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Phone Number</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newPhone.number}
                  onChange={(e) => setNewPhone({ ...newPhone, number: formatPhoneNumber(e.target.value) })}
                  placeholder="(555) 123-4567"
                  maxLength={14}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={newPhone.type}
                  onChange={(e) => setNewPhone({ ...newPhone, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="MOBILE">Mobile</option>
                  <option value="LANDLINE">Landline</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddPhoneModal(false)}
                disabled={savingPhone}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={addPhone}
                disabled={savingPhone}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
              >
                {savingPhone && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Phone
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Email Modal */}
      {showAddEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Email</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddEmailModal(false)}
                disabled={savingEmail}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={addEmail}
                disabled={savingEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
              >
                {savingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDelete.type && confirmDelete.id && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Are you sure?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              This will permanently delete this {confirmDelete.type === 'phone' ? 'phone number' : 'email'}. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete({ type: null, id: null })}
                disabled={deletingItem}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'phone') {
                    deletePhone(confirmDelete.id!)
                  } else {
                    deleteEmail(confirmDelete.id!)
                  }
                }}
                disabled={deletingItem}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 flex items-center gap-2"
              >
                {deletingItem && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Field Modal */}
      {editFieldModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Edit {editFieldModal.label}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{editFieldModal.label}</label>
              <input
                type={editFieldModal.type === 'date' ? 'date' : 'text'}
                value={editFieldModal.value}
                onChange={(e) => setEditFieldModal({ ...editFieldModal, value: e.target.value })}
                placeholder={`Enter ${editFieldModal.label.toLowerCase()}`}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditFieldModal(null)}
                disabled={savingField}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveFieldEdit}
                disabled={savingField}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
              >
                {savingField && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Custom Field Modal */}
      {showAddFieldModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Custom Field</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field Name</label>
                <input
                  type="text"
                  value={newFieldData.name}
                  onChange={(e) => setNewFieldData({ ...newFieldData, name: e.target.value })}
                  placeholder="e.g., Pool, Garage Size, HOA Fee"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Field Type</label>
                <select
                  value={newFieldData.fieldType}
                  onChange={(e) => setNewFieldData({ ...newFieldData, fieldType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Yes/No</option>
                  <option value="date">Date</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Display Style</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="displayType"
                      value="card"
                      checked={newFieldData.displayType === 'card'}
                      onChange={(e) => setNewFieldData({ ...newFieldData, displayType: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Card (compact)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="displayType"
                      value="row"
                      checked={newFieldData.displayType === 'row'}
                      onChange={(e) => setNewFieldData({ ...newFieldData, displayType: e.target.value })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm">Full Row</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowAddFieldModal(false); setNewFieldData({ name: '', fieldType: 'text', displayType: 'card' }) }}
                disabled={savingCustomField}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={createCustomField}
                disabled={!newFieldData.name.trim() || savingCustomField}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
              >
                {savingCustomField && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Field
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Custom Field Value Modal */}
      {editCustomFieldModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Edit {editCustomFieldModal.name}</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{editCustomFieldModal.name}</label>
              {editCustomFieldModal.fieldType === 'boolean' ? (
                <select
                  value={editCustomFieldModal.value}
                  onChange={(e) => setEditCustomFieldModal({ ...editCustomFieldModal, value: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                >
                  <option value="">Select...</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : editCustomFieldModal.fieldType === 'date' ? (
                <input
                  type="date"
                  value={editCustomFieldModal.value}
                  onChange={(e) => setEditCustomFieldModal({ ...editCustomFieldModal, value: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              ) : (
                <input
                  type={editCustomFieldModal.fieldType === 'number' ? 'number' : 'text'}
                  value={editCustomFieldModal.value}
                  onChange={(e) => setEditCustomFieldModal({ ...editCustomFieldModal, value: e.target.value })}
                  placeholder={`Enter ${editCustomFieldModal.name.toLowerCase()}`}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setEditCustomFieldModal(null)}
                disabled={savingCustomFieldValue}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveCustomFieldValue}
                disabled={savingCustomFieldValue}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
              >
                {savingCustomFieldValue && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Address Modal */}
      {showEditAddressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Property Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Street</label>
                <input
                  type="text"
                  value={editAddressData.street}
                  onChange={(e) => setEditAddressData({ ...editAddressData, street: e.target.value })}
                  placeholder="123 Main St"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                  <input
                    type="text"
                    value={editAddressData.city}
                    onChange={(e) => setEditAddressData({ ...editAddressData, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                  <input
                    type="text"
                    value={editAddressData.state}
                    onChange={(e) => setEditAddressData({ ...editAddressData, state: e.target.value })}
                    placeholder="State"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zip</label>
                  <input
                    type="text"
                    value={editAddressData.zip}
                    onChange={(e) => setEditAddressData({ ...editAddressData, zip: e.target.value })}
                    placeholder="12345"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditAddressModal(false)}
                disabled={savingAddress}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveAddress}
                disabled={savingAddress}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
              >
                {savingAddress && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Notes Modal */}
      {showEditNotesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Edit Notes</h3>
            <div>
              <textarea
                value={editNotesValue}
                onChange={(e) => setEditNotesValue(e.target.value)}
                placeholder="Add notes about this property..."
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditNotesModal(false)}
                disabled={savingNotes}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center gap-2"
              >
                {savingNotes && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
