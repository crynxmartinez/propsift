/**
 * DockInsight 3.0 - Charts API
 * 
 * GET /api/dockinsight/charts
 * Returns chart data for temperature, tags, and motivations
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getAuthUser } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

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
      return NextResponse.json({ error: 'User not found or inactive' }, { status: 401 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const isExecutiveView = searchParams.get('executive') === 'true'
    const market = searchParams.get('market') || undefined
    const assigneeIds = searchParams.get('assigneeIds')?.split(',').filter(Boolean) || undefined
    const temperature = searchParams.get('temperature')?.split(',').filter(Boolean) || undefined
    const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean) || undefined
    const callReady = searchParams.get('callReady')
    
    // Build base where clause - include legacy records with null createdById
    const baseWhere: any = {
      OR: [
        { createdById: authUser.ownerId },
        { createdById: null }
      ]
    }
    
    // Apply filters
    if (!isExecutiveView) {
      baseWhere.assignedToId = authUser.id
    } else if (assigneeIds && assigneeIds.length > 0) {
      baseWhere.assignedToId = { in: assigneeIds }
    }
    
    if (market) {
      baseWhere.propertyState = market
    }
    
    if (temperature && temperature.length > 0) {
      baseWhere.temperature = { in: temperature }
    }
    
    if (tagIds && tagIds.length > 0) {
      baseWhere.recordTags = {
        some: {
          tagId: { in: tagIds }
        }
      }
    }
    
    if (callReady === 'true') {
      baseWhere.isComplete = true
    } else if (callReady === 'false') {
      baseWhere.isComplete = false
    }

    // Debug: Log the query and check total records
    const totalRecords = await prisma.record.count({ where: baseWhere })
    console.log('Charts API - baseWhere:', JSON.stringify(baseWhere))
    console.log('Charts API - isExecutiveView:', isExecutiveView)
    console.log('Charts API - totalRecords matching query:', totalRecords)
    
    // Fetch chart data in parallel
    const [temperatureData, tagsData, motivationsData] = await Promise.all([
      // Records by Temperature
      getTemperatureData(baseWhere),
      // Top Tags
      getTopTags(authUser.ownerId, baseWhere),
      // Top Motivations with temperature breakdown
      getTopMotivations(authUser.ownerId, baseWhere)
    ])

    console.log('Charts API - temperatureData:', JSON.stringify(temperatureData))
    console.log('Charts API - tagsData length:', tagsData.length)
    console.log('Charts API - motivationsData length:', motivationsData.length)

    return NextResponse.json({
      temperature: temperatureData,
      tags: tagsData,
      motivations: motivationsData
    })
    
  } catch (error) {
    console.error('Charts API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function getTemperatureData(baseWhere: any) {
  const results = await prisma.record.groupBy({
    by: ['temperature'],
    where: baseWhere,
    _count: { id: true }
  })

  const temperatureMap: Record<string, number> = {
    hot: 0,
    warm: 0,
    cold: 0
  }

  results.forEach(r => {
    if (r.temperature) {
      const temp = r.temperature.toLowerCase()
      if (temperatureMap.hasOwnProperty(temp)) {
        temperatureMap[temp] = r._count.id
      }
    }
  })

  return [
    { label: 'Hot', value: temperatureMap.hot, color: '#ef4444' },
    { label: 'Warm', value: temperatureMap.warm, color: '#f97316' },
    { label: 'Cold', value: temperatureMap.cold, color: '#3b82f6' }
  ]
}

async function getTopTags(ownerId: string, baseWhere: any) {
  // Get tag counts through record tags
  const tagCounts = await prisma.recordTag.groupBy({
    by: ['tagId'],
    where: {
      record: baseWhere
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  })

  if (tagCounts.length === 0) return []

  // Get tag names
  const tagIds = tagCounts.map(t => t.tagId)
  const tags = await prisma.tag.findMany({
    where: { id: { in: tagIds } },
    select: { id: true, name: true }
  })

  const tagMap = new Map(tags.map(t => [t.id, t.name]))

  return tagCounts.map((tc, index) => ({
    label: tagMap.get(tc.tagId) || 'Unknown',
    value: tc._count.id,
    color: getChartColor(index)
  }))
}

async function getTopMotivations(ownerId: string, baseWhere: any) {
  // Get motivation counts through record motivations
  const motivationCounts = await prisma.recordMotivation.groupBy({
    by: ['motivationId'],
    where: {
      record: baseWhere
    },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10
  })

  if (motivationCounts.length === 0) return []

  // Get motivation names
  const motivationIds = motivationCounts.map(m => m.motivationId)
  const motivations = await prisma.motivation.findMany({
    where: { id: { in: motivationIds } },
    select: { id: true, name: true }
  })

  const motivationMap = new Map(motivations.map(m => [m.id, m.name]))

  // For each motivation, get temperature breakdown
  const result = await Promise.all(
    motivationCounts.map(async (mc) => {
      // Get temperature breakdown for this motivation
      const tempBreakdown = await prisma.record.groupBy({
        by: ['temperature'],
        where: {
          ...baseWhere,
          motivations: {
            some: { motivationId: mc.motivationId }
          }
        },
        _count: { id: true }
      })

      const temps: Record<string, number> = { hot: 0, warm: 0, cold: 0 }
      tempBreakdown.forEach(tb => {
        if (tb.temperature && temps.hasOwnProperty(tb.temperature)) {
          temps[tb.temperature] = tb._count.id
        }
      })

      return {
        label: motivationMap.get(mc.motivationId) || 'Unknown',
        total: mc._count.id,
        hot: temps.hot,
        warm: temps.warm,
        cold: temps.cold
      }
    })
  )

  return result
}

function getChartColor(index: number): string {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'
  ]
  return colors[index % colors.length]
}
