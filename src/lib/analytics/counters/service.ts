/**
 * DockInsight 2.2.2 Counter Service
 * 
 * Service-layer functions for maintaining denormalized counters.
 * Uses Prisma transactions to ensure consistency.
 */

import { prisma } from '../../prisma'
import { invalidateOnMutation } from '../cache'
import type { RecordCounters } from './types'

/**
 * Create a record tag with counter update in a transaction
 */
export async function createRecordTagWithCounter(
  recordId: string,
  tagId: string,
  createdById: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Create the junction record
    await tx.recordTag.create({
      data: {
        recordId,
        tagId,
        createdById
      }
    })
    
    // Increment the counter
    await tx.record.update({
      where: { id: recordId },
      data: { tagCount: { increment: 1 } }
    })
  })
  
  // Invalidate cache
  await invalidateOnMutation(createdById, 'record_tags', 'create')
}

/**
 * Delete a record tag with counter update in a transaction
 */
export async function deleteRecordTagWithCounter(
  recordId: string,
  tagId: string,
  createdById: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Delete the junction record
    await tx.recordTag.delete({
      where: {
        recordId_tagId: { recordId, tagId }
      }
    })
    
    // Decrement the counter
    await tx.record.update({
      where: { id: recordId },
      data: { tagCount: { decrement: 1 } }
    })
  })
  
  // Invalidate cache
  await invalidateOnMutation(createdById, 'record_tags', 'delete')
}

/**
 * Create a record motivation with counter update in a transaction
 */
export async function createRecordMotivationWithCounter(
  recordId: string,
  motivationId: string,
  createdById: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.recordMotivation.create({
      data: {
        recordId,
        motivationId,
        createdById
      }
    })
    
    await tx.record.update({
      where: { id: recordId },
      data: { motivationCount: { increment: 1 } }
    })
  })
  
  await invalidateOnMutation(createdById, 'record_motivations', 'create')
}

/**
 * Delete a record motivation with counter update in a transaction
 */
export async function deleteRecordMotivationWithCounter(
  recordId: string,
  motivationId: string,
  createdById: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.recordMotivation.delete({
      where: {
        recordId_motivationId: { recordId, motivationId }
      }
    })
    
    await tx.record.update({
      where: { id: recordId },
      data: { motivationCount: { decrement: 1 } }
    })
  })
  
  await invalidateOnMutation(createdById, 'record_motivations', 'delete')
}

/**
 * Create a phone number with counter update in a transaction
 */
export async function createPhoneWithCounter(
  recordId: string,
  phoneData: { number: string; type?: string; isPrimary?: boolean },
  createdById: string
): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    const phone = await tx.recordPhoneNumber.create({
      data: {
        recordId,
        createdById,
        ...phoneData
      }
    })
    
    await tx.record.update({
      where: { id: recordId },
      data: { phoneCount: { increment: 1 } }
    })
    
    return phone.id
  })
  
  await invalidateOnMutation(createdById, 'phones', 'create')
  return result
}

/**
 * Delete a phone number with counter update in a transaction
 */
export async function deletePhoneWithCounter(
  phoneId: string,
  createdById: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const phone = await tx.recordPhoneNumber.findUnique({
      where: { id: phoneId },
      select: { recordId: true }
    })
    
    if (!phone) throw new Error('Phone not found')
    
    await tx.recordPhoneNumber.delete({
      where: { id: phoneId }
    })
    
    await tx.record.update({
      where: { id: phone.recordId },
      data: { phoneCount: { decrement: 1 } }
    })
  })
  
  await invalidateOnMutation(createdById, 'phones', 'delete')
}

/**
 * Create an email with counter update in a transaction
 */
export async function createEmailWithCounter(
  recordId: string,
  emailData: { email: string; type?: string; isPrimary?: boolean },
  createdById: string
): Promise<string> {
  const result = await prisma.$transaction(async (tx) => {
    const email = await tx.recordEmail.create({
      data: {
        recordId,
        createdById,
        ...emailData
      }
    })
    
    await tx.record.update({
      where: { id: recordId },
      data: { emailCount: { increment: 1 } }
    })
    
    return email.id
  })
  
  await invalidateOnMutation(createdById, 'emails', 'create')
  return result
}

/**
 * Delete an email with counter update in a transaction
 */
export async function deleteEmailWithCounter(
  emailId: string,
  createdById: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const email = await tx.recordEmail.findUnique({
      where: { id: emailId },
      select: { recordId: true }
    })
    
    if (!email) throw new Error('Email not found')
    
    await tx.recordEmail.delete({
      where: { id: emailId }
    })
    
    await tx.record.update({
      where: { id: email.recordId },
      data: { emailCount: { decrement: 1 } }
    })
  })
  
  await invalidateOnMutation(createdById, 'emails', 'delete')
}

/**
 * Bulk delete record tags with counter update
 */
export async function bulkDeleteRecordTagsWithCounter(
  recordId: string,
  tagIds: string[],
  createdById: string
): Promise<void> {
  if (tagIds.length === 0) return
  
  await prisma.$transaction(async (tx) => {
    await tx.recordTag.deleteMany({
      where: {
        recordId,
        tagId: { in: tagIds }
      }
    })
    
    await tx.record.update({
      where: { id: recordId },
      data: { tagCount: { decrement: tagIds.length } }
    })
  })
  
  await invalidateOnMutation(createdById, 'record_tags', 'bulk_delete')
}

/**
 * Bulk create record tags with counter update
 */
export async function bulkCreateRecordTagsWithCounter(
  recordId: string,
  tagIds: string[],
  createdById: string
): Promise<void> {
  if (tagIds.length === 0) return
  
  await prisma.$transaction(async (tx) => {
    await tx.recordTag.createMany({
      data: tagIds.map(tagId => ({
        recordId,
        tagId,
        createdById
      })),
      skipDuplicates: true
    })
    
    // Get actual count of created records (in case of duplicates)
    const count = await tx.recordTag.count({
      where: { recordId }
    })
    
    await tx.record.update({
      where: { id: recordId },
      data: { tagCount: count }
    })
  })
  
  await invalidateOnMutation(createdById, 'record_tags', 'bulk_create')
}
