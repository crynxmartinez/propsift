/**
 * DockInsight 2.2.2 Label Cache
 * 
 * Caches label lookups (tags, motivations, statuses, users) separately from widget data.
 * 
 * v2.2.2 Contract:
 * - Separate labelVersion from cacheVersion
 * - TTL: 1 hour for labels
 * - Batch lookup support
 */

import { cacheGet, cacheSet, cacheMGet } from './client'
import { getLabelVersion } from './versions'
import { REGISTRY_VERSION } from '../registry'
import { prisma } from '../../prisma'

const LABEL_CACHE_TTL = 60 * 60  // 1 hour

/**
 * Label data structure
 */
export interface LabelData {
  id: string
  name: string
  color?: string
}

/**
 * Build label cache key
 */
function buildLabelKey(
  tenantId: string,
  entityKey: string,
  labelVersion: number,
  id: string
): string {
  return `l:${REGISTRY_VERSION}:${tenantId}:${entityKey}:${labelVersion}:${id}`
}

/**
 * Get labels for a list of IDs
 */
export async function getLabels(
  tenantId: string,
  entityKey: string,
  ids: string[]
): Promise<Record<string, LabelData>> {
  if (ids.length === 0) return {}
  
  const labelVersion = await getLabelVersion(tenantId, entityKey)
  
  // Build cache keys
  const keys = ids.map(id => buildLabelKey(tenantId, entityKey, labelVersion, id))
  
  // Try cache first
  const cached = await cacheMGet<LabelData>(...keys)
  
  // Find missing IDs
  const result: Record<string, LabelData> = {}
  const missingIds: string[] = []
  
  ids.forEach((id, i) => {
    if (cached[i]) {
      result[id] = cached[i]!
    } else {
      missingIds.push(id)
    }
  })
  
  // Fetch missing from database
  if (missingIds.length > 0) {
    const fetched = await fetchLabelsFromDB(tenantId, entityKey, missingIds)
    
    // Cache and add to result
    for (const label of fetched) {
      result[label.id] = label
      
      // Cache individually (don't await)
      const key = buildLabelKey(tenantId, entityKey, labelVersion, label.id)
      cacheSet(key, label, LABEL_CACHE_TTL).catch(() => {})
    }
  }
  
  return result
}

/**
 * Fetch labels from database
 */
async function fetchLabelsFromDB(
  tenantId: string,
  entityKey: string,
  ids: string[]
): Promise<LabelData[]> {
  switch (entityKey) {
    case 'tags':
      const tags = await prisma.tag.findMany({
        where: { 
          id: { in: ids },
          createdById: tenantId
        },
        select: { id: true, name: true }
      })
      return tags.map(t => ({ id: t.id, name: t.name }))
    
    case 'motivations':
      const motivations = await prisma.motivation.findMany({
        where: { 
          id: { in: ids },
          createdById: tenantId
        },
        select: { id: true, name: true }
      })
      return motivations.map(m => ({ id: m.id, name: m.name }))
    
    case 'statuses':
      const statuses = await prisma.status.findMany({
        where: { 
          id: { in: ids },
          createdById: tenantId
        },
        select: { id: true, name: true, color: true }
      })
      return statuses.map(s => ({ id: s.id, name: s.name, color: s.color }))
    
    case 'users':
      const users = await prisma.user.findMany({
        where: { 
          id: { in: ids },
          OR: [
            { id: tenantId },
            { accountOwnerId: tenantId }
          ]
        },
        select: { id: true, name: true }
      })
      return users.map(u => ({ id: u.id, name: u.name || 'Unknown' }))
    
    default:
      return []
  }
}

/**
 * Prefetch labels for common entities
 */
export async function prefetchLabels(
  tenantId: string
): Promise<void> {
  // Prefetch all tags
  const tags = await prisma.tag.findMany({
    where: { createdById: tenantId },
    select: { id: true, name: true }
  })
  
  const labelVersion = await getLabelVersion(tenantId, 'tags')
  
  await Promise.all(
    tags.map(tag => {
      const key = buildLabelKey(tenantId, 'tags', labelVersion, tag.id)
      return cacheSet(key, { id: tag.id, name: tag.name }, LABEL_CACHE_TTL)
    })
  )
  
  // Prefetch all motivations
  const motivations = await prisma.motivation.findMany({
    where: { createdById: tenantId },
    select: { id: true, name: true }
  })
  
  const motivationVersion = await getLabelVersion(tenantId, 'motivations')
  
  await Promise.all(
    motivations.map(m => {
      const key = buildLabelKey(tenantId, 'motivations', motivationVersion, m.id)
      return cacheSet(key, { id: m.id, name: m.name }, LABEL_CACHE_TTL)
    })
  )
}
