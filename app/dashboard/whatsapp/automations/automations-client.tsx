"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Zap, Save, Clock, FileText } from "lucide-react"
import { upsertAutomationRule } from "@/lib/actions/whatsapp-automations"
import { toast } from "sonner"

type Rule = {
  id: string
  eventName: string
  isActive: boolean
  templateId: string | null
  delayMinutes: number
}

type Template = {
  id: string
  name: string
}

const AVAILABLE_EVENTS = [
  { id: "APPOINTMENT_BOOKED", label: "New Appointment Booked", description: "Triggered immediately when an appointment is scheduled." },
  { id: "APPOINTMENT_REMINDER_24H", label: "24h Appointment Reminder", description: "Triggered exactly 24 hours before the scheduled time." },
  { id: "LAB_RESULT_READY", label: "Lab Result Ready", description: "Triggered when a pathology or radiology result is marked as completed." },
  { id: "DISCHARGE_SUMMARY", label: "Patient Discharged", description: "Triggered when IPD patient discharge is finalized." },
  { id: "PAYMENT_DUE", label: "Payment Overdue Reminder", description: "Triggered on unpaid bills after configured delay." }
]

export function AutomationsClient({ initialRules, templates }: { initialRules: Rule[], templates: Template[] }) {
  const [rules, setRules] = useState(initialRules)
  const [savingId, setSavingId] = useState<string | null>(null)

  const getRuleData = (eventId: string) => {
    return rules.find(r => r.eventName === eventId) || {
      eventName: eventId,
      isActive: false,
      templateId: "",
      delayMinutes: 0
    }
  }

  const handleSave = async (eventId: string, data: Partial<Rule>) => {
    setSavingId(eventId)
    const currentData = getRuleData(eventId)
    
    const payload = {
      eventName: eventId,
      isActive: data.isActive !== undefined ? data.isActive : currentData.isActive,
      templateId: (data.templateId !== undefined ? data.templateId : currentData.templateId) || "",
      delayMinutes: data.delayMinutes !== undefined ? data.delayMinutes : currentData.delayMinutes
    }

    const res = await upsertAutomationRule(payload)
    if (res.success && res.data) {
      toast.success(res.message)
      setRules(prev => {
        const exists = prev.find(p => p.eventName === eventId)
        if (exists) return prev.map(p => p.eventName === eventId ? res.data as Rule : p)
        return [...prev, res.data as Rule]
      })
    } else {
      toast.error(res.error)
    }
    setSavingId(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Zap className="h-6 w-6 text-yellow-500" />
          Smart Automations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure event-driven triggers to automatically send WhatsApp messages to patients.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {AVAILABLE_EVENTS.map(event => {
          const current = getRuleData(event.id)
          return (
            <Card key={event.id} className={current.isActive ? "border-green-200 shadow-sm" : ""}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{event.label}</CardTitle>
                  <CardDescription>{event.description}</CardDescription>
                </div>
                <Switch 
                  checked={current.isActive}
                  onCheckedChange={(checked) => handleSave(event.id, { isActive: checked })}
                  disabled={savingId === event.id}
                />
              </CardHeader>
              <CardContent>
                <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" /> Message Template
                    </Label>
                    <Select 
                      value={current.templateId || undefined} 
                      onValueChange={(val) => handleSave(event.id, { templateId: val })}
                      disabled={savingId === event.id || !current.isActive}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an approved template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map(t => (
                          <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" /> Delay (Minutes)
                    </Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        min="0"
                        value={current.delayMinutes}
                        onChange={(e) => {
                          const updated = [...rules]
                          const idx = updated.findIndex(r => r.eventName === event.id)
                          if (idx >= 0) updated[idx].delayMinutes = parseInt(e.target.value) || 0
                          setRules(updated)
                        }}
                        onBlur={(e) => handleSave(event.id, { delayMinutes: parseInt(e.target.value) || 0 })}
                        disabled={savingId === event.id || !current.isActive}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
