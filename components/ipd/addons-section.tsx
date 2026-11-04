"use client"

import { useState, useTransition } from "react"
import { BillBreakdown, addCustomCharge, removeCustomCharge } from "@/app/actions/billing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2, Plus, Receipt } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useRouter } from "next/navigation"

interface AddonsSectionProps {
  admissionId: string
  customCharges: BillBreakdown["customCharges"]
  total: number
}

export function AddonsSection({ admissionId, customCharges, total }: AddonsSectionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [discountAmount, setDiscountAmount] = useState("0")
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().split("T")[0])

  const handleAdd = () => {
    const valAmount = parseFloat(amount)
    const valQty = parseInt(quantity)
    const valDiscount = parseFloat(discountAmount) || 0

    if (!name || isNaN(valAmount) || valAmount <= 0 || isNaN(valQty) || valQty <= 0) {
      toast.error("Please provide valid name, amount, and quantity.")
      return
    }

    startTransition(async () => {
      const result = await addCustomCharge({
        admissionId,
        category: "ADDON",
        name,
        amount: valAmount,
        quantity: valQty,
        discountAmount: valDiscount,
        date: chargeDate || new Date().toISOString(),
      })

      if (result.success) {
        toast.success(result.message)
        setIsOpen(false)
        setName("")
        setAmount("")
        setQuantity("1")
        setDiscountAmount("0")
        setChargeDate(new Date().toISOString().split("T")[0])
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleRemove = (chargeId: string) => {
    startTransition(async () => {
      const result = await removeCustomCharge(chargeId)
      if (result.success) {
        toast.success(result.message)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const currentTotal = (parseFloat(amount || "0") * parseInt(quantity || "0")) - (parseFloat(discountAmount || "0") || 0)

  return (
    <Card className="shadow-sm border-blue-100">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg text-blue-900">Addons / Custom Charges</CardTitle>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8">
              <Plus className="h-4 w-4 mr-1" />
              Add Charge
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Charge</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Charge Date</Label>
                <Input 
                  type="date"
                  value={chargeDate}
                  onChange={(e) => setChargeDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Charge Name / Description</Label>
                <Input 
                  placeholder="e.g., Extra Blanket, Special Diet" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Unit Price (₹)</Label>
                  <Input 
                    type="number" 
                    min="0" 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Quantity</Label>
                  <Input 
                    type="number" 
                    min="1" 
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Discount Amount (₹) - Optional</Label>
                <Input 
                  type="number" 
                  min="0" 
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                />
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md mt-2">
                <span className="text-sm text-gray-600 font-medium">Calculated Total:</span>
                <span className="text-lg font-bold text-gray-900">₹{Math.max(0, currentTotal).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>Cancel</Button>
              <Button onClick={handleAdd} disabled={isPending}>
                {isPending ? "Adding..." : "Add Charge"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {customCharges.length === 0 ? (
          <div className="text-sm text-gray-500 py-4 text-center border border-dashed rounded-md bg-gray-50">
            No custom charges added yet.
          </div>
        ) : (
          <div className="space-y-3">
            {customCharges.map((charge) => (
              <div key={charge.id} className="flex items-center justify-between p-3 border rounded-md bg-white hover:bg-gray-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{charge.name}</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      {charge.date ? new Date(charge.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    ₹{charge.amount.toFixed(2)} × {charge.quantity}
                    {charge.discountAmount > 0 && ` (-₹${charge.discountAmount.toFixed(2)} discount)`}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="font-bold text-gray-900">
                    ₹{charge.totalAmount.toFixed(2)}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemove(charge.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t mt-3">
              <span className="font-medium text-gray-600">Addons Total</span>
              <span className="font-bold text-lg text-blue-900">₹{total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
