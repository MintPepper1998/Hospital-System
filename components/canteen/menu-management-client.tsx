"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import {
  Plus, Salad, Drumstick, Egg, IndianRupee, Pencil, Loader2, UtensilsCrossed,
  CalendarDays, Copy, Check,
} from "lucide-react"
import { createMenuItem, updateMenuItem, setDailyMenu, copyDailyMenu } from "@/lib/canteen-actions"

interface MenuItem {
  id: string; name: string; category: string; subCategory: string | null
  description: string | null; imageUrl: string | null; price: number; ipdPrice: number | null
  nutritionInfo: string | null; allergens: string | null; isActive: boolean; sortOrder: number
}

interface MealSlot {
  id: string; name: string; code: string; startTime: string; endTime: string
}

interface DailyMenuItem {
  id: string; mealSlotId: string; menuItemId: string
  mealSlot: MealSlot; menuItem: MenuItem
}

interface Props {
  menuItems: MenuItem[]
  mealSlots: MealSlot[]
  todayMenu: DailyMenuItem[]
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  VEG: <Salad className="h-4 w-4 text-green-600" />,
  NON_VEG: <Drumstick className="h-4 w-4 text-red-600" />,
  EGG: <Egg className="h-4 w-4 text-amber-600" />,
}

const CATEGORY_COLORS: Record<string, string> = {
  VEG: "bg-green-100 text-green-700 border-green-200",
  NON_VEG: "bg-red-100 text-red-700 border-red-200",
  EGG: "bg-amber-100 text-amber-700 border-amber-200",
}

const SUB_CATEGORIES = ["Main Course", "Side Dish", "Beverage", "Dessert", "Soup", "Salad", "Snack", "Bread"]

