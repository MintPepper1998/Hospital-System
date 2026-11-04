"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { Trash2, Plus, Receipt } from "lucide-react"
import { updateOTConsumables } from "@/app/actions/ot"
import { getMedicines } from "@/lib/actions"

type Consumable = {
  id: string
  type: string
  name: string
  quantity: number
  price: number
  total: number
}

export function OTConsumablesTab({ surgery }: { surgery: any }) {
  const [consumables, setConsumables] = useState<Consumable[]>(() => {
    if (surgery.consumables) {
      try {
        return typeof surgery.consumables === 'string' 
          ? JSON.parse(surgery.consumables) 
          : surgery.consumables
      } catch (e) {
        return []
      }
    }
    return []
  })
  
  const [newItemParams, setNewItemParams] = useState({
    type: "Medicine",
    name: "",
    quantity: 1,
    price: 0
  })

  const [isPending, setIsPending] = useState(false)
  const [inventoryMedicines, setInventoryMedicines] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      try {
        const res = await getMedicines()
        if (res.success && res.data) setInventoryMedicines(res.data)
      } catch (e) {
        console.error("Failed to load medicines", e)
      }
    }
    load()
  }, [])

  const handleNameChange = (val: string) => {
    setNewItemParams(prev => ({ ...prev, name: val }))
    
    // Auto-fill price if it matches an existing medicine exactly
    if (newItemParams.type === "Medicine") {
      const med = inventoryMedicines.find(m => m.name === val)
      if (med) {
        setNewItemParams(prev => ({ ...prev, name: val, price: med.unitPrice || 0 }))
      }
    }
  }

  const addItem = () => {
    if (!newItemParams.name || newItemParams.quantity <= 0 || newItemParams.price < 0) {
      toast.error("Invalid Input: Please enter valid item details.")
      return
    }

    const newItem: Consumable = {
      id: crypto.randomUUID(),
      type: newItemParams.type,
      name: newItemParams.name,
      quantity: newItemParams.quantity,
      price: newItemParams.price,
      total: newItemParams.quantity * newItemParams.price
    }

    setConsumables([...consumables, newItem])
    setNewItemParams({ type: "Medicine", name: "", quantity: 1, price: 0 })
  }

  const removeItem = (id: string) => {
    setConsumables(consumables.filter(c => c.id !== id))
  }

  const handleSave = async (generateBill = false) => {
    setIsPending(true)
    try {
      const result = await updateOTConsumables({
        surgeryId: surgery.id,
        consumables: consumables,
        generateBill
      })

      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsPending(false)
    }
  }

  const totalConsumables = consumables.reduce((sum, item) => sum + item.total, 0)
  const baseCharge = surgery.surgeryCharge || 0
  const estimatedOverall = (surgery.estimatedCost || 0)
  const actualCost = baseCharge + totalConsumables

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-3 rounded-lg border">
        <div>
          <p className="text-muted-foreground">Estimated Cost / Base Charge</p>
          <p className="font-semibold text-lg">₹{baseCharge.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Total Actual Cost (w/ Consumables)</p>
          <p className="font-semibold text-lg text-primary">₹{actualCost.toFixed(2)}</p>
        </div>
      </div>

      <div className="border rounded-md p-3 space-y-3 bg-card">
        <h4 className="font-medium text-sm">Add Consumable</h4>
        <div className="grid grid-cols-12 gap-2">
          <div className="col-span-12 sm:col-span-3">
            <Label className="text-xs">Type</Label>
            <Select 
              value={newItemParams.type} 
              onValueChange={(val) => setNewItemParams({...newItemParams, type: val})}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Medicine">Medicine</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-12 sm:col-span-4">
            <Label className="text-xs">Name</Label>
            <Input 
              className="h-8" 
              placeholder="e.g. Propofol 10ml" 
              value={newItemParams.name}
              onChange={(e) => handleNameChange(e.target.value)}
              list={newItemParams.type === "Medicine" ? "pharmacy-medicines" : undefined}
            />
            {newItemParams.type === "Medicine" && (
              <datalist id="pharmacy-medicines">
                {inventoryMedicines.map(m => (
                  <option key={m.id} value={m.name}>
                    {m.name} (Stock: {m.totalStock}, ₹{m.unitPrice})
                  </option>
                ))}
              </datalist>
            )}
          </div>
          <div className="col-span-4 sm:col-span-2">
            <Label className="text-xs">Qty</Label>
            <Input 
              type="number" 
              className="h-8" 
              min="1"
              value={newItemParams.quantity}
              onChange={(e) => setNewItemParams({...newItemParams, quantity: parseInt(e.target.value) || 0})}
            />
          </div>
          <div className="col-span-5 sm:col-span-2">
            <Label className="text-xs">Unit Price</Label>
            <Input 
              type="number" 
              className="h-8" 
              min="0"
              value={newItemParams.price}
              onChange={(e) => setNewItemParams({...newItemParams, price: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div className="col-span-3 sm:col-span-1 flex items-end">
            <Button size="icon" variant="secondary" className="h-8 w-8" onClick={addItem}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium text-sm mb-2">Used Consumables ({consumables.length})</h4>
        {consumables.length === 0 ? (
          <p className="text-xs text-muted-foreground border border-dashed rounded p-4 text-center">
            No medicines or equipment added yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {consumables.map(item => (
              <div key={item.id} className="flex items-center justify-between text-xs p-2 rounded border bg-muted/20">
                <div className="flex-1">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground ml-2">({item.type})</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>{item.quantity} x ₹{item.price.toFixed(2)}</span>
                  <span className="font-medium w-16 text-right">₹{item.total.toFixed(2)}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center text-sm font-semibold p-2 bg-muted/50 rounded border">
              <span>Consumables Total</span>
              <span>₹{totalConsumables.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => handleSave(false)}
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save Draft"}
        </Button>
        <Button 
          type="button" 
          onClick={() => handleSave(true)}
          disabled={isPending || consumables.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          <Receipt className="mr-2 h-4 w-4" />
          Update Bill
        </Button>
      </div>
    </div>
  )
}
