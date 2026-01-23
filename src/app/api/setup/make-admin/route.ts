import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// One-time setup endpoint to make admin@propsift.com a platform admin
// DELETE THIS FILE after running it once!
export async function POST(request: NextRequest) {
  const email = 'admin@propsift.com';
  
  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, isPlatformAdmin: true }
    });

    if (!user) {
      // List existing users for debugging
      const users = await prisma.user.findMany({
        select: { email: true, isPlatformAdmin: true },
        take: 10
      });
      
      return NextResponse.json({ 
        error: `User "${email}" not found`,
        existingUsers: users.map(u => u.email)
      }, { status: 404 });
    }

    if (user.isPlatformAdmin) {
      return NextResponse.json({ 
        message: `User "${email}" is already a Platform Admin`,
        user: { email: user.email, name: user.name, isPlatformAdmin: true }
      });
    }

    // Set as platform admin
    const updated = await prisma.user.update({
      where: { email },
      data: { isPlatformAdmin: true },
      select: { id: true, email: true, name: true, isPlatformAdmin: true }
    });

    return NextResponse.json({ 
      success: true,
      message: `Successfully set "${email}" as Platform Admin!`,
      user: updated,
      nextStep: 'You can now access /admin after logging in. DELETE this API route!'
    });
  } catch (error) {
    console.error('Error setting platform admin:', error);
    return NextResponse.json({ error: 'Failed to set platform admin' }, { status: 500 });
  }
}
