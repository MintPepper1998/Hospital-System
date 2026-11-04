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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Edit, Loader2 } from "lucide-react"
import { updateMedicine } from "@/lib/actions"
import { toast } from "sonner"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

interface EditMedicineDialogProps {
  medicine: any
  medicineTypes?: string[]
}

export function EditMedicineDialog({ medicine, medicineTypes = [] }: EditMedicineDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Build the type list from props or fallback to defaults
  const defaultTypes = ['TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 'DROPS', 'CREAM', 'INHALER', 'POWDER', 'SUSPENSION']
  const typesToDisplay = medicineTypes.length > 0 ? medicineTypes : defaultTypes

  // If the medicine's current type isn't in the list, add it so it shows in the dropdown
  const allTypes = typesToDisplay.includes(medicine.type) ? typesToDisplay : [...typesToDisplay, medicine.type]

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateMedicine(medicine.id, formData)

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Medicine</DialogTitle>
          <DialogDescription>
            Update details for {medicine.name}. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Medicine Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Medicine Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={medicine.name}
                required
              />
            </div>

            {/* Generic Name */}
            <div className="space-y-2">
              <Label htmlFor="genericName">
                Generic Name
              </Label>
              <Input
                id="genericName"
                name="genericName"
                defaultValue={medicine.genericName}
              />
            </div>

            {/* Manufacturer */}
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                name="manufacturer"
                defaultValue={medicine.manufacturer || ""}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue={medicine.type || "TABLET"}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {allTypes.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Strength */}
            <div className="space-y-2">
              <Label htmlFor="strength">Strength</Label>
              <Input
                id="strength"
                name="strength"
                defaultValue={medicine.strength || ""}
              />
            </div>



            {/* Minimum Stock Level */}
            <div className="space-y-2">
              <Label htmlFor="minStockLevel">Minimum Stock Level</Label>
              <Input
                id="minStockLevel"
                name="minStockLevel"
                type="number"
                defaultValue={medicine.minStockLevel || 100}
              />
            </div>

            {/* HSN Code */}
            <div className="space-y-2">
              <Label htmlFor="hsnCode">HSN Code</Label>
              <Input
                id="hsnCode"
                name="hsnCode"
                defaultValue={medicine.hsnCode || ""}
              />
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label htmlFor="schedule">Drug Schedule</Label>
              <Select name="schedule" defaultValue={medicine.schedule || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Select schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="H">Schedule H (Prescription)</SelectItem>
                  <SelectItem value="H1">Schedule H1 (Restricted)</SelectItem>
                  <SelectItem value="X">Schedule X (Narcotics)</SelectItem>
                  <SelectItem value="OTC">OTC (Over the Counter)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Storage Location */}
            <div className="space-y-2">
              <Label htmlFor="storageLocation">Storage Location</Label>
              <Input
                id="storageLocation"
                name="storageLocation"
                defaultValue={medicine.storageLocation || ""}
              />
            </div>
          </div>

          {/* Composition */}
          <div className="space-y-2">
            <Label htmlFor="composition">Composition</Label>
            <Textarea
              id="composition"
              name="composition"
              defaultValue={medicine.composition || ""}
              rows={2}
            />
          </div>

          {/* Usage Instructions */}
          <div className="space-y-2">
            <Label htmlFor="usage">Usage Instructions</Label>
            <Textarea
              id="usage"
              name="usage"
              defaultValue={medicine.usage || ""}
              rows={2}
            />
          </div>

          {/* No Loose Sale */}
          <div className="flex items-center space-x-3 rounded-lg border border-orange-200 bg-orange-50/50 p-3">
            <input
              type="checkbox"
              id="noLooseSale"
              name="noLooseSale"
              value="true"
              defaultChecked={medicine.noLooseSale === true}
              className="h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
            />
            <div>
              <Label htmlFor="noLooseSale" className="text-sm font-medium cursor-pointer">
                No Loose Sale
              </Label>
              <p className="text-xs text-muted-foreground">
                This medicine should only be sold in full strips, not as individual units
              </p>
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
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
