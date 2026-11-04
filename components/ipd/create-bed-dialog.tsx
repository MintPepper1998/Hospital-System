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
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2 } from "lucide-react"
import { createBed } from "@/lib/ipd-actions"
import { toast } from "sonner"

interface CreateBedDialogProps {
  wardId: string
  wardName: string
}

export function CreateBedDialog({ wardId, wardName }: CreateBedDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)

    // Add wardId to formData
    formData.append("wardId", wardId)

    const result = await createBed(formData)

    if (result.success) {
      toast.success(result.message)
      setOpen(false)
      // Reset form by closing
    } else {
      toast.error(result.message)
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Bed
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Bed to {wardName}</DialogTitle>
            <DialogDescription>
              Configure a new bed with pricing and features
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
                placeholder="e.g., G-101, ICU-5"
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
                placeholder="1000.00"
                required
              />
              <p className="text-xs text-muted-foreground">
                Price charged per day for this bed
              </p>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <Label htmlFor="features">Features (Optional)</Label>
              <Input
                id="features"
                name="features"
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
                  Adding...
                </>
              ) : (
                "Add Bed"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
