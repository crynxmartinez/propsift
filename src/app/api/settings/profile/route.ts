import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

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

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        phone: true,
        timezone: true,
        companyName: true,
        companyEmail: true,
        companyPhone: true,
        billingAddress: true,
        billingCity: true,
        billingState: true,
        billingZip: true,
        billingCountry: true,
        accountOwnerId: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      phone,
      timezone,
      companyName,
      companyEmail,
      companyPhone,
      billingAddress,
      billingCity,
      billingState,
      billingZip,
      billingCountry,
    } = body

    // Get current user to check role
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true }
    })

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Build update data - only include company fields if user is owner or super_admin
    const updateData: Record<string, string | null | undefined> = {
      firstName,
      lastName,
      phone,
      timezone,
    }

    // Only owner and super_admin can update company info
    if (['owner', 'super_admin'].includes(currentUser.role)) {
      updateData.companyName = companyName
      updateData.companyEmail = companyEmail
      updateData.companyPhone = companyPhone
      updateData.billingAddress = billingAddress
      updateData.billingCity = billingCity
      updateData.billingState = billingState
      updateData.billingZip = billingZip
      updateData.billingCountry = billingCountry
    }

    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        firstName: true,
        lastName: true,
        phone: true,
        timezone: true,
        companyName: true,
        companyEmail: true,
        companyPhone: true,
        billingAddress: true,
        billingCity: true,
        billingState: true,
        billingZip: true,
        billingCountry: true,
        accountOwnerId: true,
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
