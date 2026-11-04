"use client"

import { useState, useTransition } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Loader2, X } from "lucide-react"
import { assignShift, removeShiftAssignment } from "@/lib/actions/hr"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

interface Shift {
  id: string
  name: string
  code: string
  startTime: string
  endTime: string
  color: string | null
  icon: string | null
}

interface ShiftCellProps {
  staffId: string
  date: Date | string // Can be Date or serialized string from server
  currentShift?: Shift
  shifts: Shift[]
  isOnLeave: boolean
}

export function ShiftCell({
  staffId,
  date,
  currentShift,
  shifts,
  isOnLeave,
}: ShiftCellProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Ensure we have a proper Date object
  const dateObj = typeof date === "string" ? new Date(date) : date
  // Format as YYYY-MM-DD string to avoid timezone issues
  const dateString = format(dateObj, "yyyy-MM-dd")

  const handleAssignShift = (shiftId: string) => {
    startTransition(async () => {
      // Pass date as string to avoid timezone serialization issues
      const result = await assignShift({
        staffId,
        shiftId,
        dateString, // Pass as string instead of Date
      })

      if (result.success) {
        toast.success("Shift assigned")
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleRemoveShift = () => {
    startTransition(async () => {
      // Pass date as string to avoid timezone serialization issues
      const result = await removeShiftAssignment(staffId, dateString)

      if (result.success) {
        toast.success("Shift removed")
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  if (isOnLeave) {
    return (
      <div
        className="h-10 rounded flex items-center justify-center text-xs bg-orange-100 text-orange-700 cursor-not-allowed"
        title="On Leave"
      >
        🏖️
      </div>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`
            w-full h-10 rounded text-xs font-medium transition-all
            flex items-center justify-center gap-1
            ${
              currentShift
                ? "hover:opacity-80"
                : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-muted-foreground"
            }
          `}
          style={
            currentShift?.color
              ? {
                  backgroundColor: `${currentShift.color}30`,
                  color: currentShift.color,
                  border: `1px solid ${currentShift.color}50`,
                }
              : undefined
          }
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : currentShift ? (
            <>
              <span>{currentShift.icon}</span>
              <span>{currentShift.code}</span>
            </>
          ) : (
            <span>+</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="center">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground mb-2 font-medium">
            Assign Shift
          </div>
          {shifts.map((shift) => (
            <button
              key={shift.id}
              onClick={() => handleAssignShift(shift.id)}
              disabled={isPending}
              className={`
                w-full p-2 rounded text-left text-sm flex items-center gap-2
                hover:bg-muted transition-colors
                ${currentShift?.id === shift.id ? "bg-muted" : ""}
              `}
            >
              <span
                className="h-6 w-6 rounded flex items-center justify-center text-xs"
                style={{ backgroundColor: shift.color || "#e5e7eb" }}
              >
                {shift.icon}
              </span>
              <div>
                <div className="font-medium">{shift.name}</div>
                <div className="text-xs text-muted-foreground">
                  {shift.startTime} - {shift.endTime}
                </div>
              </div>
            </button>
          ))}
          {currentShift && (
            <>
              <div className="border-t my-2" />
              <button
                onClick={handleRemoveShift}
                disabled={isPending}
                className="w-full p-2 rounded text-left text-sm flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors"
              >
                <X className="h-4 w-4" />
                Remove Shift
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
