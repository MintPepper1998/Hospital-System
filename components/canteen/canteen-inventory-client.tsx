"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  Package, Plus, AlertTriangle, TrendingDown, Loader2, ArrowDown, ArrowUp, RotateCcw,
} from "lucide-react"
import { createInventoryItem, addStockEntry } from "@/lib/canteen-actions"

interface InventoryItem {
  id: string; name: string; category: string | null; unit: string
  currentStock: number; minStockLevel: number; costPerUnit: number
}

interface StockEntry {
  id: string; entryType: string; quantity: number; supplierName: string | null
  entryDate: string; inventoryItem: { name: string; unit: string }
}

interface Props {
  inventoryItems: InventoryItem[]
  recentEntries: StockEntry[]
}

const CATEGORIES = ["Grains", "Spices", "Dairy", "Vegetables", "Fruits", "Oil & Fats", "Beverages", "Packaging", "Other"]
const UNITS = ["kg", "ltr", "pcs", "pkt", "dozen", "gm", "ml"]

export function CanteenInventoryClient({ inventoryItems, recentEntries }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [stockEntryItem, setStockEntryItem] = useState<InventoryItem | null>(null)

  const lowStockItems = inventoryItems.filter((i) => i.currentStock <= i.minStockLevel)

  function handleAddItem(formData: FormData) {
    const name = formData.get("name") as string
    const category = formData.get("category") as string
    const unit = formData.get("unit") as string
    const minStockLevel = parseFloat(formData.get("minStockLevel") as string) || 5

    if (!name) { toast.error("Name is required"); return }

    startTransition(async () => {
      const result = await createInventoryItem({ name, category, unit, minStockLevel })
      if (result.success) {
        toast.success("Inventory item added!")
        setShowAddDialog(false)
        window.location.reload()
      } else toast.error(result.error || "Failed to add item")
    })
  }

  function handleStockEntry(formData: FormData) {
    if (!stockEntryItem) return
    const entryType = formData.get("entryType") as string
    const quantity = parseFloat(formData.get("quantity") as string)
    const costPerUnit = formData.get("costPerUnit") ? parseFloat(formData.get("costPerUnit") as string) : undefined
    const supplierName = formData.get("supplierName") as string
    const notes = formData.get("notes") as string

    if (!quantity) { toast.error("Quantity is required"); return }

    const finalQty = entryType === "WASTAGE" ? -Math.abs(quantity) : Math.abs(quantity)

    startTransition(async () => {
      const result = await addStockEntry({
        inventoryItemId: stockEntryItem.id,
        entryType,
        quantity: finalQty,
        costPerUnit,
        supplierName,
        notes,
      })
      if (result.success) {
        toast.success("Stock entry recorded!")
        setStockEntryItem(null)
        window.location.reload()
      } else toast.error(result.error || "Failed to record entry")
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Canteen Inventory</h1>
            <p className="text-sm text-gray-500">
              {inventoryItems.length} items • {lowStockItems.length} low stock
            </p>
          </div>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
              <DialogDescription>Add a new raw material to the canteen inventory</DialogDescription>
            </DialogHeader>
            <form action={handleAddItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Item Name <span className="text-red-500">*</span></Label>
                  <Input name="name" placeholder="e.g., Basmati Rice" required />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select name="category">
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select name="unit" defaultValue="kg">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Min Stock Level</Label>
                  <Input name="minStockLevel" type="number" step="0.5" defaultValue="5" />
                </div>
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Item
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-semibold text-red-700">Low Stock Alert ({lowStockItems.length})</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {lowStockItems.map((item) => (
                <Badge key={item.id} variant="outline" className="border-red-300 text-red-700 bg-white">
                  {item.name}: {item.currentStock} {item.unit} (min: {item.minStockLevel})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Stock Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryItems.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No inventory items yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="text-left py-2 px-3 font-medium">Item</th>
                    <th className="text-left py-2 px-3 font-medium">Category</th>
                    <th className="text-right py-2 px-3 font-medium">Stock</th>
                    <th className="text-right py-2 px-3 font-medium">Min Level</th>
                    <th className="text-right py-2 px-3 font-medium">Cost/Unit</th>
                    <th className="text-center py-2 px-3 font-medium">Status</th>
                    <th className="text-center py-2 px-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryItems.map((item) => {
                    const isLow = item.currentStock <= item.minStockLevel
                    return (
                      <tr key={item.id} className={`border-b last:border-0 ${isLow ? "bg-red-50" : "hover:bg-gray-50"}`}>
                        <td className="py-2.5 px-3 font-medium">{item.name}</td>
                        <td className="py-2.5 px-3 text-gray-500">{item.category || "—"}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-400">
                          {item.minStockLevel} {item.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right">₹{item.costPerUnit.toFixed(2)}</td>
                        <td className="py-2.5 px-3 text-center">
                          {isLow ? (
                            <Badge className="bg-red-100 text-red-700 text-[10px]">
                              <TrendingDown className="h-3 w-3 mr-0.5" /> Low
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 text-[10px]">OK</Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 text-xs text-teal-600 hover:text-teal-700"
                            onClick={() => setStockEntryItem(item)}
                          >
                            + Stock
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Entries */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Recent Stock Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No stock entries yet</p>
          ) : (
            <div className="space-y-2">
              {recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-sm">
                  <div className="flex items-center gap-3">
                    {entry.entryType === "PURCHASE" ? (
                      <ArrowDown className="h-4 w-4 text-green-600" />
                    ) : entry.entryType === "WASTAGE" ? (
                      <ArrowUp className="h-4 w-4 text-red-600" />
                    ) : (
                      <RotateCcw className="h-4 w-4 text-amber-600" />
                    )}
                    <div>
                      <span className="font-medium">{entry.inventoryItem.name}</span>
                      <span className="text-gray-400 ml-2 text-xs">
                        {entry.entryType === "WASTAGE" ? "-" : "+"}{Math.abs(entry.quantity)} {entry.inventoryItem.unit}
                      </span>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    {entry.supplierName && <span className="mr-2">{entry.supplierName}</span>}
                    {new Date(entry.entryDate).toLocaleDateString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Entry Dialog */}
      <Dialog open={!!stockEntryItem} onOpenChange={(open) => !open && setStockEntryItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Entry — {stockEntryItem?.name}</DialogTitle>
            <DialogDescription>
              Current stock: {stockEntryItem?.currentStock} {stockEntryItem?.unit}
            </DialogDescription>
          </DialogHeader>
          <form action={handleStockEntry} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entry Type</Label>
                <Select name="entryType" defaultValue="PURCHASE">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PURCHASE">Purchase (In)</SelectItem>
                    <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    <SelectItem value="WASTAGE">Wastage (Out)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Quantity ({stockEntryItem?.unit}) <span className="text-red-500">*</span></Label>
                <Input name="quantity" type="number" step="0.5" min="0.1" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost per Unit (₹)</Label>
                <Input name="costPerUnit" type="number" step="0.01" min="0" />
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input name="supplierName" placeholder="Supplier name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea name="notes" rows={2} placeholder="Optional notes..." />
            </div>
            <Button type="submit" disabled={isPending} className="w-full bg-teal-600 hover:bg-teal-700">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Entry
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
