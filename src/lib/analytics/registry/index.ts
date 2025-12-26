/**
 * DockInsight 2.2.2 Registry System
 * 
 * Central export for all registry modules.
 * 
 * The registry system provides:
 * - Entity definitions with tenant scope and search fields
 * - Segment definitions for pre-built filters
 * - Dimension definitions for groupBy operations
 * - Metric definitions for aggregations
 */

// Types
export * from './types'

// Registries
export { 
  ENTITY_REGISTRY, 
  getEntity, 
  getEntityKeys, 
  hasEntity 
} from './entities'

export { 
  SEGMENT_REGISTRY, 
  getSegment, 
  getSegmentsForEntity, 
  getSegmentKeys 
} from './segments'

export { 
  DIMENSION_REGISTRY, 
  getDimension, 
  getDimensionsForEntity, 
  getDimensionKeys,
  requiresJunctionEntity 
} from './dimensions'

export { 
  METRIC_REGISTRY, 
  getMetric, 
  getMetricsForEntity, 
  getMetricKeys 
} from './metrics'

// Version
export { REGISTRY_VERSION } from './types'
