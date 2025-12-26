/**
 * DockInsight 2.2.2 Query Compiler
 * 
 * Central export for all compiler modules.
 */

// Main compiler
export { compileQuery, compileCountQuery, compileAggregateQuery } from './compile'

// Sub-compilers
export { compileTenantScope } from './tenant'
export { compilePermissionWhere, computePermissionHash, buildDefaultPermissions } from './permissions'
export { compileFilters, compileSegment, compileGlobalFilters } from './filters'
export { compileDateRange, resolveDatePreset, resolveDateRange, getResolvedDateRangeForHash } from './dates'

// Hash and deps
export { computeQueryHash, computeShortHash } from './hash'
export { computeQueryDeps } from './deps'

// Validation
export { 
  validateQueryInput, 
  validateEntity, 
  validateSegment, 
  validateMetric,
  validateDimensionGroupBy 
} from './validate'

// Utilities
export { 
  stableStringify, 
  normalizeGlobalFilters, 
  sortFilters, 
  deepClone,
  isNonEmptyArray,
  isPresent 
} from './utils'

// Errors
export {
  QueryCompileError,
  DimensionGroupByError,
  UnknownEntityError,
  UnknownSegmentError,
  UnknownDimensionError,
  UnknownMetricError,
  InvalidDateRangeError,
  PermissionDeniedError
} from './errors'
