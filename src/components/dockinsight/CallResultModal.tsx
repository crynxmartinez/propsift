'use client'

import { useState } from 'react'
import { X, Phone, Calendar, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CallResultModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (outcome: string, notes?: string, callbackTime?: Date) => void
  phoneNumber: string
}

const OUTCOMES = [
  { value: 'ANSWERED_INTERESTED', label: 'Interested', color: 'bg-green-500', category: 'Answered' },
  { value: 'ANSWERED_CALLBACK', label: 'Callback Requested', color: 'bg-green-400', category: 'Answered' },
  { value: 'ANSWERED_NEUTRAL', label: 'Neutral', color: 'bg-yellow-500', category: 'Answered' },
  { value: 'ANSWERED_NOT_NOW', label: 'Not Now', color: 'bg-yellow-400', category: 'Answered' },
  { value: 'ANSWERED_NOT_INTERESTED', label: 'Not Interested', color: 'bg-red-400', category: 'Answered' },
  { value: 'VOICEMAIL', label: 'Voicemail', color: 'bg-blue-400', category: 'No Contact' },
  { value: 'NO_ANSWER', label: 'No Answer', color: 'bg-gray-400', category: 'No Contact' },
  { value: 'BUSY', label: 'Busy', color: 'bg-orange-400', category: 'No Contact' },
  { value: 'WRONG_NUMBER', label: 'Wrong Number', color: 'bg-red-500', category: 'Bad Number' },
  { value: 'DISCONNECTED', label: 'Disconnected', color: 'bg-red-600', category: 'Bad Number' },
  { value: 'DNC', label: 'DNC Requested', color: 'bg-red-700', category: 'Bad Number' },
]

export function CallResultModal({
  isOpen,
  onClose,
  onSubmit,
  phoneNumber,
}: CallResultModalProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackTime, setCallbackTime] = useState('')

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!selectedOutcome) return

    let callbackDateTime: Date | undefined
    if (selectedOutcome === 'ANSWERED_CALLBACK' && callbackDate) {
      callbackDateTime = new Date(`${callbackDate}T${callbackTime || '09:00'}`)
    }

    onSubmit(selectedOutcome, notes || undefined, callbackDateTime)
    
    // Reset state
    setSelectedOutcome(null)
    setNotes('')
    setCallbackDate('')
    setCallbackTime('')
  }

  const groupedOutcomes = OUTCOMES.reduce((acc, outcome) => {
    if (!acc[outcome.category]) {
      acc[outcome.category] = []
    }
    acc[outcome.category].push(outcome)
    return acc
  }, {} as Record<string, typeof OUTCOMES>)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Log Call Result</CardTitle>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3" />
              {phoneNumber}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Outcome Selection */}
          {Object.entries(groupedOutcomes).map(([category, outcomes]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">{category}</h4>
              <div className="grid grid-cols-2 gap-2">
                {outcomes.map((outcome) => (
                  <button
                    key={outcome.value}
                    onClick={() => setSelectedOutcome(outcome.value)}
                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                      selectedOutcome === outcome.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${outcome.color}`} />
                      {outcome.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Callback Date/Time (for callback outcome) */}
          {selectedOutcome === 'ANSWERED_CALLBACK' && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Schedule Callback
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={callbackDate}
                  onChange={(e) => setCallbackDate(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                <input
                  type="time"
                  value={callbackTime}
                  onChange={(e) => setCallbackTime(e.target.value)}
                  className="w-24 px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the call..."
              className="w-full px-3 py-2 border rounded-md text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedOutcome}
              className="flex-1"
            >
              Log Result
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
