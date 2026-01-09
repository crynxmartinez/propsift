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

// Helper to add a step to the automation log
async function addStepToLog(
  logId: string,
  step: {
    nodeId: string
    nodeType: string
    nodeLabel: string
    actionType?: string
    status: 'started' | 'completed' | 'failed' | 'skipped'
    message?: string
    result?: string
    startedAt: Date
    completedAt?: Date
    error?: string
  }
) {
  try {
    const log = await prisma.automationLog.findUnique({
      where: { id: logId },
      select: { steps: true },
    })
    
    const currentSteps = (log?.steps as Record<string, unknown>[]) || []
    currentSteps.push(step as Record<string, unknown>)
    
    await prisma.automationLog.update({
      where: { id: logId },
      data: { steps: currentSteps as unknown as import('@prisma/client').Prisma.InputJsonValue },
    })
  } catch (error) {
    console.error('Failed to add step to log:', error)
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

  const stepStartedAt = new Date()
  console.log(`Executing node: ${node.data.label} (${node.data.type})`)

  // Log step start
  await addStepToLog(context.logId, {
    nodeId: node.id,
    nodeType: node.type,
    nodeLabel: node.data.label,
    actionType: node.data.type,
    status: 'started',
    message: `Executing ${node.data.label}`,
    startedAt: stepStartedAt,
  })

  try {
    // Execute based on node type
    if (node.type === 'trigger') {
      // Log trigger entry
      await addStepToLog(context.logId, {
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.data.label,
        actionType: node.data.type,
        status: 'completed',
        message: `Record entered automation via ${node.data.label}`,
        startedAt: stepStartedAt,
        completedAt: new Date(),
      })
    } else if (node.type === 'action') {
      await executeAction(node, context)
      await addStepToLog(context.logId, {
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.data.label,
        actionType: node.data.type,
        status: 'completed',
        message: `Action completed: ${node.data.label}`,
        startedAt: stepStartedAt,
        completedAt: new Date(),
      })
    } else if (node.type === 'condition') {
      // Find all branch nodes connected to this condition
      const edges = workflowData.edges.filter((e) => e.source === nodeId)
      const branchNodes = edges
        .map(e => workflowData.nodes.find(n => n.id === e.target))
        .filter(n => n && n.id.startsWith('branch-'))
      
      let matchedBranch: WorkflowNode | null = null
      let noneBranch: WorkflowNode | null = null
      
      // Evaluate each branch's conditions
      for (const branchNode of branchNodes) {
        if (!branchNode) continue
        
        const branchData = branchNode.data as unknown as { 
          branchName: string
          conditions: Array<{ field: string; operator: string; value: string; logic?: string }>
        }
        
        // Check for "None" branch (fallback/else branch)
        if (branchData.branchName === 'None' || !branchData.conditions || branchData.conditions.length === 0) {
          noneBranch = branchNode
          continue
        }
        
        // Evaluate this branch's conditions
        const branchResult = await evaluateBranchConditions(branchData.conditions, context)
        if (branchResult) {
          matchedBranch = branchNode
          break
        }
      }
      
      // Use matched branch or fall back to None branch
      const selectedBranch = matchedBranch || noneBranch
      const branchName = selectedBranch 
        ? (selectedBranch.data as unknown as { branchName: string }).branchName 
        : 'No match'
      
      await addStepToLog(context.logId, {
        nodeId: node.id,
        nodeType: node.type,
        nodeLabel: node.data.label,
        actionType: node.data.type,
        status: 'completed',
        message: `Condition evaluated: ${node.data.label}`,
        result: `Branch: ${branchName}`,
        startedAt: stepStartedAt,
        completedAt: new Date(),
      })
      
      // Execute the selected branch
      if (selectedBranch) {
        await executeNode(selectedBranch.id, workflowData, context)
      }
      return
    }
  } catch (error) {
    await addStepToLog(context.logId, {
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: node.data.label,
      actionType: node.data.type,
      status: 'failed',
      message: `Failed: ${node.data.label}`,
      error: error instanceof Error ? error.message : 'Unknown error',
      startedAt: stepStartedAt,
      completedAt: new Date(),
    })
    throw error
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
          // Calculate due date if not "no due date"
          let dueDate: Date | null = null
          if (!config.noDueDate && config.dueDate) {
            dueDate = new Date(config.dueDate as string)
          }

          await prisma.task.create({
            data: {
              title: config.title as string,
              description: (config.description as string) || null,
              recordId,
              createdById: record.createdById,
              assignedToId: (config.assignmentType === 'round_robin') ? null : ((config.assignedToId as string) || null),
              dueDate,
              priority: (config.priority as string) || 'MEDIUM',
              assignmentType: ((config.assignmentType as string) || 'manual').toUpperCase(),
              notifyAfter: (config.notifyAfterValue as number) || null,
              notifyAfterUnit: (config.notifyAfterUnit as string) || null,
              recurrence: (config.recurrence as string) || null,
            },
          })

          await logAutomationActivity(recordId, automationId, type, `Task "${config.title}" created`, config.title as string)
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

    case 'update_call_result':
      if (config.callResultId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma.record as any).update({
          where: { id: recordId },
          data: { callResultId: config.callResultId as string },
        })
        await logAutomationActivity(recordId, automationId, type, `Call result updated`, config.callResultId as string)
      }
      break

    case 'increment_call_attempts':
      await prisma.record.update({
        where: { id: recordId },
        data: { callAttempts: { increment: 1 } },
      })
      await logAutomationActivity(recordId, automationId, type, 'Call attempts incremented by 1')
      break

    case 'add_motivation':
      if (config.motivationId) {
        const motivation = await prisma.motivation.findUnique({ where: { id: config.motivationId as string } })
        await prisma.recordMotivation.upsert({
          where: {
            recordId_motivationId: {
              recordId,
              motivationId: config.motivationId as string,
            },
          },
          create: {
            recordId,
            motivationId: config.motivationId as string,
          },
          update: {},
        })
        await logAutomationActivity(recordId, automationId, type, `Motivation "${motivation?.name || 'Unknown'}" added`, motivation?.name || 'Unknown')
      }
      break

    case 'remove_motivation':
      if (config.motivationId) {
        const motivation = await prisma.motivation.findUnique({ where: { id: config.motivationId as string } })
        await prisma.recordMotivation.deleteMany({
          where: {
            recordId,
            motivationId: config.motivationId as string,
          },
        })
        await logAutomationActivity(recordId, automationId, type, `Motivation "${motivation?.name || 'Unknown'}" removed`, motivation?.name || 'Unknown')
      }
      break

    case 'snooze_record':
      if (config.snoozeDays) {
        const snoozeUntil = new Date()
        snoozeUntil.setDate(snoozeUntil.getDate() + (config.snoozeDays as number))
        await prisma.record.update({
          where: { id: recordId },
          data: { snoozedUntil: snoozeUntil },
        })
        await logAutomationActivity(recordId, automationId, type, `Record snoozed for ${config.snoozeDays} days`)
      }
      break

    case 'unsnooze_record':
      await prisma.record.update({
        where: { id: recordId },
        data: { snoozedUntil: null },
      })
      await logAutomationActivity(recordId, automationId, type, 'Record unsnoozed')
      break

    case 'mark_phone_bad':
    case 'mark_phone_good':
      // Get the most recent phone number for this record
      const recentPhone = await prisma.recordPhoneNumber.findFirst({
        where: { recordId },
        orderBy: { createdAt: 'desc' },
      })
      if (recentPhone && config.phoneStatus) {
        const currentStatuses = recentPhone.statuses || []
        const newStatus = config.phoneStatus as string
        // Add the status if not already present
        if (!currentStatuses.includes(newStatus)) {
          await prisma.recordPhoneNumber.update({
            where: { id: recentPhone.id },
            data: { statuses: [...currentStatuses, newStatus] },
          })
        }
        await logAutomationActivity(recordId, automationId, type, `Phone marked as ${newStatus}`)
      }
      break

    case 'remove_from_board':
      if (config.boardId === 'all') {
        // Remove from all boards
        await prisma.recordBoardPosition.deleteMany({
          where: { recordId },
        })
        await logAutomationActivity(recordId, automationId, type, 'Removed from all boards')
      } else if (config.boardId) {
        // Remove from specific board
        const columns = await prisma.boardColumn.findMany({
          where: { boardId: config.boardId as string },
          select: { id: true },
        })
        const columnIds = columns.map(c => c.id)
        await prisma.recordBoardPosition.deleteMany({
          where: { 
            recordId,
            columnId: { in: columnIds },
          },
        })
        await logAutomationActivity(recordId, automationId, type, 'Removed from board')
      }
      break

    case 'create_task_from_template':
      if (config.templateId) {
        const template = await prisma.taskTemplate.findUnique({
          where: { id: config.templateId as string },
        })
        if (template) {
          const recordForTask = await prisma.record.findUnique({
            where: { id: recordId },
            select: { createdById: true },
          })
          if (recordForTask?.createdById) {
            // Calculate due date based on template
            let taskDueDate: Date | null = null
            if (template.dueDaysFromNow !== null) {
              taskDueDate = new Date()
              taskDueDate.setDate(taskDueDate.getDate() + template.dueDaysFromNow)
            }

            await prisma.task.create({
              data: {
                title: template.title,
                description: template.description,
                priority: template.priority,
                dueDate: taskDueDate,
                dueTime: template.dueTime,
                recurrence: template.recurrence,
                recurrenceDays: template.recurrenceDays,
                skipWeekends: template.skipWeekends,
                assignmentType: template.assignmentType,
                assignedToId: (config.assignedToId as string) || null,
                recordId,
                templateId: template.id,
                createdById: recordForTask.createdById,
              },
            })
            await logAutomationActivity(recordId, automationId, type, `Task "${template.title}" created from template "${template.name}"`, template.title)
          }
        }
      }
      break

    case 'delete_pending_tasks':
      const deletedTasks = await prisma.task.deleteMany({
        where: {
          recordId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      })
      await logAutomationActivity(recordId, automationId, type, `Deleted ${deletedTasks.count} pending tasks`)
      break

    default:
      console.log(`Unknown action type: ${type}`)
  }
}

// Extended record type for condition evaluation
interface ExtendedRecord {
  statusId: string | null
  temperature: string | null
  isComplete: boolean
  assignedToId: string | null
  callResultId?: string | null
  callAttempts: number
  createdAt: Date
  recordTags: Array<{ tagId: string }>
  recordMotivations: Array<{ motivationId: string }>
  phoneNumbers: Array<{ id: string; statuses: string[] }>
  activityLogs?: Array<{ action: string; createdAt: Date; newValue: string | null }>
}

// Evaluate branch conditions (for multi-branch conditions)
async function evaluateBranchConditions(
  conditions: Array<{ field: string; operator: string; value: string; logic?: string }>,
  context: ExecutionContext
): Promise<boolean> {
  const { recordId } = context

  const record = await prisma.record.findUnique({
    where: { id: recordId },
    include: {
      status: true,
      recordTags: { include: { tag: true } },
      recordMotivations: { include: { motivation: true } },
      phoneNumbers: true,
      activityLogs: {
        where: {
          action: { in: ['call', 'sms', 'rvm', 'direct_mail', 'email'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!record) return false

  let result = true
  let isFirstCondition = true

  for (const condition of conditions) {
    const conditionResult = evaluateSingleCondition(record as ExtendedRecord, condition.field, condition.operator, condition.value)
    
    if (isFirstCondition) {
      result = conditionResult
      isFirstCondition = false
    } else {
      if (condition.logic === 'OR') {
        result = result || conditionResult
      } else {
        // Default to AND
        result = result && conditionResult
      }
    }
  }

  return result
}

// Helper for numeric comparisons
function compareNumeric(actual: number, operator: string, expected: number): boolean {
  switch (operator) {
    case 'equals': return actual === expected
    case 'not_equals': return actual !== expected
    case 'greater_than': return actual > expected
    case 'less_than': return actual < expected
    case 'greater_or_equal': return actual >= expected
    case 'less_or_equal': return actual <= expected
    default: return false
  }
}

// Evaluate a single condition against a record
function evaluateSingleCondition(
  record: ExtendedRecord,
  field: string,
  operator: string,
  value: string
): boolean {
  switch (field) {
    case 'status':
      if (operator === 'equals') return record.statusId === value
      if (operator === 'not_equals') return record.statusId !== value
      if (operator === 'is_empty') return record.statusId === null
      if (operator === 'is_not_empty') return record.statusId !== null
      break

    case 'temperature':
      if (operator === 'equals') return record.temperature === value
      if (operator === 'not_equals') return record.temperature !== value
      if (operator === 'is_empty') return record.temperature === null
      if (operator === 'is_not_empty') return record.temperature !== null
      break

    case 'isComplete':
      return record.isComplete === (value === 'true')

    case 'hasTag':
      if (operator === 'equals' || operator === 'contains') {
        return record.recordTags.some((rt) => rt.tagId === value)
      }
      if (operator === 'not_equals' || operator === 'not_contains') {
        return !record.recordTags.some((rt) => rt.tagId === value)
      }
      break

    case 'hasMotivation':
      if (operator === 'equals' || operator === 'contains') {
        return record.recordMotivations.some((rm) => rm.motivationId === value)
      }
      if (operator === 'not_equals' || operator === 'not_contains') {
        return !record.recordMotivations.some((rm) => rm.motivationId === value)
      }
      break

    case 'isAssigned':
      if (value === 'any') return record.assignedToId !== null
      if (value === 'none') return record.assignedToId === null
      return record.assignedToId === value

    // NEW: Call Result
    case 'callResult':
      if (operator === 'equals') return record.callResultId === value
      if (operator === 'not_equals') return record.callResultId !== value
      if (operator === 'is_empty') return record.callResultId === null
      if (operator === 'is_not_empty') return record.callResultId !== null
      break

    // NEW: Call Attempts (numeric)
    case 'callAttempts':
      return compareNumeric(record.callAttempts, operator, parseInt(value) || 0)

    // NEW: Motivation Count (numeric)
    case 'motivationCount':
      return compareNumeric(record.recordMotivations.length, operator, parseInt(value) || 0)

    // NEW: Phone Count (numeric)
    case 'phoneCount':
      return compareNumeric(record.phoneNumbers.length, operator, parseInt(value) || 0)

    // NEW: Has Phone Numbers (boolean)
    case 'hasPhoneNumbers':
      return (record.phoneNumbers.length > 0) === (value === 'true')

    // NEW: Has Valid Phone (boolean) - phone without WRONG, DNC, DEAD status
    case 'hasValidPhone':
      const hasValid = record.phoneNumbers.some(p => {
        const badStatuses = ['WRONG', 'DNC', 'DEAD']
        return !p.statuses.some(s => badStatuses.includes(s))
      })
      return hasValid === (value === 'true')

    // NEW: Phone Status
    case 'phoneStatus':
      if (operator === 'equals') {
        return record.phoneNumbers.some(p => p.statuses.includes(value))
      }
      if (operator === 'not_equals') {
        return !record.phoneNumbers.some(p => p.statuses.includes(value))
      }
      break

    // NEW: Last Contact Type
    case 'lastContactType':
      const lastLog = record.activityLogs?.[0]
      if (!lastLog) {
        if (operator === 'is_empty') return true
        if (operator === 'is_not_empty') return false
        return false
      }
      const contactType = lastLog.action.toUpperCase()
      if (operator === 'equals') return contactType === value
      if (operator === 'not_equals') return contactType !== value
      break

    // NEW: Last Contact Result
    case 'lastContactResult':
      // This would need to be stored in the activity log or record
      // For now, use callResultId as a proxy
      if (operator === 'equals') return record.callResultId === value
      if (operator === 'not_equals') return record.callResultId !== value
      break

    // NEW: Days Since Last Contact (numeric)
    case 'daysSinceLastContact':
      const lastContact = record.activityLogs?.[0]
      if (!lastContact) return compareNumeric(9999, operator, parseInt(value) || 0) // No contact = very long time
      const daysSinceContact = Math.floor((Date.now() - new Date(lastContact.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      return compareNumeric(daysSinceContact, operator, parseInt(value) || 0)

    // NEW: Days Since Created (numeric)
    case 'daysSinceCreated':
      const daysSinceCreated = Math.floor((Date.now() - new Date(record.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      return compareNumeric(daysSinceCreated, operator, parseInt(value) || 0)

    default:
      console.log(`Unknown condition field: ${field}`)
  }

  return false
}

// Evaluate a condition node (legacy - for simple yes/no conditions)
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
