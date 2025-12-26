/**
 * DockInsight 2.2.2 Metric Registry
 * 
 * Defines available metrics for analytics widgets.
 * 
 * Key concepts:
 * - `type`: count, sum, avg, rate, distinct_count
 * - `field`: Required for sum/avg metrics
 * - `entities`: Which entities support this metric
 */

import type { MetricDefinition } from './types'

export const METRIC_REGISTRY: Record<string, MetricDefinition> = {
  // ==========================================================================
  // COUNT METRICS
  // ==========================================================================

  count: {
    key: 'count',
    label: 'Count',
    type: 'count',
    entities: ['*'],
    format: 'number'
  },

  record_count: {
    key: 'record_count',
    label: 'Record Count',
    type: 'count',
    entities: ['records'],
    format: 'number'
  },

  task_count: {
    key: 'task_count',
    label: 'Task Count',
    type: 'count',
    entities: ['tasks'],
    format: 'number'
  },

  phone_count: {
    key: 'phone_count',
    label: 'Phone Count',
    type: 'count',
    entities: ['phones'],
    format: 'number'
  },

  email_count: {
    key: 'email_count',
    label: 'Email Count',
    type: 'count',
    entities: ['emails'],
    format: 'number'
  },

  tag_count: {
    key: 'tag_count',
    label: 'Tag Count',
    type: 'count',
    entities: ['record_tags'],
    format: 'number'
  },

  motivation_count: {
    key: 'motivation_count',
    label: 'Motivation Count',
    type: 'count',
    entities: ['record_motivations'],
    format: 'number'
  },

  // ==========================================================================
  // DISTINCT COUNT METRICS
  // ==========================================================================

  unique_records: {
    key: 'unique_records',
    label: 'Unique Records',
    type: 'distinct_count',
    field: 'recordId',
    entities: ['record_tags', 'record_motivations', 'phones', 'emails'],
    format: 'number'
  },

  unique_tags: {
    key: 'unique_tags',
    label: 'Unique Tags',
    type: 'distinct_count',
    field: 'tagId',
    entities: ['record_tags'],
    format: 'number'
  },

  unique_motivations: {
    key: 'unique_motivations',
    label: 'Unique Motivations',
    type: 'distinct_count',
    field: 'motivationId',
    entities: ['record_motivations'],
    format: 'number'
  },

  // ==========================================================================
  // SUM METRICS
  // ==========================================================================

  total_phone_count: {
    key: 'total_phone_count',
    label: 'Total Phones',
    type: 'sum',
    field: 'phoneCount',
    entities: ['records'],
    format: 'number'
  },

  total_email_count: {
    key: 'total_email_count',
    label: 'Total Emails',
    type: 'sum',
    field: 'emailCount',
    entities: ['records'],
    format: 'number'
  },

  total_tag_count: {
    key: 'total_tag_count',
    label: 'Total Tags',
    type: 'sum',
    field: 'tagCount',
    entities: ['records'],
    format: 'number'
  },

  total_motivation_count: {
    key: 'total_motivation_count',
    label: 'Total Motivations',
    type: 'sum',
    field: 'motivationCount',
    entities: ['records'],
    format: 'number'
  },

  total_call_attempts: {
    key: 'total_call_attempts',
    label: 'Total Call Attempts',
    type: 'sum',
    field: 'callAttempts',
    entities: ['records'],
    format: 'number'
  },

  total_sms_attempts: {
    key: 'total_sms_attempts',
    label: 'Total SMS Attempts',
    type: 'sum',
    field: 'smsAttempts',
    entities: ['records'],
    format: 'number'
  },

  // ==========================================================================
  // AVERAGE METRICS
  // ==========================================================================

  avg_phones_per_record: {
    key: 'avg_phones_per_record',
    label: 'Avg Phones per Record',
    type: 'avg',
    field: 'phoneCount',
    entities: ['records'],
    format: 'number'
  },

  avg_emails_per_record: {
    key: 'avg_emails_per_record',
    label: 'Avg Emails per Record',
    type: 'avg',
    field: 'emailCount',
    entities: ['records'],
    format: 'number'
  },

  avg_tags_per_record: {
    key: 'avg_tags_per_record',
    label: 'Avg Tags per Record',
    type: 'avg',
    field: 'tagCount',
    entities: ['records'],
    format: 'number'
  },

  // ==========================================================================
  // RATE METRICS
  // ==========================================================================

  completion_rate: {
    key: 'completion_rate',
    label: 'Completion Rate',
    type: 'rate',
    entities: ['records'],
    format: 'percent',
    numerator: {
      type: 'count',
      filter: [{ field: 'isComplete', operator: 'eq', value: true }]
    },
    denominator: {
      type: 'count'
    }
  },

  contact_rate: {
    key: 'contact_rate',
    label: 'Contact Rate',
    type: 'rate',
    entities: ['records'],
    format: 'percent',
    numerator: {
      type: 'count',
      filter: [{ field: 'isContact', operator: 'eq', value: true }]
    },
    denominator: {
      type: 'count'
    }
  },

  task_completion_rate: {
    key: 'task_completion_rate',
    label: 'Task Completion Rate',
    type: 'rate',
    entities: ['tasks'],
    format: 'percent',
    numerator: {
      type: 'count',
      filter: [{ field: 'status', operator: 'eq', value: 'COMPLETED' }]
    },
    denominator: {
      type: 'count'
    }
  },

  hot_lead_rate: {
    key: 'hot_lead_rate',
    label: 'Hot Lead Rate',
    type: 'rate',
    entities: ['records'],
    format: 'percent',
    numerator: {
      type: 'count',
      filter: [{ field: 'temperature', operator: 'eq', value: 'hot' }]
    },
    denominator: {
      type: 'count'
    }
  }
}

/**
 * Get metric definition by key
 */
export function getMetric(key: string): MetricDefinition | undefined {
  return METRIC_REGISTRY[key]
}

/**
 * Get metrics available for a specific entity
 */
export function getMetricsForEntity(entityKey: string): MetricDefinition[] {
  return Object.values(METRIC_REGISTRY).filter(m => 
    (m.entities as string[]).includes('*') || (m.entities as string[]).includes(entityKey)
  )
}

/**
 * Get all metric keys
 */
export function getMetricKeys(): string[] {
  return Object.keys(METRIC_REGISTRY)
}
