import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// One-time endpoint to clear test user for re-registration
// DELETE after use
export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Delete the user if exists
    const deleted = await prisma.user.deleteMany({
      where: { email: email.toLowerCase() }
    })

    if (deleted.count > 0) {
      return NextResponse.json({ 
        success: true, 
        message: `Deleted user with email: ${email}` 
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'No user found with that email' 
    })
  } catch (error) {
    console.error('Clear test user error:', error)
    return NextResponse.json({ error: 'Failed to clear user' }, { status: 500 })
  }
}
