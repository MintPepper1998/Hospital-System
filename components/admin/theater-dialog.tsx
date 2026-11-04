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
import { Switch } from "@/components/ui/switch"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { upsertOperationTheater } from "@/lib/actions"

interface TheaterDialogProps {
  theater?: any
  children?: React.ReactNode
  trigger?: React.ReactNode
}

export function TheaterDialog({ theater, children, trigger }: TheaterDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isOperational, setIsOperational] = useState(theater?.isOperational ?? true)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    // Add theater ID if editing
    if (theater?.id) {
      formData.set("id", theater.id)
    }

    // Add operational status
    formData.set("isOperational", isOperational.toString())

    startTransition(async () => {
      try {
        const result = await upsertOperationTheater(formData)
        
        if (result.success) {
          toast.success(result.message || "Theater saved successfully")
          setOpen(false)
          // Reset form if creating new
          if (!theater?.id) {
            e.currentTarget.reset()
            setIsOperational(true)
          }
        } else {
          toast.error(result.message || "Failed to save theater")
        }
      } catch (error: any) {
        toast.error(error.message || "An error occurred")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || trigger || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New Theater
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {theater ? "Edit Operation Theater" : "Add New Operation Theater"}
          </DialogTitle>
          <DialogDescription>
            {theater 
              ? "Update the theater details below." 
              : "Create a new operation theater for surgical procedures."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Theater Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Theater Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Main OT 1, Cardiac OT"
              defaultValue={theater?.name || ""}
              required
            />
          </div>

          {/* Theater Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Theater Type *</Label>
            <Select name="type" defaultValue={theater?.type || "MAJOR"} required>
              <SelectTrigger>
                <SelectValue placeholder="Select theater type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MAJOR">Major (Complex Surgeries)</SelectItem>
                <SelectItem value="MINOR">Minor (Simple Procedures)</SelectItem>
                <SelectItem value="EMERGENCY">Emergency (24/7 Ready)</SelectItem>
                <SelectItem value="CATH_LAB">Cath Lab (Cardiac)</SelectItem>
                <SelectItem value="ENDOSCOPY">Endoscopy Suite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Floor */}
          <div className="space-y-2">
            <Label htmlFor="floor">Floor / Location</Label>
            <Input
              id="floor"
              name="floor"
              placeholder="e.g., 3rd Floor, Ground Floor"
              defaultValue={theater?.floor || ""}
            />
          </div>

          {/* Equipment */}
          <div className="space-y-2">
            <Label htmlFor="equipment">Equipment & Facilities</Label>
            <Textarea
              id="equipment"
              name="equipment"
              placeholder="e.g., Anesthesia machine, C-Arm, Ventilator, ECG Monitor..."
              rows={3}
              defaultValue={theater?.equipment || ""}
            />
          </div>

          {/* Features */}
          <div className="space-y-2">
            <Label htmlFor="features">Special Features</Label>
            <Textarea
              id="features"
              name="features"
              placeholder="e.g., HEPA filtration, Laminar air flow, LED lighting..."
              rows={2}
              defaultValue={theater?.features || ""}
            />
          </div>

          {/* Operational Status */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="isOperational" className="text-base">
                Operational Status
              </Label>
              <div className="text-sm text-muted-foreground">
                {isOperational 
                  ? "Theater is active and available for surgeries" 
                  : "Theater is under maintenance or unavailable"}
              </div>
            </div>
            <Switch
              id="isOperational"
              checked={isOperational}
              onCheckedChange={setIsOperational}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : theater ? "Update Theater" : "Create Theater"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
