'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  BackgroundVariant,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  ArrowLeft, 
  Save, 
  Play, 
  Pause,
  Settings,
  History,
  FileText,
  Plus,
  X,
  Zap,
  GitBranch,
  Clock,
  Tag,
  User,
  LayoutGrid,
  CheckSquare,
  Bell,
  Thermometer,
  CircleDot,
  ChevronRight,
  Trash2
} from 'lucide-react'

// Custom node components
import TriggerNode from '@/components/automation/TriggerNode'
import ActionNode from '@/components/automation/ActionNode'
import ConditionNode from '@/components/automation/ConditionNode'

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
}

interface Automation {
  id: string
  name: string
  description: string | null
  isActive: boolean
  isDraft: boolean
  workflowData: {
    nodes: Node[]
    edges: Edge[]
    viewport: { x: number; y: number; zoom: number }
  } | null
  folder: { id: string; name: string; color: string } | null
  runCount: number
  lastRunAt: string | null
}

// Trigger and Action definitions
const triggerCategories = [
  {
    name: 'Record',
    icon: FileText,
    items: [
      { type: 'record_created', label: 'Record Created', description: 'When a new record is created' },
      { type: 'record_updated', label: 'Record Updated', description: 'When any record field changes' },
    ]
  },
  {
    name: 'Status',
    icon: CircleDot,
    items: [
      { type: 'status_changed', label: 'Status Changed', description: 'When record status changes' },
    ]
  },
  {
    name: 'Temperature',
    icon: Thermometer,
    items: [
      { type: 'temperature_changed', label: 'Temperature Changed', description: 'When temperature changes' },
    ]
  },
  {
    name: 'Tags',
    icon: Tag,
    items: [
      { type: 'tag_added', label: 'Tag Added', description: 'When a tag is added to record' },
      { type: 'tag_removed', label: 'Tag Removed', description: 'When a tag is removed' },
    ]
  },
  {
    name: 'Assignment',
    icon: User,
    items: [
      { type: 'record_assigned', label: 'Record Assigned', description: 'When record is assigned to user' },
      { type: 'record_unassigned', label: 'Record Unassigned', description: 'When assignment is removed' },
    ]
  },
  {
    name: 'Board',
    icon: LayoutGrid,
    items: [
      { type: 'added_to_board', label: 'Added to Board', description: 'When record is added to board' },
      { type: 'moved_to_column', label: 'Moved to Column', description: 'When record moves to column' },
    ]
  },
  {
    name: 'Tasks',
    icon: CheckSquare,
    items: [
      { type: 'task_created', label: 'Task Created', description: 'When a task is created' },
      { type: 'task_completed', label: 'Task Completed', description: 'When a task is completed' },
    ]
  },
]

const actionCategories = [
  {
    name: 'Record',
    icon: FileText,
    items: [
      { type: 'update_status', label: 'Update Status', description: 'Change record status' },
      { type: 'update_temperature', label: 'Update Temperature', description: 'Change temperature' },
      { type: 'add_tag', label: 'Add Tag', description: 'Add a tag to record' },
      { type: 'remove_tag', label: 'Remove Tag', description: 'Remove a tag' },
      { type: 'assign_user', label: 'Assign to User', description: 'Assign record to user' },
      { type: 'mark_complete', label: 'Mark Complete', description: 'Set record as complete' },
    ]
  },
  {
    name: 'Board',
    icon: LayoutGrid,
    items: [
      { type: 'add_to_board', label: 'Add to Board', description: 'Add record to board column' },
      { type: 'move_to_column', label: 'Move to Column', description: 'Move to different column' },
    ]
  },
  {
    name: 'Tasks',
    icon: CheckSquare,
    items: [
      { type: 'create_task', label: 'Create Task', description: 'Create a new task' },
      { type: 'complete_task', label: 'Complete Task', description: 'Mark task complete' },
    ]
  },
  {
    name: 'Notification',
    icon: Bell,
    items: [
      { type: 'send_notification', label: 'Send Notification', description: 'In-app notification' },
    ]
  },
  {
    name: 'Logic',
    icon: GitBranch,
    items: [
      { type: 'if_else', label: 'If/Else', description: 'Conditional branching', nodeType: 'condition' },
      { type: 'wait', label: 'Wait', description: 'Delay before next action' },
    ]
  },
]

