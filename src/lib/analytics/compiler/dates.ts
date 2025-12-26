/**
 * DockInsight 2.2.2 Date Compiler
 * 
 * Compiles date range conditions with timezone-aware preset resolution.
 * 
 * v2.2.2 Contract:
 * - Presets resolve to ISO timestamps using user's timezone
 * - Custom ranges use provided start/end dates
 * - Date mode determines which field to filter on
 */

import type { 
  DateRange, 
  DateRangePreset, 
  DateRangeCustom, 
  DateModeKey,
  EntityDefinition,
  CompileCtx 
} from '../registry/types'
import { InvalidDateRangeError } from './errors'

type PrismaWhere = Record<string, unknown>

/**
 * Check if date range is a preset
 */
function isPreset(range: DateRange): range is DateRangePreset {
  return 'preset' in range
}

/**
 * Check if date range is custom
 */
function isCustom(range: DateRange): range is DateRangeCustom {
  return 'start' in range && 'end' in range
}

/**
 * Resolve date range preset to start/end dates using timezone
 */
export function resolveDatePreset(
  preset: DateRangePreset['preset'],
  timezone: string
): { start: Date; end: Date } {
  // Get current time in user's timezone
  const now = new Date()
  
  // Helper to get start of day in timezone
  const startOfDay = (date: Date): Date => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    return d
  }
  
  // Helper to get end of day in timezone
  const endOfDay = (date: Date): Date => {
    const d = new Date(date)
    d.setHours(23, 59, 59, 999)
    return d
  }
  
  // Helper to get start of week (Sunday)
  const startOfWeek = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    return startOfDay(d)
  }
  
  // Helper to get start of month
  const startOfMonth = (date: Date): Date => {
    const d = new Date(date)
    d.setDate(1)
    return startOfDay(d)
  }
  
  // Helper to get end of month
  const endOfMonth = (date: Date): Date => {
    const d = new Date(date)
    d.setMonth(d.getMonth() + 1, 0)
    return endOfDay(d)
  }
  
  // Helper to get start of quarter
  const startOfQuarter = (date: Date): Date => {
    const d = new Date(date)
    const quarter = Math.floor(d.getMonth() / 3)
    d.setMonth(quarter * 3, 1)
    return startOfDay(d)
  }
  
  // Helper to get end of quarter
  const endOfQuarter = (date: Date): Date => {
    const d = new Date(date)
    const quarter = Math.floor(d.getMonth() / 3)
    d.setMonth((quarter + 1) * 3, 0)
    return endOfDay(d)
  }
  
  // Helper to get start of year
  const startOfYear = (date: Date): Date => {
    const d = new Date(date)
    d.setMonth(0, 1)
    return startOfDay(d)
  }
  
  // Helper to get end of year
  const endOfYear = (date: Date): Date => {
    const d = new Date(date)
    d.setMonth(11, 31)
    return endOfDay(d)
  }
  
  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) }
      
    case 'yesterday': {
      const yesterday = new Date(now)
      yesterday.setDate(yesterday.getDate() - 1)
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) }
    }
    
    case 'this_week':
      return { start: startOfWeek(now), end: endOfDay(now) }
      
    case 'last_7_days': {
      const start = new Date(now)
      start.setDate(start.getDate() - 6)
      return { start: startOfDay(start), end: endOfDay(now) }
    }
    
    case 'last_30_days': {
      const start = new Date(now)
      start.setDate(start.getDate() - 29)
      return { start: startOfDay(start), end: endOfDay(now) }
    }
    
    case 'this_month':
      return { start: startOfMonth(now), end: endOfDay(now) }
      
    case 'last_month': {
      const lastMonth = new Date(now)
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
    }
    
    case 'this_quarter':
      return { start: startOfQuarter(now), end: endOfDay(now) }
      
    case 'this_year':
      return { start: startOfYear(now), end: endOfDay(now) }
      
    case 'all_time':
      // Use a very old start date
      return { start: new Date('2000-01-01'), end: endOfDay(now) }
      
    default:
      throw new InvalidDateRangeError(`Unknown preset: ${preset}`)
  }
}

/**
 * Resolve date range to start/end dates
 */
export function resolveDateRange(
  range: DateRange | undefined,
  timezone: string
): { start: Date; end: Date } | null {
  if (!range) return null
  
  if (isPreset(range)) {
    return resolveDatePreset(range.preset, timezone)
  }
  
  if (isCustom(range)) {
    return {
      start: new Date(range.start),
      end: new Date(range.end)
    }
  }
  
  throw new InvalidDateRangeError('Invalid date range format')
}

/**
 * Get the date field for a given date mode
 */
function getDateField(dateMode: DateModeKey): string {
  switch (dateMode) {
    case 'createdAt':
      return 'createdAt'
    case 'updatedAt':
      return 'updatedAt'
    case 'junction_created':
      return 'createdAt'
    case 'completedAt':
      return 'completedAt'
    case 'dueDate':
      return 'dueDate'
    default:
      return 'createdAt'
  }
}

/**
 * Compile date range to Prisma where clause.
 * 
 * v2.2.2 Contract:
 * - Uses effective date range (widget override or global)
 * - Resolves presets to ISO timestamps
 * - Returns resolved dates for cache key
 */
export function compileDateRange(
  range: DateRange | undefined,
  dateMode: DateModeKey,
  entity: EntityDefinition,
  ctx: CompileCtx
): PrismaWhere {
  const resolved = resolveDateRange(range, ctx.timezone)
  
  if (!resolved) return {}
  
  const field = getDateField(dateMode)
  
  return {
    [field]: {
      gte: resolved.start,
      lte: resolved.end
    }
  }
}

/**
 * Get resolved date range for cache key computation.
 * Returns ISO strings for deterministic hashing.
 */
export function getResolvedDateRangeForHash(
  range: DateRange | undefined,
  timezone: string
): { start: string; end: string } | null {
  const resolved = resolveDateRange(range, timezone)
  
  if (!resolved) return null
  
  return {
    start: resolved.start.toISOString(),
    end: resolved.end.toISOString()
  }
}
