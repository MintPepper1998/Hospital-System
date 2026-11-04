"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { CreditCard, Search, Trash2, Plus, Wifi, WifiOff } from "lucide-react"
import { assignRfidCard, removeRfidCard } from "@/app/actions/rfid-cards"
import { toast } from "sonner"

type StaffRfid = {
  id: string
  employeeId: string
  name: string
  department: string
  rfidTag: string | null
}

export function RfidCardsClient({ initialStaff }: { initialStaff: StaffRfid[] }) {
  const [staff, setStaff] = useState(initialStaff)
  const [search, setSearch] = useState("")
  const [assigningStaff, setAssigningStaff] = useState<StaffRfid | null>(null)
  const [rfidInput, setRfidInput] = useState("")
  const [removingStaff, setRemovingStaff] = useState<StaffRfid | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const assigned = staff.filter((s) => s.rfidTag)
  const unassigned = staff.filter((s) => !s.rfidTag)

  const filtered = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.employeeId.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase()) ||
      (s.rfidTag && s.rfidTag.toLowerCase().includes(search.toLowerCase()))
  )

  const handleAssign = async () => {
    if (!assigningStaff || !rfidInput.trim()) return
    setIsSubmitting(true)
    const res = await assignRfidCard(assigningStaff.id, rfidInput.trim().toUpperCase())
    if (res.success) {
      toast.success(res.message)
      setStaff((prev) =>
        prev.map((s) => (s.id === assigningStaff.id ? { ...s, rfidTag: rfidInput.trim().toUpperCase() } : s))
      )
      setAssigningStaff(null)
      setRfidInput("")
    } else {
      toast.error(res.message)
    }
    setIsSubmitting(false)
  }

  const handleRemove = async () => {
    if (!removingStaff) return
    const res = await removeRfidCard(removingStaff.id)
    if (res.success) {
      toast.success(res.message)
      setStaff((prev) => prev.map((s) => (s.id === removingStaff.id ? { ...s, rfidTag: null } : s)))
      setRemovingStaff(null)
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-teal-600" />
            RFID Card Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assign RFID cards to staff for automated attendance check-in/check-out.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{staff.length}</p>
              <p className="text-xs text-muted-foreground">Total Staff</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Wifi className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{assigned.length}</p>
              <p className="text-xs text-muted-foreground">Cards Assigned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <WifiOff className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{unassigned.length}</p>
              <p className="text-xs text-muted-foreground">Not Assigned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search + Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Staff & RFID Cards</CardTitle>
          <div className="relative w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, ID, department..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>RFID Card</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.employeeId}</div>
                  </TableCell>
                  <TableCell>{s.department}</TableCell>
                  <TableCell>
                    {s.rfidTag ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200 font-mono text-xs">
                        {s.rfidTag}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground text-xs">
                        Not assigned
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {s.rfidTag ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => setRemovingStaff(s)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Remove
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAssigningStaff(s)
                          setRfidInput("")
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Assign Card
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    No staff found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={!!assigningStaff} onOpenChange={(open) => !open && setAssigningStaff(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign RFID Card</DialogTitle>
            <DialogDescription>
              Tap the RFID card on the reader, then enter the UID shown in the Serial Monitor below.
              Format: <code className="bg-muted px-1 rounded text-xs">AB:CD:EF:12</code>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-medium mb-1">Staff Member</p>
              <p className="text-lg font-bold">{assigningStaff?.name}</p>
              <p className="text-xs text-muted-foreground">{assigningStaff?.employeeId} — {assigningStaff?.department}</p>
            </div>
            <div className="space-y-2">
              <Label>RFID Card UID</Label>
              <Input
                placeholder="e.g. AB:CD:EF:12"
                value={rfidInput}
                onChange={(e) => setRfidInput(e.target.value)}
                className="font-mono text-lg tracking-wider"
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Tap the card on the ESP32 reader and copy the UID from Serial Monitor.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningStaff(null)}>Cancel</Button>
            <Button onClick={handleAssign} disabled={isSubmitting || !rfidInput.trim()}>
              {isSubmitting ? "Saving..." : "Assign Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!removingStaff} onOpenChange={(open) => !open && setRemovingStaff(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove RFID Card</AlertDialogTitle>
            <AlertDialogDescription>
              Remove the RFID card from <strong>{removingStaff?.name}</strong>?
              They will no longer be able to check in with this card.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-red-600 hover:bg-red-700">
              Remove Card
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
