"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { enterLabResult } from "@/lib/actions"

interface ResultEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  request: {
    id: string
    testName: string
    patient: {
      user: {
        name: string
      }
      patientId: string
    }
  }
}

export function ResultEntryDialog({ open, onOpenChange, request }: ResultEntryDialogProps) {
  const [isPending, startTransition] = useTransition()
  const [resultValue, setResultValue] = useState("")
  const [unit, setUnit] = useState("")
  const [normalRange, setNormalRange] = useState("")
  const [remarks, setRemarks] = useState("")

  const handleSubmit = () => {
    if (!resultValue.trim()) {
      toast.error("Please enter a result value")
      return
    }

    startTransition(async () => {
      const result = await enterLabResult(request.id, {
        testName: request.testName,
        resultValue,
        unit: unit || null,
        normalRange: normalRange || null,
        remarks: remarks || null,
      })

      if (result.success) {
        toast.success("Result entered successfully!")
        toast.info("Test marked as COMPLETED")
        onOpenChange(false)
        // Reset form
        setResultValue("")
        setUnit("")
        setNormalRange("")
        setRemarks("")
      } else {
        toast.error(result.message || "Failed to enter result")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Enter Lab Result</DialogTitle>
          <DialogDescription>
            Enter the test results for {request.patient.user.name} ({request.patient.patientId})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Test Name (Read-only) */}
          <div className="space-y-2">
            <Label>Test Name</Label>
            <Input
              value={request.testName}
              disabled
              className="bg-muted"
            />
          </div>

          {/* Result Value */}
          <div className="space-y-2">
            <Label htmlFor="resultValue">
              Result Value <span className="text-red-500">*</span>
            </Label>
            <Input
              id="resultValue"
              value={resultValue}
              onChange={(e) => setResultValue(e.target.value)}
              placeholder="e.g., 12.5, Positive, Negative"
              autoFocus
            />
          </div>

          {/* Unit */}
          <div className="space-y-2">
            <Label htmlFor="unit">Unit (Optional)</Label>
            <Input
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g., mg/dL, cells/μL, %"
            />
          </div>

          {/* Normal Range */}
          <div className="space-y-2">
            <Label htmlFor="normalRange">Normal Range (Optional)</Label>
            <Input
              id="normalRange"
              value={normalRange}
              onChange={(e) => setNormalRange(e.target.value)}
              placeholder="e.g., 70-140 mg/dL, Negative"
            />
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks / Notes (Optional)</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional observations or notes"
              rows={3}
            />
          </div>

          {/* Disclaimer */}
          <div className="bg-muted p-3 rounded-md text-xs text-muted-foreground">
            <p className="font-medium mb-1">Note:</p>
            <p>
              This report will be electronically generated. Ensure all values are accurate before saving.
              The report will be marked as "Not for Medico-Legal Purpose" unless certified by a pathologist.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !resultValue.trim()}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Result
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
