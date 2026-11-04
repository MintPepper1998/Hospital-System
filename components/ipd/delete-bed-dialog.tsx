"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"
import { deleteBed } from "@/lib/ipd-actions"
import { toast } from "sonner"

interface DeleteBedDialogProps {
  bed: {
    id: string
    bedNumber: string
    pricePerDay: number
    status: string
  }
  wardName: string
}

export function DeleteBedDialog({ bed, wardName }: DeleteBedDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const isOccupied = bed.status === "OCCUPIED"

  async function handleDelete() {
    setLoading(true)
    const result = await deleteBed(bed.id)
    if (result.success) {
      toast.success(result.message)
      setOpen(false)
    } else {
      toast.error(result.message)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
          title="Delete bed"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Delete Bed?
          </DialogTitle>
          <DialogDescription>
            This will permanently remove the bed from the ward.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3">
          <div className="bg-gray-50 border rounded-lg px-4 py-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Bed Number</span>
              <span className="font-semibold">{bed.bedNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ward</span>
              <span className="font-medium">{wardName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Daily Rate</span>
              <span className="font-medium">₹{bed.pricePerDay.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`font-medium ${isOccupied ? "text-red-600" : "text-green-600"}`}>
                {bed.status}
              </span>
            </div>
          </div>

          {isOccupied && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>This bed is currently <strong>occupied</strong>. Please discharge the patient before deleting.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading || isOccupied}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
            ) : (
              <><Trash2 className="mr-2 h-4 w-4" /> Delete Bed</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
