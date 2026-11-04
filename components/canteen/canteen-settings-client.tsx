"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Settings, Clock, Plus, Pencil, Loader2, UtensilsCrossed, ClipboardCheck, Trash2 } from "lucide-react"
import { createMealSlot, updateMealSlot, createDietPlan } from "@/lib/canteen-actions"

interface MealSlot {
  id: string; name: string; code: string; startTime: string; endTime: string
  sortOrder: number; isActive: boolean
}

interface DietPlan {
  id: string; name: string; code: string; description: string | null
  restrictions: string | null; calorieTarget: number | null; isActive: boolean
}

interface Props {
  mealSlots: MealSlot[]
  dietPlans: DietPlan[]
}

export function CanteenSettingsClient({ mealSlots, dietPlans }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [showAddDiet, setShowAddDiet] = useState(false)
  const [editSlot, setEditSlot] = useState<MealSlot | null>(null)

  function handleAddSlot(formData: FormData) {
    const name = formData.get("name") as string
    const code = formData.get("code") as string
    const startTime = formData.get("startTime") as string
    const endTime = formData.get("endTime") as string
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0

    if (!name || !code || !startTime || !endTime) {
      toast.error("All fields are required")
      return
    }

    startTransition(async () => {
      const result = await createMealSlot({ name, code, startTime, endTime, sortOrder })
      if (result.success) {
        toast.success("Meal slot added!")
        setShowAddSlot(false)
        window.location.reload()
      } else toast.error(result.error || "Failed to add slot")
    })
  }

  function handleEditSlot(formData: FormData) {
    if (!editSlot) return
    const name = formData.get("name") as string
    const code = formData.get("code") as string
    const startTime = formData.get("startTime") as string
    const endTime = formData.get("endTime") as string
    const sortOrder = parseInt(formData.get("sortOrder") as string) || 0

    startTransition(async () => {
      const result = await updateMealSlot(editSlot.id, { name, code, startTime, endTime, sortOrder })
      if (result.success) {
        toast.success("Meal slot updated!")
        setEditSlot(null)
        window.location.reload()
      } else toast.error(result.error || "Failed to update slot")
    })
  }

  function handleToggleSlot(slot: MealSlot) {
    startTransition(async () => {
      const result = await updateMealSlot(slot.id, { isActive: !slot.isActive })
      if (result.success) {
        toast.success(`Slot ${slot.isActive ? "disabled" : "enabled"}`)
        window.location.reload()
      } else toast.error(result.error || "Failed to update slot")
    })
  }

  function handleAddDiet(formData: FormData) {
    const name = formData.get("name") as string
    const code = formData.get("code") as string
    const description = formData.get("description") as string
    const restrictions = formData.get("restrictions") as string
    const calorieTarget = formData.get("calorieTarget") ? parseInt(formData.get("calorieTarget") as string) : undefined

    if (!name || !code) { toast.error("Name and code are required"); return }

    startTransition(async () => {
      const result = await createDietPlan({ name, code, description, restrictions, calorieTarget })
      if (result.success) {
        toast.success("Diet plan created!")
        setShowAddDiet(false)
        window.location.reload()
      } else toast.error(result.error || "Failed to create diet plan")
    })
  }

  function SlotForm({ slot, onSubmit }: { slot?: MealSlot | null; onSubmit: (fd: FormData) => void }) {
    return (
      <form action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Slot Name <span className="text-red-500">*</span></Label>
            <Input name="name" defaultValue={slot?.name || ""} placeholder="e.g., Breakfast" required />
          </div>
          <div className="space-y-2">
            <Label>Code <span className="text-red-500">*</span></Label>
            <Input name="code" defaultValue={slot?.code || ""} placeholder="e.g., BF" required maxLength={4} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Start Time <span className="text-red-500">*</span></Label>
            <Input name="startTime" type="time" defaultValue={slot?.startTime || ""} required />
          </div>
          <div className="space-y-2">
            <Label>End Time <span className="text-red-500">*</span></Label>
            <Input name="endTime" type="time" defaultValue={slot?.endTime || ""} required />
          </div>
          <div className="space-y-2">
            <Label>Sort Order</Label>
            <Input name="sortOrder" type="number" defaultValue={slot?.sortOrder || 0} />
          </div>
        </div>
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {slot ? "Update Slot" : "Add Slot"}
        </Button>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 text-white shadow-lg">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Canteen Settings</h1>
          <p className="text-sm text-gray-500">Configure meal slots, diet plans, and canteen operations</p>
        </div>
      </div>

      {/* Meal Slots */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5 text-indigo-600" /> Meal Slots
              </CardTitle>
              <CardDescription>
                Configure serving times for the canteen. These can be enabled/disabled without deletion.
              </CardDescription>
            </div>
            <Dialog open={showAddSlot} onOpenChange={setShowAddSlot}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" /> Add Slot
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Meal Slot</DialogTitle>
                  <DialogDescription>Create a new meal serving time</DialogDescription>
                </DialogHeader>
                <SlotForm onSubmit={handleAddSlot} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {mealSlots.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No meal slots configured yet</p>
          ) : (
            <div className="space-y-3">
              {mealSlots.map((slot) => (
                <div
                  key={slot.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    slot.isActive ? "bg-white" : "bg-gray-50 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Clock className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold">{slot.name}</p>
                      <p className="text-sm text-gray-500">
                        {slot.startTime} – {slot.endTime} • Code: {slot.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={slot.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}>
                      {slot.isActive ? "Active" : "Disabled"}
                    </Badge>
                    <Switch checked={slot.isActive} onCheckedChange={() => handleToggleSlot(slot)} />
                    <Button variant="ghost" size="sm" onClick={() => setEditSlot(slot)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diet Plans */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="h-5 w-5 text-emerald-600" /> Diet Plans
              </CardTitle>
              <CardDescription>
                Master list of diet types that doctors can assign to IPD patients
              </CardDescription>
            </div>
            <Dialog open={showAddDiet} onOpenChange={setShowAddDiet}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                  <Plus className="h-4 w-4 mr-2" /> Add Diet Plan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Diet Plan</DialogTitle>
                  <DialogDescription>Create a new diet type for patient assignment</DialogDescription>
                </DialogHeader>
                <form action={handleAddDiet} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Plan Name <span className="text-red-500">*</span></Label>
                      <Input name="name" placeholder="e.g., Diabetic Diet" required />
                    </div>
                    <div className="space-y-2">
                      <Label>Code <span className="text-red-500">*</span></Label>
                      <Input name="code" placeholder="e.g., DIA" required maxLength={5} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea name="description" rows={2} placeholder="Brief description of the diet..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Restrictions</Label>
                      <Textarea name="restrictions" rows={2} placeholder="e.g., No sugar, no fried food..." />
                    </div>
                    <div className="space-y-2">
                      <Label>Calorie Target (kcal/day)</Label>
                      <Input name="calorieTarget" type="number" placeholder="e.g., 1800" />
                    </div>
                  </div>
                  <Button type="submit" disabled={isPending} className="w-full">
                    {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Diet Plan
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {dietPlans.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No diet plans configured yet</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dietPlans.map((plan) => (
                <div key={plan.id} className="p-4 rounded-lg border bg-white hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{plan.name}</p>
                        <Badge variant="outline" className="text-[10px]">{plan.code}</Badge>
                        {!plan.isActive && (
                          <Badge className="bg-gray-100 text-gray-500 text-[10px]">Disabled</Badge>
                        )}
                      </div>
                      {plan.description && (
                        <p className="text-xs text-gray-500 mt-1">{plan.description}</p>
                      )}
                    </div>
                    {plan.calorieTarget && (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                        {plan.calorieTarget} kcal
                      </span>
                    )}
                  </div>
                  {plan.restrictions && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-600">
                      ⚠️ {plan.restrictions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Slot Dialog */}
      <Dialog open={!!editSlot} onOpenChange={(open) => !open && setEditSlot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Meal Slot</DialogTitle>
            <DialogDescription>Update the details for {editSlot?.name}</DialogDescription>
          </DialogHeader>
          {editSlot && <SlotForm slot={editSlot} onSubmit={handleEditSlot} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
