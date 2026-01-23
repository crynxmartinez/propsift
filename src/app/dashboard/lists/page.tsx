'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tag, Zap, CircleDot, PhoneCall, List, Loader2 } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import TagsContent from './TagsContent'
import MotivationsContent from './MotivationsContent'
import StatusesContent from './StatusesContent'
import CallResultsContent from './CallResultsContent'

const tabs = [
  { id: 'tags', label: 'Tags', icon: Tag },
  { id: 'motivations', label: 'Motivations', icon: Zap },
  { id: 'statuses', label: 'Statuses', icon: CircleDot },
  { id: 'call-results', label: 'Call Results', icon: PhoneCall },
]

function ListsContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'tags'
  const [activeTab, setActiveTab] = useState(initialTab)

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <List className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Lists</h1>
            <p className="text-muted-foreground">Manage your tags, motivations, statuses, and call results</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="tags">
          <TagsContent />
        </TabsContent>

        <TabsContent value="motivations">
          <MotivationsContent />
        </TabsContent>

        <TabsContent value="statuses">
          <StatusesContent />
        </TabsContent>

        <TabsContent value="call-results">
          <CallResultsContent />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ListsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <ListsContent />
    </Suspense>
  )
}
