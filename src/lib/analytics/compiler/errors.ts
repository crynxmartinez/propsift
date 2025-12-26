/**
 * DockInsight 2.2.2 Compiler Errors
 * 
 * Custom error classes for query compilation failures.
 */

export class QueryCompileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QueryCompileError'
  }
}

export class DimensionGroupByError extends QueryCompileError {
  constructor(entityKey: string, dimensionKey: string, junctionEntity: string) {
    super(
      `Dimension "${dimensionKey}" requires groupBy on junction entity "${junctionEntity}", ` +
      `but query targets "${entityKey}". Change entityKey to "${junctionEntity}" for this dimension.`
    )
    this.name = 'DimensionGroupByError'
  }
}

export class UnknownEntityError extends QueryCompileError {
  constructor(entityKey: string) {
    super(`Unknown entity: ${entityKey}`)
    this.name = 'UnknownEntityError'
  }
}

export class UnknownSegmentError extends QueryCompileError {
  constructor(segmentKey: string) {
    super(`Unknown segment: ${segmentKey}`)
    this.name = 'UnknownSegmentError'
  }
}

export class UnknownDimensionError extends QueryCompileError {
  constructor(dimensionKey: string) {
    super(`Unknown dimension: ${dimensionKey}`)
    this.name = 'UnknownDimensionError'
  }
}

export class UnknownMetricError extends QueryCompileError {
  constructor(metricKey: string) {
    super(`Unknown metric: ${metricKey}`)
    this.name = 'UnknownMetricError'
  }
}

export class InvalidDateRangeError extends QueryCompileError {
  constructor(message: string) {
    super(`Invalid date range: ${message}`)
    this.name = 'InvalidDateRangeError'
  }
}

export class PermissionDeniedError extends QueryCompileError {
  constructor(entityKey: string) {
    super(`Permission denied for entity: ${entityKey}`)
    this.name = 'PermissionDeniedError'
  }
}
