import { prisma } from '@/lib/prisma'

// Types for automation workflow
interface WorkflowNode {
  id: string
  type: 'trigger' | 'action' | 'condition'
  data: {
    label: string
    type: string
    config: Record<string, unknown>
  }
  position: { x: number; y: number }
}

interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
}

interface WorkflowData {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  viewport: { x: number; y: number; zoom: number }
}

interface ExecutionContext {
  recordId: string
  automationId: string
  logId: string
  triggeredBy: string
  variables: Record<string, unknown>
}

// Find automations that match a trigger type
export async function findMatchingAutomations(
  triggerType: string,
  ownerId: string,
  filters?: Record<string, unknown>
) {
  const automations = await prisma.automation.findMany({
    where: {
      createdById: ownerId,
      isActive: true,
    },
  })

  // Filter automations that have the matching trigger
  return automations.filter((automation) => {
    const workflowData = automation.workflowData as WorkflowData | null
    if (!workflowData?.nodes) return false

    const triggerNode = workflowData.nodes.find((n) => n.type === 'trigger')
    if (!triggerNode) return false

    // Check if trigger type matches
    if (triggerNode.data.type !== triggerType) return false

    // TODO: Check trigger filters/conditions
    return true
  })
}

// Execute an automation for a record
export async function executeAutomation(
  automationId: string,
  recordId: string,
  triggeredBy: string
) {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
  })

  if (!automation || !automation.isActive) {
    console.log(`Automation ${automationId} not found or inactive`)
    return
  }

  const workflowData = automation.workflowData as WorkflowData | null
  if (!workflowData?.nodes || workflowData.nodes.length === 0) {
    console.log(`Automation ${automationId} has no workflow nodes`)
    return
  }

  // Create execution log
  const log = await prisma.automationLog.create({
    data: {
      automationId,
      recordId,
      triggeredBy,
      status: 'running',
      steps: [],
    },
  })

  const context: ExecutionContext = {
    recordId,
    automationId,
    logId: log.id,
    triggeredBy,
    variables: {},
  }

  try {
    // Find the trigger node
    const triggerNode = workflowData.nodes.find((n) => n.type === 'trigger')
    if (!triggerNode) {
      throw new Error('No trigger node found')
    }

    // Execute the workflow starting from trigger
    await executeNode(triggerNode.id, workflowData, context)

    // Mark as completed
    await prisma.automationLog.update({
      where: { id: log.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    })

    // Update automation stats
    await prisma.automation.update({
      where: { id: automationId },
      data: {
        runCount: { increment: 1 },
        lastRunAt: new Date(),
      },
    })
  } catch (error) {
    console.error(`Automation ${automationId} failed:`, error)

    await prisma.automationLog.update({
      where: { id: log.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}

// Execute a single node and continue to connected nodes
async function executeNode(
  nodeId: string,
  workflowData: WorkflowData,
  context: ExecutionContext
) {
  const node = workflowData.nodes.find((n) => n.id === nodeId)
  if (!node) return

  console.log(`Executing node: ${node.data.label} (${node.data.type})`)

  // Execute based on node type
  if (node.type === 'action') {
    await executeAction(node, context)
  } else if (node.type === 'condition') {
    const result = await evaluateCondition(node, context)
    // Find the appropriate edge based on condition result
    const edges = workflowData.edges.filter((e) => e.source === nodeId)
    const nextEdge = edges.find((e) => 
      result ? e.sourceHandle === 'yes' : e.sourceHandle === 'no'
    )
    if (nextEdge) {
      await executeNode(nextEdge.target, workflowData, context)
    }
    return
  }

  // Find and execute connected nodes
  const outgoingEdges = workflowData.edges.filter((e) => e.source === nodeId)
  for (const edge of outgoingEdges) {
    await executeNode(edge.target, workflowData, context)
  }
}

// Helper to create activity log for automation actions
async function logAutomationActivity(
  recordId: string,
  automationId: string,
  actionType: string,
  description: string,
  newValue?: string
) {
  try {
    // Get the automation to find the owner
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
      select: { createdById: true, name: true },
    })

    if (automation) {
      await prisma.recordActivityLog.create({
        data: {
          recordId,
          action: `automation_${actionType}`,
          field: actionType,
          newValue: newValue || description,
          source: `Automation: ${automation.name}`,
        },
      })
    }
  } catch (error) {
    console.error('Failed to log automation activity:', error)
  }
}

// Execute an action node
async function executeAction(node: WorkflowNode, context: ExecutionContext) {
  const { type, config } = node.data
  const { recordId, automationId } = context

  switch (type) {
    case 'update_status':
      if (config.statusId) {
        const status = await prisma.status.findUnique({ where: { id: config.statusId as string } })
        await prisma.record.update({
          where: { id: recordId },
          data: { statusId: config.statusId as string },
        })
        await logAutomationActivity(recordId, automationId, type, `Status changed to "${status?.name || 'Unknown'}"`, status?.name || 'Unknown')
      }
      break

    case 'update_temperature':
      if (config.temperature) {
        await prisma.record.update({
          where: { id: recordId },
          data: { temperature: config.temperature as string },
        })
        await logAutomationActivity(recordId, automationId, type, `Temperature changed to "${config.temperature}"`, config.temperature as string)
      }
      break

    case 'add_tag':
      if (config.tagId) {
        const tag = await prisma.tag.findUnique({ where: { id: config.tagId as string } })
        await prisma.recordTag.upsert({
          where: {
            recordId_tagId: {
              recordId,
              tagId: config.tagId as string,
            },
          },
          create: {
            recordId,
            tagId: config.tagId as string,
          },
          update: {},
        })
        await logAutomationActivity(recordId, automationId, type, `Tag "${tag?.name || 'Unknown'}" added`, tag?.name || 'Unknown')
      }
      break

    case 'remove_tag':
      if (config.tagId) {
        const tag = await prisma.tag.findUnique({ where: { id: config.tagId as string } })
        await prisma.recordTag.deleteMany({
          where: {
            recordId,
            tagId: config.tagId as string,
          },
        })
        await logAutomationActivity(recordId, automationId, type, `Tag "${tag?.name || 'Unknown'}" removed`, tag?.name || 'Unknown')
      }
      break

    case 'assign_user':
      if (config.userId) {
        const user = await prisma.user.findUnique({ where: { id: config.userId as string } })
        await prisma.record.update({
          where: { id: recordId },
          data: { assignedToId: config.userId as string },
        })
        await logAutomationActivity(recordId, automationId, type, `Assigned to "${user?.name || user?.email || 'Unknown'}"`, user?.name || user?.email || 'Unknown')
      }
      break

    case 'mark_complete':
      await prisma.record.update({
        where: { id: recordId },
        data: { isComplete: true },
      })
      await logAutomationActivity(recordId, automationId, type, 'Marked as complete')
      break

    case 'add_to_board':
      if (config.boardId && config.columnId) {
        // Get max order in column
        const maxOrder = await prisma.recordBoardPosition.aggregate({
          where: { columnId: config.columnId as string },
          _max: { order: true },
        })

        await prisma.recordBoardPosition.upsert({
          where: {
            recordId_columnId: {
              recordId,
              columnId: config.columnId as string,
            },
          },
          create: {
            recordId,
            columnId: config.columnId as string,
            order: (maxOrder._max.order ?? -1) + 1,
          },
          update: {},
        })
      }
      break

    case 'create_task':
      if (config.title) {
        // Get the record's createdById for the task
        const record = await prisma.record.findUnique({
          where: { id: recordId },
          select: { createdById: true },
        })

        if (record?.createdById) {
          await prisma.task.create({
            data: {
              title: config.title as string,
              description: (config.description as string) || null,
              recordId,
              createdById: record.createdById,
              assignedToId: (config.assignedToId as string) || null,
              dueDate: config.dueDate ? new Date(config.dueDate as string) : null,
              priority: (config.priority as string) || 'MEDIUM',
            },
          })
        }
      }
      break

    case 'send_notification':
      if (config.userId && config.title && config.message) {
        await prisma.notification.create({
          data: {
            userId: config.userId as string,
            type: 'AUTOMATION',
            title: config.title as string,
            message: config.message as string,
            recordId,
          },
        })
      }
      break

    case 'wait':
      // For now, we'll skip wait actions in synchronous execution
      // In a production system, this would queue the continuation
      console.log(`Wait action: ${config.duration} ${config.unit}`)
      break

    default:
      console.log(`Unknown action type: ${type}`)
  }
}

// Evaluate a condition node
async function evaluateCondition(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<boolean> {
  const { config } = node.data
  const { recordId } = context

  const record = await prisma.record.findUnique({
    where: { id: recordId },
    include: {
      status: true,
      recordTags: { include: { tag: true } },
      recordMotivations: { include: { motivation: true } },
    },
  })

  if (!record) return false

  const field = config.field as string
  const operator = config.operator as string
  const value = config.value

  switch (field) {
    case 'status':
      if (operator === 'equals') {
        return record.statusId === value
      }
      break

    case 'temperature':
      if (operator === 'equals') {
        return record.temperature === value
      }
      break

    case 'isComplete':
      return record.isComplete === (value === 'true' || value === true)

    case 'hasTag':
      return record.recordTags.some((rt) => rt.tagId === value)

    case 'hasMotivation':
      return record.recordMotivations.some((rm) => rm.motivationId === value)

    case 'isAssigned':
      if (value === 'any') {
        return record.assignedToId !== null
      }
      return record.assignedToId === value

    default:
      console.log(`Unknown condition field: ${field}`)
  }

  return false
}

// Trigger automation events - call these from your API routes
export async function triggerRecordCreated(recordId: string, ownerId: string) {
  const automations = await findMatchingAutomations('record_created', ownerId)
  for (const automation of automations) {
    await executeAutomation(automation.id, recordId, 'record_created')
  }
}

export async function triggerStatusChanged(
  recordId: string,
  ownerId: string,
  oldStatusId: string | null,
  newStatusId: string | null
) {
  const automations = await findMatchingAutomations('status_changed', ownerId)
  for (const automation of automations) {
    await executeAutomation(automation.id, recordId, 'status_changed')
  }
}

export async function triggerTagAdded(
  recordId: string,
  ownerId: string,
  tagId: string
) {
  const automations = await findMatchingAutomations('tag_added', ownerId)
  for (const automation of automations) {
    await executeAutomation(automation.id, recordId, 'tag_added')
  }
}

export async function triggerRecordAssigned(
  recordId: string,
  ownerId: string,
  userId: string
) {
  const automations = await findMatchingAutomations('record_assigned', ownerId)
  for (const automation of automations) {
    await executeAutomation(automation.id, recordId, 'record_assigned')
  }
}

export async function triggerTaskCompleted(
  recordId: string,
  ownerId: string,
  taskId: string
) {
  const automations = await findMatchingAutomations('task_completed', ownerId)
  for (const automation of automations) {
    await executeAutomation(automation.id, recordId, 'task_completed')
  }
}