export default function AutomationBuilderPage() {
  const router = useRouter()
  const params = useParams()
  const automationId = params.id as string

  const [automation, setAutomation] = useState<Automation | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'builder' | 'settings' | 'history' | 'logs'>('builder')
  
  // Panel state
  const [showPanel, setShowPanel] = useState(false)
  const [panelMode, setPanelMode] = useState<'trigger' | 'action' | 'edit'>('trigger')
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    fetchAutomation()
  }, [automationId])

  const fetchAutomation = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/automations/${automationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setAutomation(data)
        
        // Load workflow data
        if (data.workflowData) {
          setNodes(data.workflowData.nodes || [])
          setEdges(data.workflowData.edges || [])
        }
      } else {
        router.push('/dashboard/automations')
      }
    } catch (error) {
      console.error('Error fetching automation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!automation) return
    setSaving(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/automations/${automationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          workflowData: {
            nodes,
            edges,
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setAutomation(data)
      }
    } catch (error) {
      console.error('Error saving automation:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async () => {
    if (!automation) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/automations/${automationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !automation.isActive }),
      })

      if (res.ok) {
        const data = await res.json()
        setAutomation(data)
      }
    } catch (error) {
      console.error('Error toggling automation:', error)
    }
  }

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2 },
          },
          eds
        )
      )
    },
    [setEdges]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setPanelMode('edit')
    setShowPanel(true)
  }, [])

  const addNode = (type: string, label: string, nodeType: string = 'action') => {
    const newNode: Node = {
      id: `${nodeType}-${Date.now()}`,
      type: nodeType,
      position: { x: 250, y: nodes.length * 150 + 100 },
      data: { 
        label, 
        type,
        config: {} 
      },
    }
    setNodes((nds) => [...nds, newNode])
    setShowPanel(false)
  }

  const addTriggerNode = (type: string, label: string) => {
    // Check if trigger already exists
    const hasTrigger = nodes.some((n) => n.type === 'trigger')
    if (hasTrigger) {
      alert('Only one trigger is allowed per automation')
      return
    }

    const newNode: Node = {
      id: `trigger-${Date.now()}`,
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: { 
        label, 
        type,
        config: {} 
      },
    }
    setNodes((nds) => [...nds, newNode])
    setShowPanel(false)
  }

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId))
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId))
    setShowPanel(false)
    setSelectedNode(null)
  }

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName)
    } else {
      newExpanded.add(categoryName)
    }
    setExpandedCategories(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!automation) {
    return null
  }

  const hasTrigger = nodes.some((n) => n.type === 'trigger')

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/automations')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">{automation.name}</h1>
            {automation.folder && (
              <span 
                className="text-xs px-2 py-0.5 rounded"
                style={{ backgroundColor: automation.folder.color + '20', color: automation.folder.color }}
              >
                {automation.folder.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {automation.isDraft && (
            <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Draft</span>
          )}
          
          <button
            onClick={handleToggleActive}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              automation.isActive
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {automation.isActive ? (
              <>
                <Pause className="w-4 h-4" />
                Active
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Inactive
              </>
            )}
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4">
        <div className="flex gap-6">
          {[
            { id: 'builder', label: 'Builder', icon: GitBranch },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'history', label: 'History', icon: History },
            { id: 'logs', label: 'Logs', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 py-3 border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
            <Controls />
          </ReactFlow>

          {/* Add Trigger/Action Buttons */}
          {!hasTrigger && (
            <div className="absolute top-4 left-4">
              <button
                onClick={() => {
                  setPanelMode('trigger')
                  setShowPanel(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg"
              >
                <Zap className="w-4 h-4" />
                Add Trigger
              </button>
            </div>
          )}

          {hasTrigger && (
            <div className="absolute top-4 left-4">
              <button
                onClick={() => {
                  setPanelMode('action')
                  setShowPanel(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Add Action
              </button>
            </div>
          )}
        </div>

        {/* Right Panel */}
        {showPanel && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            {/* Panel Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                {panelMode === 'trigger' && 'Add Trigger'}
                {panelMode === 'action' && 'Add Action'}
                {panelMode === 'edit' && 'Edit Node'}
              </h3>
              <button
                onClick={() => {
                  setShowPanel(false)
                  setSelectedNode(null)
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {panelMode === 'trigger' && (
                <div className="space-y-2">
                  {triggerCategories.map((category) => (
                    <div key={category.name} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category.name)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          <category.icon className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-sm">{category.name}</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition ${expandedCategories.has(category.name) ? 'rotate-90' : ''}`} />
                      </button>
                      {expandedCategories.has(category.name) && (
                        <div className="p-2 space-y-1">
                          {category.items.map((item) => (
                            <button
                              key={item.type}
                              onClick={() => addTriggerNode(item.type, item.label)}
                              className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 hover:text-blue-600"
                            >
                              <div className="font-medium text-sm">{item.label}</div>
                              <div className="text-xs text-gray-500">{item.description}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {panelMode === 'action' && (
                <div className="space-y-2">
                  {actionCategories.map((category) => (
                    <div key={category.name} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category.name)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex items-center gap-2">
                          <category.icon className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-sm">{category.name}</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition ${expandedCategories.has(category.name) ? 'rotate-90' : ''}`} />
                      </button>
                      {expandedCategories.has(category.name) && (
                        <div className="p-2 space-y-1">
                          {category.items.map((item) => (
                            <button
                              key={item.type}
                              onClick={() => addNode(item.type, item.label, item.nodeType || 'action')}
                              className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 hover:text-blue-600"
                            >
                              <div className="font-medium text-sm">{item.label}</div>
                              <div className="text-xs text-gray-500">{item.description}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {panelMode === 'edit' && selectedNode && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Node Type</label>
                    <p className="text-sm text-gray-600 capitalize">{selectedNode.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                    <p className="text-sm text-gray-600">{selectedNode.data.label}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                    <p className="text-sm text-gray-600">{selectedNode.data.type}</p>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <button
                      onClick={() => deleteNode(selectedNode.id)}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg w-full justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Node
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
