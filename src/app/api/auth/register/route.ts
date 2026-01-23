import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { sendVerificationEmail, generateVerificationToken, getVerificationExpiry } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Get IP address for rate limiting
    const forwardedFor = request.headers.get('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      // If user exists but not verified, allow resending verification
      if (existingUser.status === 'pending' && !existingUser.emailVerified) {
        // Check if we can resend (24 hour limit per IP)
        const lastSent = existingUser.lastVerificationSentAt
        if (lastSent) {
          const hoursSinceLastSent = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60)
          if (hoursSinceLastSent < 24) {
            return NextResponse.json({ 
              error: 'A verification email was already sent. Please check your inbox or try again later.',
              alreadyRegistered: true 
            }, { status: 429 })
          }
        }

        // Resend verification email
        const verificationToken = generateVerificationToken()
        const verificationExpires = getVerificationExpiry()

        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            verificationToken,
            verificationExpires,
            lastVerificationSentAt: new Date(),
            registrationIp: ip,
          }
        })

        await sendVerificationEmail(email, verificationToken)

        return NextResponse.json({
          success: true,
          message: 'Verification email resent. Please check your inbox.',
          requiresVerification: true,
        })
      }

      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }

    // Check for IP-based rate limiting (prevent spam registrations from same IP)
    const recentRegistrations = await prisma.user.count({
      where: {
        registrationIp: ip,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })

    if (recentRegistrations >= 3) {
      return NextResponse.json({ 
        error: 'Too many registration attempts from this location. Please try again later.' 
      }, { status: 429 })
    }

    // Hash password and create user with pending status
    const hashedPassword = await hashPassword(password)
    const verificationToken = generateVerificationToken()
    const verificationExpires = getVerificationExpiry()

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        status: 'pending',
        emailVerified: false,
        verificationToken,
        verificationExpires,
        lastVerificationSentAt: new Date(),
        registrationIp: ip,
      },
    })

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationToken)

    if (!emailSent) {
      console.error('Failed to send verification email to:', email)
    }

    return NextResponse.json({
      success: true,
      message: 'Account created! Please check your email to activate your account.',
      requiresVerification: true,
      user: {
        id: user.id,
        email: user.email,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
