"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit, Loader2 } from "lucide-react"
import { updateInventoryBatch } from "@/lib/actions"
import { toast } from "sonner"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { format } from "date-fns"

interface EditInventoryBatchDialogProps {
  batch: any
}

export function EditInventoryBatchDialog({ batch }: EditInventoryBatchDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Format date for the input type="date"
  const formattedDate = batch.expiryDate 
    ? new Date(batch.expiryDate).toISOString().split('T')[0]
    : ""

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateInventoryBatch(batch.id, formData)

      if (result.success) {
        toast.success(result.message)
        setOpen(false)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Stock Batch</DialogTitle>
          <DialogDescription>
            Update batch details. Note: Changes may affect accounting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="batchNumber">Batch Number</Label>
            <Input
              id="batchNumber"
              name="batchNumber"
              defaultValue={batch.batchNumber || ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity (Strips) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                defaultValue={batch.medicinesPerStrip ? Math.floor(batch.quantity / batch.medicinesPerStrip) : batch.quantity}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicinesPerStrip">
                Pack Size <span className="text-red-500">*</span>
              </Label>
              <Input
                id="medicinesPerStrip"
                name="medicinesPerStrip"
                type="number"
                defaultValue={batch.medicinesPerStrip || 1}
                required
              />
            </div>
          </div>

          {/* Loose units — only relevant when pack size > 1 */}
          {(batch.medicinesPerStrip || 1) > 1 && (batch.quantity % (batch.medicinesPerStrip || 1)) > 0 && (
            <div className="space-y-2">
              <Label htmlFor="looseQuantity">
                Loose Units <span className="text-xs text-muted-foreground">(units not forming a full strip)</span>
              </Label>
              <Input
                id="looseQuantity"
                name="looseQuantity"
                type="number"
                defaultValue={batch.quantity % (batch.medicinesPerStrip || 1)}
                min={0}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="expiryDate">
              Expiry Date <span className="text-red-500">*</span>
            </Label>
            <Input
              id="expiryDate"
              name="expiryDate"
              type="date"
              defaultValue={formattedDate}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">
                Purchase Price (Per Strip) (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                step="0.01"
                defaultValue={(batch.purchasePrice * (batch.medicinesPerStrip || 1)).toFixed(2)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPrice">
                Selling Price (Per Strip) (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sellingPrice"
                name="sellingPrice"
                type="number"
                step="0.01"
                defaultValue={(batch.sellingPrice * (batch.medicinesPerStrip || 1)).toFixed(2)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
