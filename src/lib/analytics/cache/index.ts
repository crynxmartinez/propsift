/**
 * DockInsight 2.2.2 Cache System
 * 
 * Central export for all cache modules.
 */

// Client
export { 
  cacheGet, 
  cacheSet, 
  cacheDel, 
  cacheMGet, 
  cacheIncr,
  cacheSetNX,
  clearMemoryCache 
} from './client'

// Versions
export {
  buildVersionKey,
  buildLabelVersionKey,
  getEntityVersion,
  getLabelVersion,
  getEntityVersions,
  bumpEntityVersion,
  bumpLabelVersion,
  bumpBothVersions,
  computeDepsHash
} from './versions'

// Invalidation
export {
  type MutationType,
  getAffectedEntities,
  invalidateOnMutation,
  invalidateEntities
} from './invalidation'

// Widget cache
export {
  type WidgetCacheResult,
  buildWidgetCacheKey,
  getWidgetCache,
  setWidgetCache,
  fetchWithCache
} from './widgetCache'

// Label cache
export {
  type LabelData,
  getLabels,
  prefetchLabels
} from './labelCache'
