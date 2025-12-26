/**
 * DockInsight 2.2.2 Entity Registry
 * 
 * Defines all queryable entities with their tenant scope, search fields, and date modes.
 * 
 * Key concepts:
 * - `delegate`: Prisma client delegate name (lowerCamelCase) for prisma[delegate] calls
 * - `tenantScope`: How to filter by tenant (direct field or via join)
 * - `searchFields`: Fields available for drilldown search
 */

import type { EntityDefinition } from './types'

export const ENTITY_REGISTRY: Record<string, EntityDefinition> = {
  records: {
    key: 'records',
    label: 'Record',
    labelPlural: 'Records',
    delegate: 'record',
    tenantScope: {
      mode: 'direct',
      field: 'createdById'
    },
    searchFields: [
      { kind: 'scalar', field: 'ownerFullName' },
      { kind: 'scalar', field: 'propertyStreet' },
      { kind: 'scalar', field: 'propertyCity' },
      { kind: 'scalar', field: 'phone' },
      { kind: 'scalar', field: 'email' },
      { kind: 'relation_some', field: 'phoneNumbers', targetField: 'number' },
      { kind: 'relation_some', field: 'emails', targetField: 'email' }
    ],
    dateModes: {
      default: 'createdAt',
      available: ['createdAt', 'updatedAt']
    }
  },

  tasks: {
    key: 'tasks',
    label: 'Task',
    labelPlural: 'Tasks',
    delegate: 'task',
    tenantScope: {
      mode: 'direct',
      field: 'createdById'
    },
    searchFields: [
      { kind: 'scalar', field: 'title' },
      { kind: 'scalar', field: 'description' }
    ],
    dateModes: {
      default: 'createdAt',
      available: ['createdAt', 'updatedAt', 'completedAt', 'dueDate']
    }
  },

  phones: {
    key: 'phones',
    label: 'Phone Number',
    labelPlural: 'Phone Numbers',
    delegate: 'recordPhoneNumber',
    tenantScope: {
      mode: 'via_join',
      joinEntity: 'records',      // Registry key (for cache deps)
      joinRelation: 'record',     // Prisma relation name (for query building)
      joinField: 'createdById'    // Field on joined model
    },
    searchFields: [
      { kind: 'scalar', field: 'number' }
    ],
    dateModes: {
      default: 'createdAt',
      available: ['createdAt', 'updatedAt']
    }
  },

  emails: {
    key: 'emails',
    label: 'Email',
    labelPlural: 'Emails',
    delegate: 'recordEmail',
    tenantScope: {
      mode: 'via_join',
      joinEntity: 'records',
      joinRelation: 'record',
      joinField: 'createdById'
    },
    searchFields: [
      { kind: 'scalar', field: 'email' }
    ],
    dateModes: {
      default: 'createdAt',
      available: ['createdAt', 'updatedAt']
    }
  },

  record_tags: {
    key: 'record_tags',
    label: 'Record Tag',
    labelPlural: 'Record Tags',
    delegate: 'recordTag',
    tenantScope: {
      mode: 'direct',
      field: 'createdById'
    },
    searchFields: [],  // No search on junction
    dateModes: {
      default: 'createdAt',
      available: ['createdAt']
    }
  },

  record_motivations: {
    key: 'record_motivations',
    label: 'Record Motivation',
    labelPlural: 'Record Motivations',
    delegate: 'recordMotivation',
    tenantScope: {
      mode: 'direct',
      field: 'createdById'
    },
    searchFields: [],  // No search on junction
    dateModes: {
      default: 'createdAt',
      available: ['createdAt']
    }
  },

  tags: {
    key: 'tags',
    label: 'Tag',
    labelPlural: 'Tags',
    delegate: 'tag',
    tenantScope: {
      mode: 'direct',
      field: 'createdById'
    },
    searchFields: [
      { kind: 'scalar', field: 'name' }
    ],
    dateModes: {
      default: 'createdAt',
      available: ['createdAt', 'updatedAt']
    }
  },

  motivations: {
    key: 'motivations',
    label: 'Motivation',
    labelPlural: 'Motivations',
    delegate: 'motivation',
    tenantScope: {
      mode: 'direct',
      field: 'createdById'
    },
    searchFields: [
      { kind: 'scalar', field: 'name' }
    ],
    dateModes: {
      default: 'createdAt',
      available: ['createdAt', 'updatedAt']
    }
  },

  activity: {
    key: 'activity',
    label: 'Activity Log',
    labelPlural: 'Activity Logs',
    delegate: 'recordActivityLog',
    tenantScope: {
      mode: 'via_join',
      joinEntity: 'records',
      joinRelation: 'record',
      joinField: 'createdById'
    },
    searchFields: [
      { kind: 'scalar', field: 'action' }
    ],
    dateModes: {
      default: 'createdAt',
      available: ['createdAt']
    }
  }
}

/**
 * Get entity definition by key
 */
export function getEntity(key: string): EntityDefinition | undefined {
  return ENTITY_REGISTRY[key]
}

/**
 * Get all entity keys
 */
export function getEntityKeys(): string[] {
  return Object.keys(ENTITY_REGISTRY)
}

/**
 * Check if entity exists
 */
export function hasEntity(key: string): boolean {
  return key in ENTITY_REGISTRY
}
