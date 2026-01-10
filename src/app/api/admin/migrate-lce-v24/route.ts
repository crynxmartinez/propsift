/**
 * LCE v2.4 Migration Script
 * 
 * This endpoint updates existing CallResult and Status records
 * with the new resultType, workability, and temperatureEffect fields.
 * 
 * Run once after deploying schema changes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'

// Call Result name to resultType mapping
const CALL_RESULT_TYPE_MAP: Record<string, string> = {
  // NO_CONTACT - Advance cadence step
  'no answer': 'NO_CONTACT',
  'voicemail': 'NO_CONTACT',
  'left message': 'NO_CONTACT',
  'left voicemail': 'NO_CONTACT',
  'no response': 'NO_CONTACT',
  
  // RETRY - Stay on same step, retry tomorrow
  'busy': 'RETRY',
  'busy signal': 'RETRY',
  'call back': 'RETRY',
  'callback': 'RETRY',
  
  // CONTACT_MADE - Prompt for status selection
  'answered': 'CONTACT_MADE',
  'spoke with': 'CONTACT_MADE',
  'spoke to owner': 'CONTACT_MADE',
  'contact made': 'CONTACT_MADE',
  'connected': 'CONTACT_MADE',
  'talked to': 'CONTACT_MADE',
  'conversation': 'CONTACT_MADE',
  'hung up': 'CONTACT_MADE',
  
  // BAD_DATA - Mark phone bad, move to Get Numbers
  'wrong number': 'BAD_DATA',
  'disconnected': 'BAD_DATA',
  'not in service': 'BAD_DATA',
  'invalid number': 'BAD_DATA',
  'bad number': 'BAD_DATA',
  'fax': 'BAD_DATA',
  'fax machine': 'BAD_DATA',
  
  // TERMINAL - Exit permanently
  'dnc': 'TERMINAL',
  'do not call': 'TERMINAL',
  'dnc requested': 'TERMINAL',
  'cease and desist': 'TERMINAL',
}

// Status name to workability mapping
const STATUS_WORKABILITY_MAP: Record<string, string> = {
  // WORKABLE - Can be contacted
  'new lead': 'WORKABLE',
  'new': 'WORKABLE',
  'follow up': 'WORKABLE',
  'follow-up': 'WORKABLE',
  'attempting contact': 'WORKABLE',
  'contacted': 'WORKABLE',
  'interested': 'WORKABLE',
  'not interested': 'WORKABLE',
  'warm': 'WORKABLE',
  'hot': 'WORKABLE',
  'cold': 'WORKABLE',
  'lead': 'WORKABLE',
  'prospect': 'WORKABLE',
  'working': 'WORKABLE',
  'active': 'WORKABLE',
  
  // PAUSED - Temporarily on hold
  'callback scheduled': 'PAUSED',
  'call back scheduled': 'PAUSED',
  'pending': 'PAUSED',
  'on hold': 'PAUSED',
  'waiting': 'PAUSED',
  'paused': 'PAUSED',
  
  // CLOSED_WON - Deal success
  'under contract': 'CLOSED_WON',
  'sold': 'CLOSED_WON',
  'closed': 'CLOSED_WON',
  'deal': 'CLOSED_WON',
  'won': 'CLOSED_WON',
  'converted': 'CLOSED_WON',
  'acquisition': 'CLOSED_WON',
  
  // CLOSED_LOST - Not a viable lead
  'dead': 'CLOSED_LOST',
  'lost': 'CLOSED_LOST',
  'not viable': 'CLOSED_LOST',
  'no deal': 'CLOSED_LOST',
  'archived': 'CLOSED_LOST',
  
  // DNC - Do Not Contact
  'dnc': 'DNC',
  'do not call': 'DNC',
  'do not contact': 'DNC',
}

// Status name to temperatureEffect mapping
const STATUS_TEMP_EFFECT_MAP: Record<string, string | null> = {
  // UPGRADE - Move up one temperature level
  'interested': 'UPGRADE',
  'hot': 'UPGRADE',
  'hot lead': 'UPGRADE',
  
  // DOWNGRADE - Move down one temperature level
  'not interested': 'DOWNGRADE',
  'cold': 'DOWNGRADE',
  'dead': 'DOWNGRADE',
  
  // null - No temperature change (default)
}

function getResultType(name: string): string {
  const normalized = name.toLowerCase().trim()
  return CALL_RESULT_TYPE_MAP[normalized] || 'NO_CONTACT'
}

function getWorkability(name: string): string {
  const normalized = name.toLowerCase().trim()
  return STATUS_WORKABILITY_MAP[normalized] || 'WORKABLE'
}

function getTemperatureEffect(name: string): string | null {
  const normalized = name.toLowerCase().trim()
  return STATUS_TEMP_EFFECT_MAP[normalized] || null
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate - only allow admin/owner
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Only allow owners to run migration
    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Only owners can run migrations' }, { status: 403 })
    }

    const results = {
      callResults: { updated: 0, skipped: 0, details: [] as string[] },
      statuses: { updated: 0, skipped: 0, details: [] as string[] },
    }

    // Update CallResults
    const callResults = await prisma.callResult.findMany({
      where: { createdById: authUser.ownerId }
    })

    for (const cr of callResults) {
      const newResultType = getResultType(cr.name)
      
      // Only update if different from default or if field is empty
      if (cr.resultType !== newResultType) {
        await prisma.callResult.update({
          where: { id: cr.id },
          data: { resultType: newResultType }
        })
        results.callResults.updated++
        results.callResults.details.push(`${cr.name} → ${newResultType}`)
      } else {
        results.callResults.skipped++
      }
    }

    // Update Statuses
    const statuses = await prisma.status.findMany({
      where: { createdById: authUser.ownerId }
    })

    for (const status of statuses) {
      const newWorkability = getWorkability(status.name)
      const newTempEffect = getTemperatureEffect(status.name)
      
      const needsUpdate = 
        status.workability !== newWorkability || 
        status.temperatureEffect !== newTempEffect

      if (needsUpdate) {
        await prisma.status.update({
          where: { id: status.id },
          data: { 
            workability: newWorkability,
            temperatureEffect: newTempEffect
          }
        })
        results.statuses.updated++
        results.statuses.details.push(
          `${status.name} → workability: ${newWorkability}, tempEffect: ${newTempEffect || 'null'}`
        )
      } else {
        results.statuses.skipped++
      }
    }

    return NextResponse.json({
      success: true,
      message: 'LCE v2.4 migration completed',
      results
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: String(error) },
      { status: 500 }
    )
  }
}

// GET endpoint to check current status
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const authUser = await getAuthUser(decoded.userId)
    if (!authUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 })
    }

    // Get current CallResults with their resultType
    const callResults = await prisma.callResult.findMany({
      where: { createdById: authUser.ownerId },
      select: { id: true, name: true, resultType: true }
    })

    // Get current Statuses with their workability and temperatureEffect
    const statuses = await prisma.status.findMany({
      where: { createdById: authUser.ownerId },
      select: { id: true, name: true, workability: true, temperatureEffect: true }
    })

    return NextResponse.json({
      callResults,
      statuses,
      summary: {
        totalCallResults: callResults.length,
        totalStatuses: statuses.length,
        callResultTypes: callResults.reduce((acc, cr) => {
          acc[cr.resultType] = (acc[cr.resultType] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        statusWorkabilities: statuses.reduce((acc, s) => {
          acc[s.workability] = (acc[s.workability] || 0) + 1
          return acc
        }, {} as Record<string, number>),
      }
    })

  } catch (error) {
    console.error('Error fetching migration status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    )
  }
}
