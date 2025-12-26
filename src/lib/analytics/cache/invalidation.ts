/**
 * DockInsight 2.2.2 Cache Invalidation
 * 
 * Maps mutations to affected entities for cache invalidation.
 * 
 * v2.2.2 Contract:
 * - create/delete bumps BOTH cacheVersion AND labelVersion
 * - update bumps cacheVersion only (unless name/color changed)
 * - update(name/color) bumps labelVersion only
 */

import { bumpEntityVersion, bumpLabelVersion, bumpBothVersions } from './versions'

/**
 * Mutation types that trigger cache invalidation
 */
export type MutationType = 'create' | 'update' | 'delete' | 'bulk_create' | 'bulk_delete'

/**
 * Invalidation map: entity + mutation → affected entities
 */
const INVALIDATION_MAP: Record<string, Record<MutationType, string[]>> = {
  records: {
    create: ['records'],
    update: ['records'],
    delete: ['records', 'record_tags', 'record_motivations', 'phones', 'emails', 'tasks', 'activity'],
    bulk_create: ['records'],
    bulk_delete: ['records', 'record_tags', 'record_motivations', 'phones', 'emails', 'tasks', 'activity']
  },
  record_tags: {
    create: ['record_tags', 'records'],
    update: ['record_tags'],
    delete: ['record_tags', 'records'],
    bulk_create: ['record_tags', 'records'],
    bulk_delete: ['record_tags', 'records']
  },
  record_motivations: {
    create: ['record_motivations', 'records'],
    update: ['record_motivations'],
    delete: ['record_motivations', 'records'],
    bulk_create: ['record_motivations', 'records'],
    bulk_delete: ['record_motivations', 'records']
  },
  tags: {
    create: ['tags', 'record_tags'],
    update: ['tags'],  // Label-only update handled separately
    delete: ['tags', 'record_tags'],
    bulk_create: ['tags', 'record_tags'],
    bulk_delete: ['tags', 'record_tags']
  },
  motivations: {
    create: ['motivations', 'record_motivations'],
    update: ['motivations'],
    delete: ['motivations', 'record_motivations'],
    bulk_create: ['motivations', 'record_motivations'],
    bulk_delete: ['motivations', 'record_motivations']
  },
  phones: {
    create: ['phones', 'records'],
    update: ['phones'],
    delete: ['phones', 'records'],
    bulk_create: ['phones', 'records'],
    bulk_delete: ['phones', 'records']
  },
  emails: {
    create: ['emails', 'records'],
    update: ['emails'],
    delete: ['emails', 'records'],
    bulk_create: ['emails', 'records'],
    bulk_delete: ['emails', 'records']
  },
  tasks: {
    create: ['tasks'],
    update: ['tasks'],
    delete: ['tasks'],
    bulk_create: ['tasks'],
    bulk_delete: ['tasks']
  },
  statuses: {
    create: ['statuses', 'records'],
    update: ['statuses'],
    delete: ['statuses', 'records'],
    bulk_create: ['statuses', 'records'],
    bulk_delete: ['statuses', 'records']
  }
}

/**
 * Get affected entities for a mutation
 */
export function getAffectedEntities(
  entityKey: string,
  mutation: MutationType
): string[] {
  return INVALIDATION_MAP[entityKey]?.[mutation] ?? [entityKey]
}

/**
 * Invalidate cache on entity mutation.
 * 
 * v2.2.2 Contract:
 * - create/delete: bump BOTH cacheVersion AND labelVersion
 * - update: bump cacheVersion only
 * - update with labelChange: bump labelVersion only
 */
export async function invalidateOnMutation(
  tenantId: string,
  entityKey: string,
  mutation: MutationType,
  options: { labelChange?: boolean } = {}
): Promise<void> {
  const affectedEntities = getAffectedEntities(entityKey, mutation)
  
  // For label-only updates (name/color change), only bump labelVersion
  if (mutation === 'update' && options.labelChange) {
    await bumpLabelVersion(tenantId, entityKey)
    return
  }
  
  // For create/delete, bump both versions on the primary entity
  const isCreateOrDelete = ['create', 'delete', 'bulk_create', 'bulk_delete'].includes(mutation)
  
  const promises = affectedEntities.map(async (affected) => {
    if (isCreateOrDelete && affected === entityKey) {
      // Primary entity: bump both
      await bumpBothVersions(tenantId, affected)
    } else {
      // Related entities: bump cache version only
      await bumpEntityVersion(tenantId, affected)
    }
  })
  
  await Promise.all(promises)
}

/**
 * Invalidate multiple entities at once
 */
export async function invalidateEntities(
  tenantId: string,
  entityKeys: string[]
): Promise<void> {
  await Promise.all(
    entityKeys.map(key => bumpEntityVersion(tenantId, key))
  )
}
