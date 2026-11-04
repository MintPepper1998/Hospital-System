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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2, Edit2 } from "lucide-react"
import { updateBed } from "@/lib/ipd-actions"
import { toast } from "sonner"

interface EditBedDialogProps {
  bed: {
    id: string
    bedNumber: string
    pricePerDay: number
    features: string | null
    status: string
  }
  wardName: string
}

export function EditBedDialog({ bed, wardName }: EditBedDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)

    // Add bedId to formData
    formData.append("bedId", bed.id)

    const result = await updateBed(formData)

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
        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
          <Edit2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Bed - {bed.bedNumber}</DialogTitle>
            <DialogDescription>
              Update bed information for {wardName}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Bed Number */}
            <div className="space-y-2">
              <Label htmlFor="bedNumber">
                Bed Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="bedNumber"
                name="bedNumber"
                defaultValue={bed.bedNumber}
                required
              />
              <p className="text-xs text-muted-foreground">
                Must be unique within this ward
              </p>
            </div>

            {/* Price Per Day */}
            <div className="space-y-2">
              <Label htmlFor="pricePerDay">
                Daily Charges (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pricePerDay"
                name="pricePerDay"
                type="number"
                step="0.01"
                min="0"
                defaultValue={bed.pricePerDay}
                required
              />
            </div>

            {/* Features */}
            <div className="space-y-2">
              <Label htmlFor="features">Features (Optional)</Label>
              <Input
                id="features"
                name="features"
                defaultValue={bed.features || ""}
                placeholder="e.g., Oxygen, Monitor, AC"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
