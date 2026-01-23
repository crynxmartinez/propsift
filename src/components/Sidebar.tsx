'use client'

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
  PhoneCall
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

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

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

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

        <div className="p-4 space-y-2 shrink-0">
          <div className="flex items-center justify-between px-2">
            <span className="text-sm text-muted-foreground">Theme</span>
            <ThemeToggle />
          </div>
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
