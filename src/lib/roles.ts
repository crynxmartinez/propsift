import { prisma } from '@/lib/prisma'

export type UserRole = 'owner' | 'super_admin' | 'admin' | 'member'

export interface AuthUser {
  id: string
  role: UserRole
  accountOwnerId: string | null
  ownerId: string
}

export async function getAuthUser(userId: string): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, accountOwnerId: true, status: true }
  })

  if (!user || user.status !== 'active') {
    return null
  }

  return {
    id: user.id,
    role: user.role as UserRole,
    accountOwnerId: user.accountOwnerId,
    ownerId: user.accountOwnerId || user.id
  }
}

export function canManageData(role: UserRole): boolean {
  return ['owner', 'super_admin', 'admin'].includes(role)
}

export function canDeleteData(role: UserRole): boolean {
  return ['owner', 'super_admin', 'admin'].includes(role)
}

export function canImportExport(role: UserRole): boolean {
  return ['owner', 'super_admin', 'admin'].includes(role)
}

export function canManageSettings(role: UserRole): boolean {
  return ['owner', 'super_admin'].includes(role)
}

export function canManageUsers(role: UserRole): boolean {
  return ['owner', 'super_admin'].includes(role)
}

export function canViewAllData(role: UserRole): boolean {
  return ['owner', 'super_admin', 'admin'].includes(role)
}
