import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, accountOwnerId: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only owner, super_admin, admin can view team
    if (!['owner', 'super_admin', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get the account owner ID (either the user themselves if owner, or their accountOwnerId)
    const ownerId = currentUser.accountOwnerId || currentUser.id

    // Get all team members for this account
    const teamMembers = await prisma.user.findMany({
      where: {
        OR: [
          { id: ownerId }, // The owner
          { accountOwnerId: ownerId } // Team members
        ]
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' }, // owner first
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json(teamMembers)
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true, accountOwnerId: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only owner and super_admin can add team members
    if (!['owner', 'super_admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { email, firstName, lastName, role, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Validate role
    if (!['super_admin', 'admin', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 })
    }

    // Get the account owner ID
    const ownerId = currentUser.accountOwnerId || currentUser.id

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new team member
    const newMember = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        role,
        status: 'active',
        accountOwnerId: ownerId,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      }
    })

    return NextResponse.json(newMember, { status: 201 })
  } catch (error) {
    console.error('Error creating team member:', error)
    return NextResponse.json({ error: 'Failed to create team member' }, { status: 500 })
  }
}
