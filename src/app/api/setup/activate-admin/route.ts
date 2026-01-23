import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// One-time endpoint to activate admin account
// DELETE after use
export async function POST() {
  try {
    const updated = await prisma.user.updateMany({
      where: { email: 'admin@propsift.com' },
      data: {
        status: 'active',
        emailVerified: true,
        verificationToken: null,
        verificationExpires: null,
      }
    })

    if (updated.count > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Admin account activated successfully' 
      })
    }

    return NextResponse.json({ 
      success: false, 
      message: 'Admin account not found' 
    }, { status: 404 })
  } catch (error) {
    console.error('Activate admin error:', error)
    return NextResponse.json({ error: 'Failed to activate admin' }, { status: 500 })
  }
}
