"use client"

import { useState, useTransition, useRef } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Loader2, Gift } from "lucide-react"
import { addStock } from "@/lib/actions"
import { toast } from "sonner"

interface AddStockDialogProps {
  medicines: any[]
  suppliers: any[]
}

export function AddStockDialog({ medicines, suppliers }: AddStockDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>("")
  const [isPending, startTransition] = useTransition()
  const submittedRef = useRef(false)

  const selectedMedicine = medicines.find(m => m.id === selectedMedicineId)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submittedRef.current || isPending) return
    const formData = new FormData(e.currentTarget)

    if (!formData.get("supplierId")) {
      toast.error("Please select a supplier")
      return
    }
    if (!selectedMedicineId) {
      toast.error("Please select a medicine")
      return
    }

    startTransition(async () => {
      submittedRef.current = true
      const result = await addStock(formData)

      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        setSelectedMedicineId("")
        ;(e.target as HTMLFormElement).reset()
        submittedRef.current = false // reset for next open
      } else {
        toast.error(result.message)
        submittedRef.current = false
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val)
      if (!val) setSelectedMedicineId("")
    }}>
      <DialogTrigger asChild>
        <Button variant="default">
          <Plus className="h-4 w-4 mr-2" />
          Add Stock
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Stock / Purchase Entry</DialogTitle>
          <DialogDescription>
            Record incoming stock, linking it to a purchase invoice for GST compliance.
          </DialogDescription>
        </DialogHeader>

        <form key={open ? 'open' : 'closed'} onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            
            {/* Invoice Number */}
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Invoice Number <span className="text-red-500">*</span></Label>
              <Input id="invoiceNumber" name="invoiceNumber" placeholder="e.g. INV-10293" required />
            </div>

            {/* Invoice Date */}
            <div className="space-y-2">
              <Label htmlFor="invoiceDate">Invoice Date <span className="text-red-500">*</span></Label>
              <Input id="invoiceDate" name="invoiceDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplierId">Supplier <span className="text-red-500">*</span></Label>
              <Select name="supplierId">
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Medicine */}
            <div className="space-y-2">
              <Label htmlFor="medicineId">Medicine <span className="text-red-500">*</span></Label>
              <Select name="medicineId" value={selectedMedicineId} onValueChange={setSelectedMedicineId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select medicine" />
                </SelectTrigger>
                <SelectContent>
                  {medicines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.strength || 'N/A'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Medicine Type (Auto-filled) */}
            <div className="space-y-2">
              <Label>Medicine Type</Label>
              <Input 
                value={selectedMedicine?.type || ""} 
                readOnly 
                className="bg-muted text-muted-foreground" 
                placeholder="Auto-filled on selection" 
              />
            </div>

            {/* Batch Number */}
            <div className="space-y-2">
              <Label htmlFor="batchNumber">Batch Number <span className="text-red-500">*</span></Label>
              <Input id="batchNumber" name="batchNumber" placeholder="e.g. B-2024-X1" required />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity (Strips/Boxes) <span className="text-red-500">*</span></Label>
              <Input id="quantity" name="quantity" type="number" min="1" required placeholder="e.g. 10" />
            </div>

            {/* Free Quantity (Bonus) */}
            <div className="space-y-2">
              <Label htmlFor="freeQuantity" className="flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-emerald-600" />
                Free / Bonus Qty
              </Label>
              <Input id="freeQuantity" name="freeQuantity" type="number" min="0" defaultValue="0" placeholder="e.g. 2" />
              <p className="text-[10px] text-muted-foreground">Supplier scheme: e.g. Buy 10 Get 2 Free</p>
            </div>

            {/* Pack Size */}
            <div className="space-y-2">
              <Label htmlFor="medicinesPerStrip">Pack Size <span className="text-red-500">*</span></Label>
              <Input id="medicinesPerStrip" name="medicinesPerStrip" type="number" min="1" defaultValue="1" required />
            </div>

            {/* Purchase Price */}
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price (Per Strip/Box) <span className="text-red-500">*</span></Label>
              <Input id="purchasePrice" name="purchasePrice" type="number" step="0.01" min="0.01" required placeholder="0.00" />
            </div>

            {/* Selling Price / MRP */}
            <div className="space-y-2">
              <Label htmlFor="sellingPrice">Selling Price (Per Strip/Box) <span className="text-red-500">*</span></Label>
              <Input id="sellingPrice" name="sellingPrice" type="number" step="0.01" min="0.01" required placeholder="0.00" />
            </div>

            {/* Tax Percent */}
            <div className="space-y-2">
              <Label htmlFor="taxPercent">GST / Tax % <span className="text-red-500">*</span></Label>
              <Select name="taxPercent" defaultValue="0">
                <SelectTrigger>
                  <SelectValue placeholder="Select GST" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                  <SelectItem value="28">28%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Expiry Date */}
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date <span className="text-red-500">*</span></Label>
              <Input id="expiryDate" name="expiryDate" type="date" required />
            </div>
            
            {/* Manufacture Date */}
            <div className="space-y-2">
              <Label htmlFor="manufactureDate">Manufacture Date</Label>
              <Input id="manufactureDate" name="manufactureDate" type="date" />
            </div>

            {/* GRN Number */}
            <div className="space-y-2">
              <Label htmlFor="grnNumber">GRN Number</Label>
              <Input id="grnNumber" name="grnNumber" placeholder="Optional" />
            </div>
          </div>

          {/* Free Qty Info */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Gift className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-xs text-emerald-800">
                <strong>Free / Bonus goods</strong> from supplier schemes (e.g., Buy 10 Get 2 Free) will be added to stock along with purchased quantity.
                The effective purchase cost per unit is automatically reduced for accurate margin tracking.
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
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
                "Add Stock"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
