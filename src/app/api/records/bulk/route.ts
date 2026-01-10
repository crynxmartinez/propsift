import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findMatchingAutomations, executeAutomation } from '@/lib/automation/engine';
import { verifyToken } from '@/lib/auth';
import { getAuthUser } from '@/lib/roles';
import { enrollNewLead } from '@/lib/lce/first-to-market';

// Helper to create system log
async function createSystemLog(description: string, action: string, total: number) {
  await prisma.activityLog.create({
    data: {
      type: 'action',
      action,
      description,
      total,
      processed: total,
      status: 'completed',
    },
  });
}

// Helper to trigger automations for bulk actions
async function triggerBulkAutomations(
  triggerType: string,
  recordIds: string[],
  ownerId: string
) {
  try {
    const automations = await findMatchingAutomations(triggerType, ownerId);
    for (const automation of automations) {
      for (const recordId of recordIds) {
        // Execute async, don't await each one to avoid blocking
        executeAutomation(automation.id, recordId, triggerType).catch(err => {
          console.error(`Error executing automation ${automation.id} for record ${recordId}:`, err);
        });
      }
    }
  } catch (error) {
    console.error('Error triggering bulk automations:', error);
  }
}

// POST /api/records/bulk - Handle bulk actions on records
export async function POST(request: NextRequest) {
  try {
    // Authenticate user to get ownerId for automation triggers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    let ownerId: string | null = null;
    
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const authUser = await getAuthUser(decoded.userId);
        if (authUser) {
          ownerId = authUser.ownerId;
        }
      }
    }

    const body = await request.json();
    const { action, recordIds, tagIds, motivationIds, statusId, temperature, userId } = body;

    if (!action || !recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return NextResponse.json(
        { error: 'Action and recordIds are required' },
        { status: 400 }
      );
    }

    let result: { success: boolean; affected: number } = { success: true, affected: 0 };

    switch (action) {
      case 'addTags':
        if (!tagIds || tagIds.length === 0) {
          return NextResponse.json({ error: 'Tag IDs required' }, { status: 400 });
        }
        // Get tag names for logging
        const tagsToAdd = await prisma.tag.findMany({ where: { id: { in: tagIds } } });
        const tagNamesToAdd = tagsToAdd.map(t => t.name).join(', ');
        
        for (const recordId of recordIds) {
          for (const tagId of tagIds) {
            await prisma.recordTag.upsert({
              where: { recordId_tagId: { recordId, tagId } },
              create: { recordId, tagId },
              update: {},
            });
          }
        }
        result.affected = recordIds.length;
        
        // Log activity per record
        await prisma.recordActivityLog.createMany({
          data: recordIds.map((recordId: string) => ({
            recordId,
            action: 'updated',
            field: 'tags',
            newValue: tagNamesToAdd,
            source: 'Bulk Actions',
          })),
        });
        
        await createSystemLog(
          `User added tag "${tagNamesToAdd}" to ${recordIds.length} ${recordIds.length === 1 ? 'property' : 'properties'}`,
          'bulk_add_tags',
          recordIds.length
        );
        
        // Trigger automations for tag added
        if (ownerId) {
          triggerBulkAutomations('tag_added', recordIds, ownerId);
        }
        break;

      case 'removeTags':
        if (!tagIds || tagIds.length === 0) {
          return NextResponse.json({ error: 'Tag IDs required' }, { status: 400 });
        }
        const tagsToRemove = await prisma.tag.findMany({ where: { id: { in: tagIds } } });
        const tagNamesToRemove = tagsToRemove.map(t => t.name).join(', ');
        
        const deleteTagsResult = await prisma.recordTag.deleteMany({
          where: {
            recordId: { in: recordIds },
            tagId: { in: tagIds },
          },
        });
        result.affected = deleteTagsResult.count;
        
        // Log activity per record
        await prisma.recordActivityLog.createMany({
          data: recordIds.map((recordId: string) => ({
            recordId,
            action: 'updated',
            field: 'tags',
            newValue: `Removed: ${tagNamesToRemove}`,
            source: 'Bulk Actions',
          })),
        });
        
        await createSystemLog(
          `User removed tag "${tagNamesToRemove}" from ${recordIds.length} ${recordIds.length === 1 ? 'property' : 'properties'}`,
          'bulk_remove_tags',
          recordIds.length
        );
        
        // Trigger automations for tag removed
        if (ownerId) {
          triggerBulkAutomations('tag_removed', recordIds, ownerId);
        }
        break;

      case 'addMotivations':
        if (!motivationIds || motivationIds.length === 0) {
          return NextResponse.json({ error: 'Motivation IDs required' }, { status: 400 });
        }
        const motivationsToAdd = await prisma.motivation.findMany({ where: { id: { in: motivationIds } } });
        const motivationNamesToAdd = motivationsToAdd.map(m => m.name).join(', ');
        
        for (const recordId of recordIds) {
          for (const motivationId of motivationIds) {
            await prisma.recordMotivation.upsert({
              where: { recordId_motivationId: { recordId, motivationId } },
              create: { recordId, motivationId },
              update: {},
            });
          }
        }
        result.affected = recordIds.length;
        
        // Log activity per record
        await prisma.recordActivityLog.createMany({
          data: recordIds.map((recordId: string) => ({
            recordId,
            action: 'updated',
            field: 'motivations',
            newValue: motivationNamesToAdd,
            source: 'Bulk Actions',
          })),
        });
        
        await createSystemLog(
          `User added motivation "${motivationNamesToAdd}" to ${recordIds.length} ${recordIds.length === 1 ? 'property' : 'properties'}`,
          'bulk_add_motivations',
          recordIds.length
        );
        break;

      case 'removeMotivations':
        if (!motivationIds || motivationIds.length === 0) {
          return NextResponse.json({ error: 'Motivation IDs required' }, { status: 400 });
        }
        const motivationsToRemove = await prisma.motivation.findMany({ where: { id: { in: motivationIds } } });
        const motivationNamesToRemove = motivationsToRemove.map(m => m.name).join(', ');
        
        const deleteMotivationsResult = await prisma.recordMotivation.deleteMany({
          where: {
            recordId: { in: recordIds },
            motivationId: { in: motivationIds },
          },
        });
        result.affected = deleteMotivationsResult.count;
        
        // Log activity per record
        await prisma.recordActivityLog.createMany({
          data: recordIds.map((recordId: string) => ({
            recordId,
            action: 'updated',
            field: 'motivations',
            newValue: `Removed: ${motivationNamesToRemove}`,
            source: 'Bulk Actions',
          })),
        });
        
        await createSystemLog(
          `User removed motivation "${motivationNamesToRemove}" from ${recordIds.length} ${recordIds.length === 1 ? 'property' : 'properties'}`,
          'bulk_remove_motivations',
          recordIds.length
        );
        break;

      case 'updateStatus':
        const statusToUpdate = statusId ? await prisma.status.findUnique({ where: { id: statusId } }) : null;
        const statusName = statusToUpdate?.name || 'None';
        
        const updateStatusResult = await prisma.record.updateMany({
          where: { id: { in: recordIds } },
          data: { statusId: statusId || null },
        });
        result.affected = updateStatusResult.count;
        
        // Log activity per record
        await prisma.recordActivityLog.createMany({
          data: recordIds.map((recordId: string) => ({
            recordId,
            action: 'updated',
            field: 'status',
            newValue: statusName,
            source: 'Bulk Actions',
          })),
        });
        
        await createSystemLog(
          `User updated status to "${statusName}" for ${recordIds.length} ${recordIds.length === 1 ? 'property' : 'properties'}`,
          'bulk_update_status',
          recordIds.length
        );
        
        // Trigger automations for status changed
        if (ownerId) {
          triggerBulkAutomations('status_changed', recordIds, ownerId);
        }

        // LCE v3.0: Trigger enrollment when bulk status changes to "New Lead"
        const isNewLeadStatus = statusName.toLowerCase().includes('new lead');
        if (isNewLeadStatus) {
          // Enroll each record that hasn't been enrolled yet
          for (const recordId of recordIds) {
            try {
              // Check if record hasn't been enrolled yet
              const record = await prisma.record.findUnique({
                where: { id: recordId },
                select: { 
                  id: true,
                  phoneNumbers: { select: { statuses: true } },
                },
              });

              if (!record) continue;

              // Check current phase (with fallback for new schema)
              const currentPhase = (record as Record<string, unknown>).currentPhase as string | null;
              const hasNotBeenEnrolled = !currentPhase || currentPhase === 'NEW';

              if (hasNotBeenEnrolled) {
                // Check if has valid phone
                const hasValidPhone = record.phoneNumbers.some(p => {
                  const statuses = p.statuses || [];
                  const badStatuses = ['wrong', 'disconnected', 'invalid', 'bad', 'dnc'];
                  return !statuses.some(s => badStatuses.some(bad => s.toLowerCase().includes(bad)));
                });

                // Enroll in LCE
                const enrollment = enrollNewLead(hasValidPhone);

                await prisma.record.update({
                  where: { id: recordId },
                  data: {
                    currentPhase: enrollment.phase,
                    cadenceState: enrollment.cadenceState,
                    nextActionDue: enrollment.nextActionDue,
                    nextActionType: enrollment.nextActionType,
                    cadenceStartDate: new Date(),
                    blitzAttempts: 0,
                    enrollmentCount: { increment: 1 },
                  } as Parameters<typeof prisma.record.update>[0]['data'],
                });

                // Log LCE enrollment
                await prisma.recordActivityLog.create({
                  data: {
                    recordId,
                    action: 'lce_enrolled',
                    field: 'currentPhase',
                    oldValue: 'NEW',
                    newValue: enrollment.phase,
                    source: 'bulk_status_change_to_new_lead',
                  },
                });
              }
            } catch (lceError) {
              console.error(`LCE enrollment error for record ${recordId}:`, lceError);
            }
          }
          console.log(`LCE: Bulk enrolled ${recordIds.length} records in First-to-Market cadence`);
        }
        break;

      case 'updateTemperature':
        if (!temperature) {
          return NextResponse.json({ error: 'Temperature required' }, { status: 400 });
        }
        const updateTempResult = await prisma.record.updateMany({
          where: { id: { in: recordIds } },
          data: { temperature },
        });
        result.affected = updateTempResult.count;
        
        // Log activity per record
        await prisma.recordActivityLog.createMany({
          data: recordIds.map((recordId: string) => ({
            recordId,
            action: 'updated',
            field: 'temperature',
            newValue: temperature,
            source: 'Bulk Actions',
          })),
        });
        
        await createSystemLog(
          `User updated temperature to "${temperature}" for ${recordIds.length} ${recordIds.length === 1 ? 'property' : 'properties'}`,
          'bulk_update_temperature',
          recordIds.length
        );
        
        // Trigger automations for temperature changed
        if (ownerId) {
          triggerBulkAutomations('temperature_changed', recordIds, ownerId);
        }
        break;

      case 'assignToUser':
        const userToAssign = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
        const userName = userToAssign?.name || userToAssign?.email || 'Unassigned';
        
        const assignResult = await prisma.record.updateMany({
          where: { id: { in: recordIds } },
          data: { assignedToId: userId || null },
        });
        result.affected = assignResult.count;
        
        // Log activity per record
        await prisma.recordActivityLog.createMany({
          data: recordIds.map((recordId: string) => ({
            recordId,
            action: 'updated',
            field: 'assignedTo',
            newValue: userName,
            source: 'Bulk Actions',
          })),
        });
        
        await createSystemLog(
          `User assigned ${recordIds.length} ${recordIds.length === 1 ? 'property' : 'properties'} to "${userName}"`,
          'bulk_assign_user',
          recordIds.length
        );
        break;

      case 'deletePhones':
        const deletePhonesResult = await prisma.recordPhoneNumber.deleteMany({
          where: { recordId: { in: recordIds } },
        });
        result.affected = deletePhonesResult.count;
        
        // Also clear legacy phone field
        await prisma.record.updateMany({
          where: { id: { in: recordIds } },
          data: { phone: null },
        });
        
        // Log activity per record
        await prisma.recordActivityLog.createMany({
          data: recordIds.map((recordId: string) => ({
            recordId,
            action: 'deleted',
            field: 'phoneNumbers',
            source: 'Bulk Actions',
          })),
        });
        
        await createSystemLog(
          `User deleted phones from ${recordIds.length} ${recordIds.length === 1 ? 'property' : 'properties'}`,
          'bulk_delete_phones',
          recordIds.length
        );
        break;

      case 'deleteRecords':
        // Log before deleting (since records will be gone)
        await createSystemLog(
          `User deleted ${recordIds.length} ${recordIds.length === 1 ? 'property' : 'properties'}`,
          'bulk_delete_records',
          recordIds.length
        );
        
        // Delete records (cascade will handle related data)
        const deleteRecordsResult = await prisma.record.deleteMany({
          where: { id: { in: recordIds } },
        });
        result.affected = deleteRecordsResult.count;
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error executing bulk action:', error);
    return NextResponse.json(
      { error: 'Failed to execute bulk action' },
      { status: 500 }
    );
  }
}
