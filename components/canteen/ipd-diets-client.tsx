"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  Bed, UtensilsCrossed, Loader2, CheckCircle2, Clock, User, Salad, Drumstick, Egg,
  ClipboardCheck,
} from "lucide-react"
import { createMealOrder, updateMealOrderStatus } from "@/lib/canteen-actions"

interface DietAssignment {
  id: string
  admissionId: string
  dietPlan: { id: string; name: string; code: string; restrictions: string | null }
  customNotes: string | null
  admission: {
    id: string
    patient: { id: string; user: { name: string | null } }
    bed: { bedNumber: string; ward: { name: string } }
  }
}

interface DietPlan { id: string; name: string; code: string; description: string | null }
interface MealSlot { id: string; name: string; code: string; startTime: string; endTime: string }
interface MenuItem {
  id: string; name: string; category: string; subCategory: string | null; price: number; ipdPrice: number | null
}

interface OrderItem { id: string; menuItemId: string; itemName: string; quantity: number; unitPrice: number; totalPrice: number }
interface MealOrder {
  id: string; orderNumber: string; admissionId: string | null; status: string; totalAmount: number
  mealSlot: { name: string; code: string }; items: OrderItem[]
}

interface Props {
  activeDiets: DietAssignment[]
  dietPlans: DietPlan[]
  mealSlots: MealSlot[]
  menuItems: MenuItem[]
  todayOrders: MealOrder[]
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  VEG: <Salad className="h-3.5 w-3.5 text-green-600" />,
  NON_VEG: <Drumstick className="h-3.5 w-3.5 text-red-600" />,
  EGG: <Egg className="h-3.5 w-3.5 text-amber-600" />,
}

export function IpdDietsClient({ activeDiets, dietPlans, mealSlots, menuItems, todayOrders }: Props) {
  const [isPending, startTransition] = useTransition()
  const [servingAdmission, setServingAdmission] = useState<DietAssignment | null>(null)
  const [selectedSlot, setSelectedSlot] = useState("")
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map())

  function openServeDialog(diet: DietAssignment) {
    setServingAdmission(diet)
    setSelectedSlot(mealSlots[0]?.id || "")
    setSelectedItems(new Map())
  }

  function toggleItem(item: MenuItem) {
    setSelectedItems((prev) => {
      const next = new Map(prev)
      if (next.has(item.id)) next.delete(item.id)
      else next.set(item.id, 1)
      return next
    })
  }

  function handleServeMeal() {
    if (!servingAdmission || !selectedSlot || selectedItems.size === 0) {
      toast.error("Select a meal slot and at least one item")
      return
    }

    startTransition(async () => {
      const items = Array.from(selectedItems.entries()).map(([menuItemId, qty]) => {
        const mi = menuItems.find((m) => m.id === menuItemId)!
        return {
          menuItemId,
          itemName: mi.name,
          quantity: qty,
          unitPrice: mi.ipdPrice || mi.price,
        }
      })

      const result = await createMealOrder({
        admissionId: servingAdmission.admissionId,
        mealSlotId: selectedSlot,
        items,
      })

      if (result.success) {
        toast.success(`Meal order created: ${result.order?.orderNumber}`)
        setServingAdmission(null)
        window.location.reload()
      } else toast.error(result.error || "Failed to create order")
    })
  }

  function handleMarkServed(orderId: string) {
    startTransition(async () => {
      const result = await updateMealOrderStatus(orderId, "SERVED")
      if (result.success) toast.success("Meal marked as served")
      else toast.error(result.error || "Failed to update")
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
          <ClipboardCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">IPD Diet Plans</h1>
          <p className="text-sm text-gray-500">
            {activeDiets.length} active diet assignments • Serve meals & track delivery
          </p>
        </div>
      </div>

      {/* Active Diet Assignments */}
      {activeDiets.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="pt-8 pb-8 text-center">
            <UtensilsCrossed className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No active diet assignments</p>
            <p className="text-xs text-gray-400 mt-1">
              Doctors can assign diet plans from the IPD patient dashboard
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeDiets.map((diet) => {
            const patientOrders = todayOrders.filter((o) => o.admissionId === diet.admissionId)
            const servedSlots = new Set(patientOrders.filter((o) => o.status === "SERVED").map((o) => o.mealSlot.code))
            return (
              <Card key={diet.id} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {diet.admission.patient.user.name || "Unknown"}
                        </CardTitle>
                        <CardDescription className="text-xs flex items-center gap-1">
                          <Bed className="h-3 w-3" />
                          {diet.admission.bed.ward.name} — {diet.admission.bed.bedNumber}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                      {diet.dietPlan.name}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {diet.dietPlan.restrictions && (
                    <p className="text-xs text-red-500 bg-red-50 rounded-md p-2">
                      ⚠️ {diet.dietPlan.restrictions}
                    </p>
                  )}
                  {diet.customNotes && (
                    <p className="text-xs text-blue-600 bg-blue-50 rounded-md p-2">
                      📝 {diet.customNotes}
                    </p>
                  )}

                  {/* Meal Slot Status */}
                  <div className="flex gap-1.5 flex-wrap">
                    {mealSlots.map((slot) => (
                      <Badge
                        key={slot.id}
                        className={`text-[10px] ${
                          servedSlots.has(slot.code)
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {servedSlots.has(slot.code) ? "✅" : "⏳"} {slot.code}
                      </Badge>
                    ))}
                  </div>

                  {/* Today's Orders */}
                  {patientOrders.length > 0 && (
                    <div className="space-y-1">
                      {patientOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between text-xs bg-gray-50 rounded p-2">
                          <div>
                            <span className="font-medium">{order.mealSlot.name}</span>
                            <span className="text-gray-400 ml-1">
                              ({order.items.length} items • ₹{order.totalAmount})
                            </span>
                          </div>
                          {order.status === "PENDING" ? (
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => handleMarkServed(order.id)}>
                              {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                              Serve
                            </Button>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 text-[10px]">Served</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openServeDialog(diet)}
                  >
                    <UtensilsCrossed className="h-4 w-4 mr-2" />
                    Record Meal
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Serve Meal Dialog */}
      <Dialog open={!!servingAdmission} onOpenChange={(open) => !open && setServingAdmission(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Meal — {servingAdmission?.admission.patient.user.name}</DialogTitle>
            <DialogDescription>
              {servingAdmission?.admission.bed.ward.name} — {servingAdmission?.admission.bed.bedNumber} •
              Diet: {servingAdmission?.dietPlan.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Meal Slot Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Meal Slot</label>
              <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                <SelectTrigger><SelectValue placeholder="Select slot" /></SelectTrigger>
                <SelectContent>
                  {mealSlots.map((slot) => (
                    <SelectItem key={slot.id} value={slot.id}>
                      {slot.name} ({slot.startTime}–{slot.endTime})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Item Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Items Served</label>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {menuItems.map((item) => {
                  const isSelected = selectedItems.has(item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item)}
                      className={`p-2.5 rounded-lg border text-left text-sm transition-all ${
                        isSelected
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {CATEGORY_ICONS[item.category]}
                        <span className="font-medium truncate">{item.name}</span>
                      </div>
                      <p className="text-xs text-emerald-600 mt-0.5">₹{item.ipdPrice || item.price}</p>
                      {isSelected && (
                        <CheckCircle2 className="h-4 w-4 text-blue-600 mt-1" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <Button
              onClick={handleServeMeal}
              disabled={isPending || selectedItems.size === 0}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Meal ({selectedItems.size} items)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
