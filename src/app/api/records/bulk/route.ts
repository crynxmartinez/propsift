import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper to create system log
async function createSystemLog(description: string, action: string, total: number) {
  await prisma.activityLog.create({
    data: {
      type: 'log',
      action,
      description,
      total,
      processed: total,
      status: 'completed',
    },
  });
}

// POST /api/records/bulk - Handle bulk actions on records
export async function POST(request: NextRequest) {
  try {
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
        
        await createSystemLog(
          `User added tag "${tagNamesToAdd}" to ${recordIds.length} ${recordIds.length === 1 ? 'property' : 'properties'}`,
          'bulk_add_tags',
          recordIds.length
        );
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
        
        await createSystemLog(
          `User removed tag "${tagNamesToRemove}" from ${recordIds.length} ${recordIds.length === 1 ? 'property' : 'properties'}`,
          'bulk_remove_tags',
          recordIds.length
        );
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
            newValue: statusId || 'null',
            source: 'Bulk Actions',
          })),
        });
        
        await createSystemLog(
          `User updated status to "${statusName}" for ${recordIds.length} ${recordIds.length === 1 ? 'property' : 'properties'}`,
          'bulk_update_status',
          recordIds.length
        );
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
            newValue: userId || 'null',
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
