'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Settings, 
  LogOut,
  Tag,
  Zap,
  CircleDot,
  FileText,
  Activity,
  CheckSquare,
  LayoutGrid,
  Workflow,
  BarChart3,
  MessageSquare,
  PhoneCall,
  Crown,
  Shield,
  ShieldCheck,
  User
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface UserProfile {
  firstName: string | null
  role: string
}

const roleConfig: Record<string, { label: string; color: string; icon: typeof Crown; description: string }> = {
  owner: {
    label: 'Owner',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: Crown,
    description: 'Full access. Can manage billing, delete account, and control all team members.'
  },
  super_admin: {
    label: 'Super Admin',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Shield,
    description: 'Full access to records, tasks, settings. Can manage team members. Cannot delete account.'
  },
  admin: {
    label: 'Admin',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: ShieldCheck,
    description: 'Can view all data, manage records/tasks/tags/statuses. Cannot manage team members.'
  },
  member: {
    label: 'Member',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    icon: User,
    description: 'Can only see/edit records and tasks assigned to them. Limited access.'
  }
}

const menuItems = [
  { name: 'Dock Insight', href: '/dashboard', icon: BarChart3 },
  { name: 'Board', href: '/dashboard/board', icon: LayoutGrid },
  { name: 'Records', href: '/dashboard/records', icon: FileText },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckSquare },
  { name: 'Automations', href: '/dashboard/automations', icon: Workflow },
  { name: 'Tags', href: '/dashboard/tags', icon: Tag },
  { name: 'Motivations', href: '/dashboard/motivations', icon: Zap },
  { name: 'Statuses', href: '/dashboard/statuses', icon: CircleDot },
  { name: 'Call Results', href: '/dashboard/call-results', icon: PhoneCall },
  { name: 'System', href: '/dashboard/activity', icon: Activity },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Feedback', href: '/dashboard/feedback', icon: MessageSquare },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token')
      if (!token) return

      try {
        const res = await fetch('/api/settings/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setUser({ firstName: data.firstName, role: data.role })
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }

    fetchUser()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const role = roleConfig[user?.role || 'member'] || roleConfig.member
  const RoleIcon = role.icon

  return (
    <TooltipProvider>
      <aside className="w-64 bg-card text-card-foreground h-screen sticky top-0 flex flex-col shrink-0 border-r z-50">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <Image
              src="https://storage.googleapis.com/msgsndr/xzA6eU8kOYmBuwFdr3CF/media/6972f53c15885e29eeb6832e.jpg"
              alt="PropSift Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <div>
              <h1 className="font-bold text-lg">PropSift</h1>
              <p className="text-xs text-muted-foreground">Property Manager</p>
            </div>
          </div>
        </div>

        <Separator />

        <ScrollArea className="flex-1 px-3 py-4">
          <nav>
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.name}</p>
                      </TooltipContent>
                    </Tooltip>
                  </li>
                )
              })}
            </ul>
          </nav>
        </ScrollArea>

        <Separator />

        <div className="p-4 space-y-3 shrink-0">
          {/* User Welcome Section */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/dashboard/settings"
                className="block p-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
              >
                <p className="text-xs text-muted-foreground">Welcome back,</p>
                <p className="font-medium text-foreground truncate">
                  {user?.firstName || 'User'}
                </p>
                <div className={cn(
                  "inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium border",
                  role.color
                )}>
                  <RoleIcon className="w-3 h-3" />
                  {role.label}
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p className="font-medium">{role.label}</p>
              <p className="text-xs text-muted-foreground">{role.description}</p>
            </TooltipContent>
          </Tooltip>

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  )
}
