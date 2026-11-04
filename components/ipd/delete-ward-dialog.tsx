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
import { deleteWard } from "@/lib/ipd-actions"
import { toast } from "sonner"

interface DeleteWardDialogProps {
  ward: {
    id: string
    name: string
    type: string
    bedCount: number
    occupiedCount: number
  }
}

export function DeleteWardDialog({ ward }: DeleteWardDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const hasOccupied = ward.occupiedCount > 0

  async function handleDelete() {
    setLoading(true)
    const result = await deleteWard(ward.id)
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
          title="Delete ward"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Delete Ward?
          </DialogTitle>
          <DialogDescription>
            The ward will be hidden from the system. Historical admission records will be preserved.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 space-y-3">
          <div className="bg-gray-50 border rounded-lg px-4 py-3 text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-gray-500">Ward Name</span>
              <span className="font-semibold">{ward.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium">{ward.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Beds</span>
              <span className="font-medium">{ward.bedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Occupied Beds</span>
              <span className={`font-medium ${hasOccupied ? "text-red-600" : "text-green-600"}`}>
                {ward.occupiedCount}
              </span>
            </div>
          </div>

          {hasOccupied && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>{ward.occupiedCount} bed(s)</strong> are currently occupied.
                Discharge all patients before deleting this ward.
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading || hasOccupied}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Removing...</>
            ) : (
              <><Trash2 className="mr-2 h-4 w-4" /> Remove Ward</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
