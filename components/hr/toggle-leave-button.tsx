"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MoreHorizontal, UserCheck, UserX, Loader2 } from "lucide-react"
import { toggleEmployeeLeave } from "@/lib/actions/hr"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface ToggleLeaveButtonProps {
  staffId: string
  employeeName: string
  isOnLeave: boolean
}

export function ToggleLeaveButton({
  staffId,
  employeeName,
  isOnLeave,
}: ToggleLeaveButtonProps) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleMarkOnLeave = () => {
    setOpen(true)
  }

  const handleMarkActive = () => {
    startTransition(async () => {
      const result = await toggleEmployeeLeave(staffId, false)

      if (result.success) {
        toast.success(`${employeeName} is now active`)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleSubmitLeave = () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for leave")
      return
    }

    startTransition(async () => {
      const result = await toggleEmployeeLeave(staffId, true, reason)

      if (result.success) {
        toast.success(`${employeeName} marked as on leave`)
        setOpen(false)
        setReason("")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isOnLeave ? (
            <DropdownMenuItem onClick={handleMarkActive}>
              <UserCheck className="mr-2 h-4 w-4 text-green-600" />
              Mark as Active
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={handleMarkOnLeave}>
              <UserX className="mr-2 h-4 w-4 text-orange-600" />
              Mark as On Leave
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {employeeName} as On Leave</DialogTitle>
            <DialogDescription>
              Provide a reason for the leave
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Leave Reason</Label>
            <Input
              id="reason"
              placeholder="e.g., Sick leave, Vacation, Personal"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitLeave}
              disabled={isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Mark On Leave"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
