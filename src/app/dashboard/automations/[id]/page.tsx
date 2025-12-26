'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
import ConditionNode, { branchColors, noneColor } from '@/components/automation/ConditionNode'
import BranchNode from '@/components/automation/BranchNode'
import NodeConfigPanel from '@/components/automation/NodeConfigPanel'
import AddButtonEdge from '@/components/automation/AddButtonEdge'

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  branch: BranchNode,
}

const edgeTypes = {
  addButton: AddButtonEdge,
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

interface AutomationLog {
  id: string
  automationId: string
  recordId: string | null
  triggeredBy: string
  status: string
  startedAt: string
  completedAt: string | null
  errorMessage: string | null
  createdAt: string
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
  
  // Logs state
  const [logs, setLogs] = useState<AutomationLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  // Test workflow state
  const [showTestModal, setShowTestModal] = useState(false)
  const [testRecords, setTestRecords] = useState<{ id: string; ownerFullName: string; propertyStreet: string | null }[]>([])
  const [testRecordId, setTestRecordId] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchAutomation()
    fetchTestRecords()
  }, [automationId])

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs()
    }
  }, [activeTab, automationId])

  const fetchLogs = async () => {
    setLogsLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/automations/${automationId}/logs?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
    } finally {
      setLogsLoading(false)
    }
  }

  const fetchTestRecords = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/records?limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setTestRecords(data.records || [])
      }
    } catch (error) {
      console.error('Error fetching test records:', error)
    }
  }

  const handleTestWorkflow = async () => {
    if (!testRecordId) return
    setTesting(true)
    setTestResult(null)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/automations/${automationId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recordId: testRecordId }),
      })

      const data = await res.json()

      if (res.ok) {
        setTestResult({
          success: true,
          message: `Test completed successfully! Status: ${data.log?.status || 'completed'}`,
        })
        // Refresh logs
        if (activeTab === 'logs') {
          fetchLogs()
        }
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Test failed',
        })
      }
    } catch (error) {
      console.error('Error testing workflow:', error)
      setTestResult({
        success: false,
        message: 'Failed to run test',
      })
    } finally {
      setTesting(false)
    }
  }

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
            type: 'addButton',
            animated: false,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
            style: { strokeWidth: 2, stroke: '#6366f1' },
            data: { onAddAction: openAddActionPanel },
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

  const openAddActionPanel = () => {
    setPanelMode('action')
    setShowPanel(true)
  }

  const addNode = (type: string, label: string, nodeType: string = 'action') => {
    const nodeId = `${nodeType}-${Date.now()}`
    
    // Find the last node to connect from (node without outgoing edges)
    const nodesWithoutOutgoing = nodes.filter(
      (n) => !edges.some((e) => e.source === n.id)
    )
    const lastNode = nodesWithoutOutgoing[nodesWithoutOutgoing.length - 1]
    
    // Calculate position below the last node
    const yPosition = lastNode ? lastNode.position.y + 200 : nodes.length * 150 + 100
    const xPosition = lastNode ? lastNode.position.x : 250

    const newNode: Node = {
      id: nodeId,
      type: nodeType,
      position: { x: xPosition, y: yPosition },
      data: { 
        label, 
        type,
        config: {},
        onAddAction: openAddActionPanel,
        onDelete: () => deleteNode(nodeId),
        onCopy: () => copyNode(nodeId),
      },
    }
    setNodes((nds) => [...nds, newNode])
    
    // Create edge from last node to new node
    if (lastNode) {
      const newEdge: Edge = {
        id: `edge-${lastNode.id}-${nodeId}`,
        source: lastNode.id,
        target: nodeId,
        type: 'addButton',
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        style: { strokeWidth: 2, stroke: '#6366f1' },
        data: { onAddAction: openAddActionPanel },
      }
      setEdges((eds) => [...eds, newEdge])
    }
    
    setShowPanel(false)
  }

  const addTriggerNode = (type: string, label: string) => {
    // Check if trigger already exists
    const hasTrigger = nodes.some((n) => n.type === 'trigger')
    if (hasTrigger) {
      alert('Only one trigger is allowed per automation')
      return
    }

    const nodeId = `trigger-${Date.now()}`
    const newNode: Node = {
      id: nodeId,
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: { 
        label, 
        type,
        config: {},
        onAddAction: openAddActionPanel,
        onDelete: () => deleteNode(nodeId),
        onCopy: () => copyNode(nodeId),
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

  const copyNode = (nodeId: string) => {
    const nodeToCopy = nodes.find((n) => n.id === nodeId)
    if (!nodeToCopy) return

    const newNodeId = `${nodeToCopy.type}-${Date.now()}`
    const newNode: Node = {
      ...nodeToCopy,
      id: newNodeId,
      position: { x: nodeToCopy.position.x + 50, y: nodeToCopy.position.y + 50 },
      data: {
        ...nodeToCopy.data,
        onAddAction: openAddActionPanel,
        onDelete: () => deleteNode(newNodeId),
        onCopy: () => copyNode(newNodeId),
      },
    }
    setNodes((nds) => [...nds, newNode])
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

  // Compute nodes with edge information for showing/hiding (+) buttons
  const nodesWithEdgeInfo = useMemo(() => {
    return nodes.map((node) => {
      // Check if this node has outgoing edges
      const hasOutgoingEdge = edges.some((edge) => edge.source === node.id)
      
      // For condition nodes, check specific handles
      const hasYesEdge = edges.some((edge) => edge.source === node.id && edge.sourceHandle === 'yes')
      const hasNoEdge = edges.some((edge) => edge.source === node.id && edge.sourceHandle === 'no')

      return {
        ...node,
        data: {
          ...node.data,
          hasOutgoingEdge,
          hasYesEdge,
          hasNoEdge,
          onAddAction: openAddActionPanel,
          onDelete: () => deleteNode(node.id),
          onCopy: () => copyNode(node.id),
        },
      }
    })
  }, [nodes, edges])

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
          {automation.isDraft && !automation.isActive && (
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
            onClick={() => setShowTestModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <Play className="w-4 h-4" />
            Test
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

      {/* Test Workflow Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Test Automation</h2>
            <p className="text-sm text-gray-600 mb-4">
              Select a record to test this automation with. The automation will run immediately with the selected record.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Record
              </label>
              <select
                value={testRecordId}
                onChange={(e) => setTestRecordId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a record...</option>
                {testRecords.map((record) => (
                  <option key={record.id} value={record.id}>
                    {record.ownerFullName} - {record.propertyStreet || 'No address'}
                  </option>
                ))}
              </select>
            </div>
            {testResult && (
              <div className={`p-3 rounded-lg mb-4 ${
                testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {testResult.message}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTestModal(false)
                  setTestRecordId('')
                  setTestResult(null)
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Close
              </button>
              <button
                onClick={handleTestWorkflow}
                disabled={!testRecordId || testing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {testing ? 'Running...' : 'Run Test'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Execution Logs</h2>
                <button
                  onClick={fetchLogs}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Refresh
                </button>
              </div>

              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : logs.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No execution logs yet</h3>
                  <p className="text-gray-500">
                    Logs will appear here when the automation runs
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Triggered By</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {logs.map((log) => {
                        const startedAt = new Date(log.startedAt)
                        const completedAt = log.completedAt ? new Date(log.completedAt) : null
                        const duration = completedAt 
                          ? Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
                          : null

                        return (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                log.status === 'completed' 
                                  ? 'bg-green-100 text-green-700'
                                  : log.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : log.status === 'running'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {log.triggeredBy.replace(/_/g, ' ')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {startedAt.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {duration !== null ? `${duration}s` : '-'}
                            </td>
                            <td className="px-4 py-3 text-sm text-red-600 max-w-xs truncate">
                              {log.errorMessage || '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-lg font-semibold mb-6">Automation Settings</h2>
              <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900">{automation.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-gray-600">{automation.description || 'No description'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
                  <p className="text-gray-600">{automation.folder?.name || 'Uncategorized'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Runs</label>
                  <p className="text-gray-900">{automation.runCount}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Run</label>
                  <p className="text-gray-600">
                    {automation.lastRunAt 
                      ? new Date(automation.lastRunAt).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-lg font-semibold mb-6">Version History</h2>
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
                <p className="text-gray-500">
                  Version history will be available in a future update
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Builder Tab - Canvas */}
        {activeTab === 'builder' && (
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodesWithEdgeInfo}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
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
        </div>
        )}

        {/* Right Panel */}
        {showPanel && (
          <div className="w-[420px] bg-white border-l border-gray-200 flex flex-col overflow-hidden">
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
                <NodeConfigPanel
                  node={selectedNode}
                  onClose={() => {
                    setShowPanel(false)
                    setSelectedNode(null)
                  }}
                  onSave={(nodeId, config) => {
                    const node = nodes.find(n => n.id === nodeId)
                    
                    // Update the node config
                    setNodes((nds) =>
                      nds.map((n) =>
                        n.id === nodeId
                          ? { ...n, data: { ...n.data, config } }
                          : n
                      )
                    )

                    // If this is a condition node, create/update branch nodes
                    if (node?.type === 'condition' && config.branches) {
                      const branches = config.branches as Array<{id: string, name: string, conditions: Array<{field: string, operator: string, value: string, logic?: string}>}>
                      const conditionNode = node
                      
                      // Remove existing branch nodes for this condition
                      const existingBranchIds = nodes
                        .filter(n => n.type === 'branch' && n.data.parentConditionId === nodeId)
                        .map(n => n.id)
                      
                      setNodes((nds) => nds.filter(n => !existingBranchIds.includes(n.id)))
                      setEdges((eds) => eds.filter(e => 
                        !existingBranchIds.includes(e.source) && !existingBranchIds.includes(e.target)
                      ))

                      // Create new branch nodes
                      const allBranches = [
                        ...branches,
                        { id: 'none', name: 'None', conditions: [] }
                      ]
                      
                      const newBranchNodes: Node[] = allBranches.map((branch, index) => {
                        const color = branch.id === 'none' ? noneColor : branchColors[index % branchColors.length]
                        const xOffset = (index - (allBranches.length - 1) / 2) * 280
                        
                        return {
                          id: `branch-${nodeId}-${branch.id}`,
                          type: 'branch',
                          position: { 
                            x: conditionNode.position.x + xOffset, 
                            y: conditionNode.position.y + 150 
                          },
                          data: {
                            label: branch.name,
                            branchName: branch.name,
                            branchIndex: index,
                            conditions: branch.conditions,
                            color,
                            parentConditionId: nodeId,
                            onAddAction: openAddActionPanel,
                            onDelete: () => deleteNode(`branch-${nodeId}-${branch.id}`),
                            onCopy: () => copyNode(`branch-${nodeId}-${branch.id}`),
                          },
                        }
                      })

                      // Create edges from condition to branches
                      const newEdges: Edge[] = allBranches.map((branch, index) => ({
                        id: `edge-${nodeId}-branch-${branch.id}`,
                        source: nodeId,
                        target: `branch-${nodeId}-${branch.id}`,
                        type: 'addButton',
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
                        style: { strokeWidth: 2, stroke: '#6366f1' },
                        data: { onAddAction: openAddActionPanel },
                      }))

                      setNodes((nds) => [...nds, ...newBranchNodes])
                      setEdges((eds) => [...eds, ...newEdges])
                    }

                    setShowPanel(false)
                    setSelectedNode(null)
                  }}
                  onDelete={deleteNode}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
