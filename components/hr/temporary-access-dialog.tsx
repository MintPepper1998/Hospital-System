"use client"

import { useState, useTransition } from "react"
import { format } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ShieldAlert, Clock, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { grantTemporaryPermission, revokeTemporaryPermission } from "@/lib/actions/permissions"

interface TemporaryPermission {
  id: string
  userId: string
  permission: string
  grantedAt: string
  expiresAt: string | null
  grantedBy: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  permissions: TemporaryPermission[]
  onSuccess: () => void
}

const AVAILABLE_TEMP_PERMISSIONS = [
  { value: "PHARMACY_EDIT", label: "Pharmacy: Edit Invoices" },
  { value: "PHARMACY_RETURN", label: "Pharmacy: Process Returns" },
]

export function TemporaryAccessDialog({ open, onOpenChange, userId, userName, permissions, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition()
  const [selectedPermission, setSelectedPermission] = useState("")
  const [durationMode, setDurationMode] = useState<"hours" | "date" | "always">("hours")
  const [hours, setHours] = useState("1")
  const [customDate, setCustomDate] = useState("")
  const [customTime, setCustomTime] = useState("")

  const activePermissions = permissions.filter(p => p.userId === userId)

  const handleGrant = () => {
    if (!selectedPermission) return toast.error("Select a permission")

    let durationInHours: number | null = null
    
    if (durationMode === "hours") {
      durationInHours = parseFloat(hours)
      if (isNaN(durationInHours) || durationInHours <= 0) return toast.error("Invalid hours")
    } else if (durationMode === "date") {
      if (!customDate) return toast.error("Select a date")
      const expiry = new Date(`${customDate}T${customTime || "23:59"}`)
      if (expiry <= new Date()) return toast.error("Expiry must be in the future")
      durationInHours = (expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60)
    }

    startTransition(async () => {
      const result = await grantTemporaryPermission(userId, selectedPermission, durationInHours)
      if (result.success) {
        toast.success(result.message)
        setSelectedPermission("")
        onSuccess()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      const result = await revokeTemporaryPermission(id)
      if (result.success) {
        toast.success(result.message)
        onSuccess()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500" />
            Temporary Access
          </DialogTitle>
          <DialogDescription>
            Grant elevated permissions to <strong>{userName}</strong> for a limited time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium border-b pb-2">Active Permissions</h4>
            {activePermissions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No temporary access granted.</p>
            ) : (
              <div className="space-y-2">
                {activePermissions.map((p) => {
                  const isExpired = p.expiresAt && new Date(p.expiresAt) < new Date()
                  return (
                    <div key={p.id} className={`flex items-center justify-between p-2 rounded-md border ${isExpired ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${isExpired ? 'text-red-700' : 'text-amber-700'}`}>
                          {AVAILABLE_TEMP_PERMISSIONS.find(a => a.value === p.permission)?.label || p.permission}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" />
                          {p.expiresAt 
                            ? isExpired 
                              ? `Expired ${format(new Date(p.expiresAt), "dd MMM HH:mm")}` 
                              : `Until ${format(new Date(p.expiresAt), "dd MMM HH:mm")}`
                            : "Always"}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-100" onClick={() => handleRevoke(p.id)} disabled={isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 border-t pt-4">
            <h4 className="text-sm font-medium">Grant New Permission</h4>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Permission</Label>
                <Select value={selectedPermission} onValueChange={setSelectedPermission}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select permission..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_TEMP_PERMISSIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Duration Mode</Label>
                <Select value={durationMode} onValueChange={(v: any) => setDurationMode(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours from now</SelectItem>
                    <SelectItem value="date">Custom Date/Time</SelectItem>
                    <SelectItem value="always">Always (No Expiry)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {durationMode === "hours" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Hours</Label>
                  <Input type="number" min="0.5" step="0.5" value={hours} onChange={e => setHours(e.target.value)} />
                </div>
              )}

              {durationMode === "date" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} min={new Date().toISOString().split("T")[0]} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Time (optional)</Label>
                    <Input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Done</Button>
          <Button onClick={handleGrant} disabled={isPending || !selectedPermission}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Grant Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
