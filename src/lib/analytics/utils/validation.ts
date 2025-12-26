/**
 * DockInsight 2.2.2 Input Validation
 * 
 * Validation utilities for API inputs.
 */

import type { WidgetQueryInput, GlobalFilters } from '../registry/types'

/**
 * Validation error
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Validate widget query input
 */
export function validateWidgetInput(input: unknown): WidgetQueryInput {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Invalid input: expected object')
  }
  
  const obj = input as Record<string, unknown>
  
  // Required: entityKey
  if (!obj.entityKey || typeof obj.entityKey !== 'string') {
    throw new ValidationError('Missing or invalid entityKey', 'entityKey')
  }
  
  // Required: metric
  if (!obj.metric || typeof obj.metric !== 'object') {
    throw new ValidationError('Missing or invalid metric', 'metric')
  }
  
  const metric = obj.metric as Record<string, unknown>
  if (!metric.key || typeof metric.key !== 'string') {
    throw new ValidationError('Missing or invalid metric.key', 'metric.key')
  }
  
  // Optional: filters (must be array)
  if (obj.filters !== undefined && !Array.isArray(obj.filters)) {
    throw new ValidationError('filters must be an array', 'filters')
  }
  
  // Optional: globalFilters (must be object)
  if (obj.globalFilters !== undefined && typeof obj.globalFilters !== 'object') {
    throw new ValidationError('globalFilters must be an object', 'globalFilters')
  }
  
  // Optional: limit (must be positive number)
  if (obj.limit !== undefined) {
    if (typeof obj.limit !== 'number' || obj.limit < 1 || obj.limit > 1000) {
      throw new ValidationError('limit must be a number between 1 and 1000', 'limit')
    }
  }
  
  return {
    entityKey: obj.entityKey as string,
    segmentKey: obj.segmentKey as string | undefined,
    metric: {
      key: metric.key as string,
      field: metric.field as string | undefined,
      filter: metric.filter as Record<string, unknown> | undefined
    },
    dimension: obj.dimension as string | undefined,
    filters: (obj.filters as Array<{ field: string; operator: string; value: unknown }>) || [],
    globalFilters: (obj.globalFilters as GlobalFilters) || {},
    dateRange: obj.dateRange as WidgetQueryInput['dateRange'],
    dateMode: obj.dateMode as WidgetQueryInput['dateMode'],
    granularity: obj.granularity as WidgetQueryInput['granularity'],
    sort: obj.sort as WidgetQueryInput['sort'],
    limit: obj.limit as number | undefined
  }
}

/**
 * Validate drilldown request
 */
export function validateDrilldownInput(input: unknown): {
  query: WidgetQueryInput
  page: number
  pageSize: number
  search?: string
} {
  if (!input || typeof input !== 'object') {
    throw new ValidationError('Invalid input: expected object')
  }
  
  const obj = input as Record<string, unknown>
  
  // Required: query
  if (!obj.query) {
    throw new ValidationError('Missing query', 'query')
  }
  
  const query = validateWidgetInput(obj.query)
  
  // Optional: page (default 1)
  let page = 1
  if (obj.page !== undefined) {
    if (typeof obj.page !== 'number' || obj.page < 1) {
      throw new ValidationError('page must be a positive number', 'page')
    }
    page = Math.floor(obj.page)
  }
  
  // Optional: pageSize (default 20, max 100)
  let pageSize = 20
  if (obj.pageSize !== undefined) {
    if (typeof obj.pageSize !== 'number' || obj.pageSize < 1 || obj.pageSize > 100) {
      throw new ValidationError('pageSize must be between 1 and 100', 'pageSize')
    }
    pageSize = Math.floor(obj.pageSize)
  }
  
  // Optional: search
  let search: string | undefined
  if (obj.search !== undefined) {
    if (typeof obj.search !== 'string') {
      throw new ValidationError('search must be a string', 'search')
    }
    search = obj.search.trim().slice(0, 100)  // Limit to 100 chars
  }
  
  return { query, page, pageSize, search }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 100): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, '')  // Remove control characters
}
