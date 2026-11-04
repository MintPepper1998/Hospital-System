"use client"

import { useState, useTransition } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2 } from "lucide-react"
import { createMedicine, addCustomMedicineType } from "@/lib/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface AddMedicineDialogProps {
  medicineTypes?: string[]
}

export function AddMedicineDialog({ medicineTypes = [] }: AddMedicineDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  const [selectedType, setSelectedType] = useState("TABLET")
  const [isAddingCustomType, setIsAddingCustomType] = useState(false)
  const [customType, setCustomType] = useState("")
  const [isSavingType, setIsSavingType] = useState(false)

  // Default fallback if props aren't loaded
  const typesToDisplay = medicineTypes.length > 0 ? medicineTypes : [
    'TABLET', 'CAPSULE', 'SYRUP', 'INJECTION', 'OINTMENT', 
    'DROPS', 'CREAM', 'INHALER', 'POWDER', 'SUSPENSION'
  ]

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createMedicine(formData)

      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        setSelectedType("TABLET")
        setIsAddingCustomType(false)
        ;(e.target as HTMLFormElement).reset()
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  async function handleSaveCustomType() {
    if (!customType.trim()) return
    setIsSavingType(true)
    
    try {
      const result = await addCustomMedicineType(customType)
      if (result.success && result.data) {
        toast.success("Custom type added!")
        const newType = result.data.name
        setSelectedType(newType)
        setIsAddingCustomType(false)
        setCustomType("")
        router.refresh() // To re-fetch types from server
      } else if (result.success) {
        // Fallback if data is missing but success is true
        toast.success("Custom type added!")
        setSelectedType(customType.toUpperCase())
        setIsAddingCustomType(false)
        setCustomType("")
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (e) {
      toast.error("Failed to add custom type")
    } finally {
      setIsSavingType(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Medicine
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Medicine</DialogTitle>
          <DialogDescription>
            Add a new medicine to the catalog. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <form key={open ? 'open' : 'closed'} onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Medicine Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Medicine Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Dolo 650"
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
                placeholder="e.g., Paracetamol"
              />
            </div>

            {/* Manufacturer */}
            <div className="space-y-2">
              <Label htmlFor="manufacturer">Manufacturer</Label>
              <Input
                id="manufacturer"
                name="manufacturer"
                placeholder="e.g., Micro Labs"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <input type="hidden" name="type" value={selectedType} />
              <Select 
                value={selectedType} 
                onValueChange={(val) => {
                  if (val === "ADD_CUSTOM") {
                    setIsAddingCustomType(true)
                  } else {
                    setIsAddingCustomType(false)
                    setSelectedType(val)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {typesToDisplay.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                  <SelectItem value="ADD_CUSTOM" className="text-blue-600 font-medium border-t mt-1 pt-1">
                    + Add Custom Type...
                  </SelectItem>
                </SelectContent>
              </Select>

              {isAddingCustomType && (
                <div className="flex gap-2 mt-2 items-center">
                  <Input 
                    placeholder="Enter new type (e.g. GEL)" 
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value.toUpperCase())}
                  />
                  <Button 
                    type="button" 
                    onClick={handleSaveCustomType} 
                    disabled={isSavingType || !customType.trim()} 
                    size="sm"
                  >
                    {isSavingType ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              )}
            </div>

            {/* Strength */}
            <div className="space-y-2">
              <Label htmlFor="strength">Strength</Label>
              <Input
                id="strength"
                name="strength"
                placeholder="e.g., 650mg, 100ml"
              />
            </div>



            {/* Minimum Stock Level */}
            <div className="space-y-2">
              <Label htmlFor="minStockLevel">Minimum Stock Level</Label>
              <Input
                id="minStockLevel"
                name="minStockLevel"
                type="number"
                defaultValue="100"
                placeholder="e.g., 100"
              />
            </div>

            {/* HSN Code */}
            <div className="space-y-2">
              <Label htmlFor="hsnCode">HSN Code</Label>
              <Input
                id="hsnCode"
                name="hsnCode"
                placeholder="e.g., 30049099"
              />
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <Label htmlFor="schedule">Drug Schedule</Label>
              <Select name="schedule">
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
          </div>

          {/* Composition */}
          <div className="space-y-2">
            <Label htmlFor="composition">Composition</Label>
            <Textarea
              id="composition"
              name="composition"
              placeholder="Chemical composition of the medicine"
              rows={2}
            />
          </div>

          {/* Usage Instructions */}
          <div className="space-y-2">
            <Label htmlFor="usage">Usage Instructions</Label>
            <Textarea
              id="usage"
              name="usage"
              placeholder="Dosage and usage instructions"
              rows={2}
            />
          </div>

          {/* Storage Location */}
          <div className="space-y-2">
            <Label htmlFor="storageLocation">Storage Location</Label>
            <Input
              id="storageLocation"
              name="storageLocation"
              placeholder="e.g., Rack A, Shelf 3, Drawer 5"
            />
          </div>

          {/* No Loose Sale */}
          <div className="flex items-center space-x-3 rounded-lg border border-orange-200 bg-orange-50/50 p-3">
            <input
              type="checkbox"
              id="noLooseSale"
              name="noLooseSale"
              value="true"
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Medicine
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
