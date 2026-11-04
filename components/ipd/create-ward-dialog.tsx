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
import { Plus, Loader2 } from "lucide-react"
import { createWard } from "@/lib/actions"
import { toast } from "sonner"

export function CreateWardDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState("")

  async function handleSubmit(formData: FormData) {
    setLoading(true)

    const result = await createWard(formData)

    if (result.success) {
      toast.success(result.message)
      setOpen(false)
      // Reset form by closing and reopening
    } else {
      toast.error(result.message)
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Ward
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form action={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Ward</DialogTitle>
            <DialogDescription>
              Add a new ward to the IPD department
            </DialogDescription>
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
                placeholder="e.g., General Male Ward, ICU"
                required
              />
            </div>

            {/* Ward Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                Ward Type <span className="text-red-500">*</span>
              </Label>
              <Select name="type" required onValueChange={setSelectedType}>
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
                placeholder="e.g., Ground Floor, 2nd Floor"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Additional details about the ward..."
                rows={3}
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
                  Creating...
                </>
              ) : (
                "Create Ward"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