export function MenuManagementClient({ menuItems, mealSlots, todayMenu }: Props) {
  const [isPending, startTransition] = useTransition()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editItem, setEditItem] = useState<MenuItem | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string>(mealSlots[0]?.id || "")
  const [selectedItems, setSelectedItems] = useState<Set<string>>(() => {
    const items = new Set<string>()
    todayMenu.filter((m) => m.mealSlotId === (mealSlots[0]?.id || "")).forEach((m) => items.add(m.menuItemId))
    return items
  })

  function handleSlotChange(slotId: string) {
    setSelectedSlot(slotId)
    const items = new Set<string>()
    todayMenu.filter((m) => m.mealSlotId === slotId).forEach((m) => items.add(m.menuItemId))
    setSelectedItems(items)
  }

  function toggleMenuItem(itemId: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  function handleSaveDailyMenu() {
    if (!selectedSlot) return
    startTransition(async () => {
      const result = await setDailyMenu({
        date: new Date(),
        mealSlotId: selectedSlot,
        menuItemIds: Array.from(selectedItems),
      })
      if (result.success) toast.success("Daily menu saved!")
      else toast.error(result.error || "Failed to save menu")
    })
  }

  function handleCopyYesterday() {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    startTransition(async () => {
      const result = await copyDailyMenu(yesterday, new Date())
      if (result.success) {
        toast.success(`Copied ${result.count} items from yesterday`)
        window.location.reload()
      } else toast.error(result.error || "Failed to copy menu")
    })
  }

  async function handleAddItem(formData: FormData) {
    const name = formData.get("name") as string
    const category = formData.get("category") as "VEG" | "NON_VEG" | "EGG"
    const subCategory = formData.get("subCategory") as string
    const price = parseFloat(formData.get("price") as string)
    const ipdPrice = formData.get("ipdPrice") ? parseFloat(formData.get("ipdPrice") as string) : undefined
    const description = formData.get("description") as string
    const imageUrl = formData.get("imageUrl") as string
    const allergens = formData.get("allergens") as string

    if (!name || !price) { toast.error("Name and price are required"); return }

    startTransition(async () => {
      const result = await createMenuItem({
        name, category, subCategory, price, ipdPrice, description, imageUrl, allergens,
      })
      if (result.success) {
        toast.success("Menu item added!")
        setShowAddDialog(false)
        window.location.reload()
      } else toast.error(result.error || "Failed to add item")
    })
  }

  async function handleEditItem(formData: FormData) {
    if (!editItem) return
    const name = formData.get("name") as string
    const category = formData.get("category") as "VEG" | "NON_VEG" | "EGG"
    const subCategory = formData.get("subCategory") as string
    const price = parseFloat(formData.get("price") as string)
    const ipdPrice = formData.get("ipdPrice") ? parseFloat(formData.get("ipdPrice") as string) : undefined
    const description = formData.get("description") as string
    const imageUrl = formData.get("imageUrl") as string
    const allergens = formData.get("allergens") as string

    startTransition(async () => {
      const result = await updateMenuItem(editItem.id, {
        name, category, subCategory, price, ipdPrice, description, imageUrl, allergens,
      })
      if (result.success) {
        toast.success("Menu item updated!")
        setEditItem(null)
        window.location.reload()
      } else toast.error(result.error || "Failed to update item")
    })
  }

  function MenuItemForm({ item, onSubmit }: { item?: MenuItem | null; onSubmit: (fd: FormData) => void }) {
    return (
      <form action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name <span className="text-red-500">*</span></Label>
            <Input id="name" name="name" defaultValue={item?.name || ""} placeholder="e.g., Plain Rice" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
            <Select name="category" defaultValue={item?.category || "VEG"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="VEG"><div className="flex items-center gap-2"><Salad className="h-4 w-4 text-green-600" /> Veg</div></SelectItem>
                <SelectItem value="NON_VEG"><div className="flex items-center gap-2"><Drumstick className="h-4 w-4 text-red-600" /> Non-Veg</div></SelectItem>
                <SelectItem value="EGG"><div className="flex items-center gap-2"><Egg className="h-4 w-4 text-amber-600" /> Egg</div></SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="subCategory">Sub-Category</Label>
            <Select name="subCategory" defaultValue={item?.subCategory || ""}>
              <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {SUB_CATEGORIES.map((sc) => <SelectItem key={sc} value={sc}>{sc}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Walk-in Price (₹) <span className="text-red-500">*</span></Label>
            <Input id="price" name="price" type="number" step="0.5" min="0" defaultValue={item?.price || ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ipdPrice">IPD Price (₹)</Label>
            <Input id="ipdPrice" name="ipdPrice" type="number" step="0.5" min="0" defaultValue={item?.ipdPrice || ""} placeholder="Same as walk-in" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" defaultValue={item?.description || ""} rows={2} />
          </div>
          <div className="space-y-2 flex flex-col gap-2">
            <div className="space-y-2">
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input id="imageUrl" name="imageUrl" defaultValue={item?.imageUrl || ""} placeholder="https://example.com/image.jpg" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergens">Allergens</Label>
              <Input id="allergens" name="allergens" defaultValue={item?.allergens || ""} placeholder="e.g., Gluten, Dairy" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {item ? "Update Item" : "Add Item"}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
            <Salad className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
            <p className="text-sm text-gray-500">Manage food items and plan daily menus</p>
          </div>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Menu Item</DialogTitle>
              <DialogDescription>Add a new food item to the canteen menu catalog</DialogDescription>
            </DialogHeader>
            <MenuItemForm onSubmit={handleAddItem} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog">
            <UtensilsCrossed className="h-4 w-4 mr-2" /> Menu Catalog
          </TabsTrigger>
          <TabsTrigger value="daily">
            <CalendarDays className="h-4 w-4 mr-2" /> Today&apos;s Menu
          </TabsTrigger>
        </TabsList>

        {/* Menu Catalog Tab */}
        <TabsContent value="catalog">
          {menuItems.length === 0 ? (
            <Card className="border-dashed border-2">
              <CardContent className="pt-8 pb-8 text-center">
                <UtensilsCrossed className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No menu items yet. Add your first item!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow border-0 shadow-sm">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <UtensilsCrossed className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                            {item.name}
                          </p>
                          {item.subCategory && (
                            <p className="text-xs text-gray-400">{item.subCategory}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={`text-[10px] ${CATEGORY_COLORS[item.category]}`}>
                        {item.category === "NON_VEG" ? "Non-Veg" : item.category === "EGG" ? "Egg" : "Veg"}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-2 line-clamp-2">{item.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-emerald-700 flex items-center">
                          <IndianRupee className="h-3.5 w-3.5" />{item.price}
                        </span>
                        {item.ipdPrice && item.ipdPrice !== item.price && (
                          <span className="text-xs text-blue-600">
                            IPD: ₹{item.ipdPrice}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setEditItem(item)}
                        className="h-7 px-2 text-gray-400 hover:text-gray-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {item.allergens && (
                      <p className="text-[10px] text-red-400 mt-1">⚠️ {item.allergens}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Daily Menu Planner Tab */}
        <TabsContent value="daily">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Today&apos;s Menu Planner</CardTitle>
                  <CardDescription>
                    Select which items are available for each meal slot today
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleCopyYesterday} disabled={isPending}>
                  <Copy className="h-4 w-4 mr-2" /> Copy from Yesterday
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {mealSlots.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No meal slots configured. Go to Admin settings to add meal slots.
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Slot Tabs */}
                  <div className="flex gap-2 flex-wrap">
                    {mealSlots.map((slot) => (
                      <Button
                        key={slot.id}
                        variant={selectedSlot === slot.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleSlotChange(slot.id)}
                        className={selectedSlot === slot.id ? "bg-emerald-600" : ""}
                      >
                        {slot.name} ({slot.startTime}–{slot.endTime})
                      </Button>
                    ))}
                  </div>

                  {/* Item Checkboxes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
                    {menuItems.map((item) => (
                      <label
                        key={item.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedItems.has(item.id)
                            ? "bg-emerald-50 border-emerald-300"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <Checkbox
                          checked={selectedItems.has(item.id)}
                          onCheckedChange={() => toggleMenuItem(item.id)}
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-sm font-medium truncate">{item.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-emerald-600">₹{item.price}</span>
                        {selectedItems.has(item.id) && (
                          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                        )}
                      </label>
                    ))}
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveDailyMenu}
                      disabled={isPending || !selectedSlot}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Menu ({selectedItems.size} items)
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
            <DialogDescription>Update the details for {editItem?.name}</DialogDescription>
          </DialogHeader>
          {editItem && <MenuItemForm item={editItem} onSubmit={handleEditItem} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
