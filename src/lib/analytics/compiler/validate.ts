/**
 * DockInsight 2.2.2 Query Validation
 * 
 * Validates query inputs before compilation.
 * 
 * v2.2.2 Contract:
 * - Validate dimension groupBy compatibility
 * - Validate entity exists
 * - Validate segment belongs to entity
 * - Validate metric supports entity
 */

import type { WidgetQueryInput } from '../registry/types'
import { getEntity } from '../registry/entities'
import { getSegment } from '../registry/segments'
import { getDimension, requiresJunctionEntity } from '../registry/dimensions'
import { getMetric } from '../registry/metrics'
import { 
  UnknownEntityError, 
  UnknownSegmentError, 
  UnknownDimensionError,
  UnknownMetricError,
  DimensionGroupByError,
  QueryCompileError
} from './errors'

/**
 * Validate dimension groupBy compatibility.
 * 
 * v2.2.2 Contract:
 * - junction_required dimensions MUST query their junction entity
 * - Throws DimensionGroupByError with helpful message
 */
export function validateDimensionGroupBy(
  entityKey: string,
  dimensionKey: string
): void {
  const dimension = getDimension(dimensionKey)
  
  if (!dimension) {
    throw new UnknownDimensionError(dimensionKey)
  }
  
  // Check if dimension requires junction entity
  if (dimension.groupByMode === 'junction_required') {
    if (!dimension.junctionEntity) {
      throw new QueryCompileError(
        `Dimension "${dimensionKey}" has groupByMode 'junction_required' but no junctionEntity defined`
      )
    }
    
    // Entity must match junction entity
    if (entityKey !== dimension.junctionEntity) {
      throw new DimensionGroupByError(entityKey, dimensionKey, dimension.junctionEntity)
    }
  }
  
  // Check if dimension supports this entity
  const entities = dimension.entities as string[]
  if (!entities.includes('*') && !entities.includes(entityKey)) {
    throw new QueryCompileError(
      `Dimension "${dimensionKey}" does not support entity "${entityKey}". ` +
      `Supported entities: ${entities.join(', ')}`
    )
  }
}

/**
 * Validate entity exists
 */
export function validateEntity(entityKey: string): void {
  const entity = getEntity(entityKey)
  if (!entity) {
    throw new UnknownEntityError(entityKey)
  }
}

/**
 * Validate segment exists and belongs to entity
 */
export function validateSegment(entityKey: string, segmentKey: string): void {
  const segment = getSegment(segmentKey)
  
  if (!segment) {
    throw new UnknownSegmentError(segmentKey)
  }
  
  if (segment.entityKey !== entityKey) {
    throw new QueryCompileError(
      `Segment "${segmentKey}" belongs to entity "${segment.entityKey}", ` +
      `but query targets "${entityKey}"`
    )
  }
}

/**
 * Validate metric exists and supports entity
 */
export function validateMetric(entityKey: string, metricKey: string): void {
  const metric = getMetric(metricKey)
  
  if (!metric) {
    throw new UnknownMetricError(metricKey)
  }
  
  const entities = metric.entities as string[]
  if (!entities.includes('*') && !entities.includes(entityKey)) {
    throw new QueryCompileError(
      `Metric "${metricKey}" does not support entity "${entityKey}". ` +
      `Supported entities: ${entities.join(', ')}`
    )
  }
}

/**
 * Validate complete query input
 */
export function validateQueryInput(input: WidgetQueryInput): void {
  // Validate entity
  validateEntity(input.entityKey)
  
  // Validate segment if provided
  if (input.segmentKey) {
    validateSegment(input.entityKey, input.segmentKey)
  }
  
  // Validate dimension if provided
  if (input.dimension) {
    validateDimensionGroupBy(input.entityKey, input.dimension)
  }
  
  // Validate metric
  validateMetric(input.entityKey, input.metric.key)
}
