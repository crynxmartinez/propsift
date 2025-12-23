import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
        break;

      case 'removeTags':
        if (!tagIds || tagIds.length === 0) {
          return NextResponse.json({ error: 'Tag IDs required' }, { status: 400 });
        }
        const deleteTagsResult = await prisma.recordTag.deleteMany({
          where: {
            recordId: { in: recordIds },
            tagId: { in: tagIds },
          },
        });
        result.affected = deleteTagsResult.count;
        break;

      case 'addMotivations':
        if (!motivationIds || motivationIds.length === 0) {
          return NextResponse.json({ error: 'Motivation IDs required' }, { status: 400 });
        }
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
        break;

      case 'removeMotivations':
        if (!motivationIds || motivationIds.length === 0) {
          return NextResponse.json({ error: 'Motivation IDs required' }, { status: 400 });
        }
        const deleteMotivationsResult = await prisma.recordMotivation.deleteMany({
          where: {
            recordId: { in: recordIds },
            motivationId: { in: motivationIds },
          },
        });
        result.affected = deleteMotivationsResult.count;
        break;

      case 'updateStatus':
        const updateStatusResult = await prisma.record.updateMany({
          where: { id: { in: recordIds } },
          data: { statusId: statusId || null },
        });
        result.affected = updateStatusResult.count;
        
        // Log activity
        await prisma.recordActivityLog.createMany({
          data: recordIds.map((recordId: string) => ({
            recordId,
            action: 'updated',
            field: 'status',
            newValue: statusId || 'null',
            source: 'Bulk Actions',
          })),
        });
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
        
        // Log activity
        await prisma.recordActivityLog.createMany({
          data: recordIds.map((recordId: string) => ({
            recordId,
            action: 'updated',
            field: 'temperature',
            newValue: temperature,
            source: 'Bulk Actions',
          })),
        });
        break;

      case 'assignToUser':
        const assignResult = await prisma.record.updateMany({
          where: { id: { in: recordIds } },
          data: { assignedToId: userId || null },
        });
        result.affected = assignResult.count;
        
        // Log activity
        await prisma.recordActivityLog.createMany({
          data: recordIds.map((recordId: string) => ({
            recordId,
            action: 'updated',
            field: 'assignedTo',
            newValue: userId || 'null',
            source: 'Bulk Actions',
          })),
        });
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
        
        // Log activity
        await prisma.recordActivityLog.createMany({
          data: recordIds.map((recordId: string) => ({
            recordId,
            action: 'deleted',
            field: 'phoneNumbers',
            source: 'Bulk Actions',
          })),
        });
        break;

      case 'deleteRecords':
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
