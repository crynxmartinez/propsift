/**
 * DockInsight 2.2.2 Version Management
 * 
 * Manages entity version keys for cache invalidation.
 * 
 * v2.2.2 Contract:
 * - Each entity has a cacheVersion (bumped on data mutations)
 * - Labels have separate labelVersion (bumped on name/color changes)
 * - create/delete bumps BOTH cacheVersion AND labelVersion
 * - update bumps cacheVersion; update(name/color) bumps labelVersion only
 */

import { cacheGet, cacheSet, cacheIncr, cacheMGet } from './client'
import { REGISTRY_VERSION } from '../registry'

const VERSION_TTL = 60 * 60 * 24 * 7  // 7 days

/**
 * Build version key for an entity
 */
export function buildVersionKey(tenantId: string, entityKey: string): string {
  return `v:${REGISTRY_VERSION}:${tenantId}:${entityKey}:version`
}

/**
 * Build label version key for an entity
 */
export function buildLabelVersionKey(tenantId: string, entityKey: string): string {
  return `v:${REGISTRY_VERSION}:${tenantId}:${entityKey}:labelVersion`
}

/**
 * Get current version for an entity
 */
export async function getEntityVersion(
  tenantId: string, 
  entityKey: string
): Promise<number> {
  const key = buildVersionKey(tenantId, entityKey)
  const version = await cacheGet<number>(key)
  return version ?? 0
}

/**
 * Get current label version for an entity
 */
export async function getLabelVersion(
  tenantId: string,
  entityKey: string
): Promise<number> {
  const key = buildLabelVersionKey(tenantId, entityKey)
  const version = await cacheGet<number>(key)
  return version ?? 0
}

/**
 * Get versions for multiple entities
 */
export async function getEntityVersions(
  tenantId: string,
  entityKeys: string[]
): Promise<Record<string, number>> {
  const keys = entityKeys.map(k => buildVersionKey(tenantId, k))
  const versions = await cacheMGet<number>(...keys)
  
  const result: Record<string, number> = {}
  entityKeys.forEach((key, i) => {
    result[key] = versions[i] ?? 0
  })
  return result
}

/**
 * Bump entity version (for data mutations)
 */
export async function bumpEntityVersion(
  tenantId: string,
  entityKey: string
): Promise<number> {
  const key = buildVersionKey(tenantId, entityKey)
  const newVersion = await cacheIncr(key)
  // Ensure TTL is set
  await cacheSet(key, newVersion, VERSION_TTL)
  return newVersion
}

/**
 * Bump label version (for name/color changes)
 */
export async function bumpLabelVersion(
  tenantId: string,
  entityKey: string
): Promise<number> {
  const key = buildLabelVersionKey(tenantId, entityKey)
  const newVersion = await cacheIncr(key)
  await cacheSet(key, newVersion, VERSION_TTL)
  return newVersion
}

/**
 * Bump both cache and label versions (for create/delete)
 */
export async function bumpBothVersions(
  tenantId: string,
  entityKey: string
): Promise<{ cacheVersion: number; labelVersion: number }> {
  const [cacheVersion, labelVersion] = await Promise.all([
    bumpEntityVersion(tenantId, entityKey),
    bumpLabelVersion(tenantId, entityKey)
  ])
  return { cacheVersion, labelVersion }
}

/**
 * Compute dependency hash from entity versions
 */
export async function computeDepsHash(
  tenantId: string,
  deps: string[]
): Promise<string> {
  const versions = await getEntityVersions(tenantId, deps)
  // Sort deps for deterministic hash
  const sortedDeps = [...deps].sort()
  const parts = sortedDeps.map(d => `${d}:${versions[d]}`)
  return parts.join('|')
}
