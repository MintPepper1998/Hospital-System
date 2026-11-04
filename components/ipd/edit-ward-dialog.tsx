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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Pencil, Loader2 } from "lucide-react"
import { updateWard } from "@/lib/ipd-actions"
import { toast } from "sonner"

interface EditWardDialogProps {
  ward: {
    id: string
    name: string
    type: string
    floor: string | null
    description: string | null
  }
}

export function EditWardDialog({ ward }: EditWardDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState(ward.type)

  async function handleSubmit(formData: FormData) {
    setLoading(true)

    const result = await updateWard(ward.id, {
      name: formData.get("name") as string,
      type: selectedType,
      floor: (formData.get("floor") as string) || undefined,
      description: (formData.get("description") as string) || undefined,
    })

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
        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Edit ward">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Ward — {ward.name}</DialogTitle>
            <DialogDescription>Update ward information</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Ward Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Ward Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={ward.name}
                placeholder="e.g., General Male Ward, ICU"
                required
              />
            </div>

            {/* Ward Type */}
            <div className="space-y-2">
              <Label>
                Ward Type <span className="text-red-500">*</span>
              </Label>
              <Select value={selectedType} onValueChange={setSelectedType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select ward type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Private">Private</SelectItem>
                  <SelectItem value="ICU">ICU (Intensive Care Unit)</SelectItem>
                  <SelectItem value="HDU">HDU (High Dependency Unit)</SelectItem>
                  <SelectItem value="Pediatric">Pediatric</SelectItem>
                  <SelectItem value="Maternity">Maternity</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Floor */}
            <div className="space-y-2">
              <Label htmlFor="floor">Floor Location</Label>
              <Input
                id="floor"
                name="floor"
                defaultValue={ward.floor || ""}
                placeholder="e.g., Ground Floor, 2nd Floor"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={ward.description || ""}
                placeholder="Additional details about the ward..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
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
