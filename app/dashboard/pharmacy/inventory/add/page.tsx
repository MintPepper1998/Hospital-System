"use client"

import { useState, useEffect } from "react"
import { useActionState } from "react"
import { addInventory } from "@/lib/actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon, PackagePlus, Calculator } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const initialState = {
  success: false,
  error: false,
  message: "",
}

const MEDICINE_CATEGORIES = [
  "Antibiotics",
  "Painkillers",
  "Vitamins & Supplements",
  "Antacids",
  "Antihistamines",
  "Antidiabetic",
  "Antihypertensive",
  "Antipyretics",
  "Cardiovascular",
  "Dermatology",
  "Respiratory",
  "Gastrointestinal",
  "Injections",
  "Syrups",
  "Ointments & Creams",
  "Other",
]

export default function AddInventoryPage() {
  const [state, formAction] = useActionState(addInventory, initialState)
  const [expiryDate, setExpiryDate] = useState<Date>()
  const [quantity, setQuantity] = useState<number>(0)
  const [costPrice, setCostPrice] = useState<number>(0)
  const [sellingPrice, setSellingPrice] = useState<number>(0)
  const [mrpPerStrip, setMrpPerStrip] = useState<number>(0)
  const [packSize, setPackSize] = useState<number>(10)
  const [taxRate, setTaxRate] = useState<number>(12.0)
  const [category, setCategory] = useState<string>("")

  // Calculate totals
  const totalPurchaseCost = quantity * costPrice
  const potentialRevenue = quantity * sellingPrice
  const profitMargin = potentialRevenue - totalPurchaseCost
  const profitPercentage = totalPurchaseCost > 0 ? (profitMargin / totalPurchaseCost) * 100 : 0

  // Handle form submission result
  useEffect(() => {
    if (state?.success) {
      toast.success(state.message)
      // Reset form
      setExpiryDate(undefined)
      setQuantity(0)
      setCostPrice(0)
      setSellingPrice(0)
      setMrpPerStrip(0)
      setPackSize(10)
      setTaxRate(12.0)
      setCategory("")
      // Reset form element
      const form = document.getElementById("inventory-form") as HTMLFormElement
      form?.reset()
    } else if (state?.error && state?.message) {
      toast.error(state.message)
    }
  }, [state])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#0066CC] flex items-center gap-2">
          <PackagePlus className="h-8 w-8" />
          Purchase Entry
        </h2>
        <p className="text-muted-foreground mt-2">
          Add new stock to pharmacy inventory
        </p>
      </div>

      <form id="inventory-form" action={formAction}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Medicine Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Medicine Details</CardTitle>
              <CardDescription>
                Search existing medicine or add new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="medicineName">
                    Medicine Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="medicineName"
                    name="medicineName"
                    placeholder="e.g., Paracetamol 500mg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="genericName">Generic Name</Label>
                  <Input
                    id="genericName"
                    name="genericName"
                    placeholder="e.g., Acetaminophen"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <Input
                    id="manufacturer"
                    name="manufacturer"
                    placeholder="e.g., Sun Pharma"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    name="category" 
                    value={category} 
                    onValueChange={setCategory}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDICINE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="packSize">Pack Size (Tablets per Strip)</Label>
                  <Input
                    id="packSize"
                    name="packSize"
                    type="number"
                    placeholder="10"
                    defaultValue="10"
                    min="1"
                    value={packSize || ""}
                    onChange={(e) => setPackSize(parseInt(e.target.value) || 10)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of tablets/capsules per strip/pack
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxRate">GST Rate (%)</Label>
                  <Input
                    id="taxRate"
                    name="taxRate"
                    type="number"
                    step="0.01"
                    placeholder="12.0"
                    defaultValue="12.0"
                    min="0"
                    max="100"
                    value={taxRate || ""}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 12.0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    GST percentage (default: 12%)
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStockLevel">Minimum Stock Level (Alert Threshold)</Label>
                <Input
                  id="minStockLevel"
                  name="minStockLevel"
                  type="number"
                  placeholder="10"
                  defaultValue="10"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">
                  You'll be alerted when stock falls below this level
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Purchase Summary */}
          <Card className="border-t-4 border-t-[#0066CC]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Purchase Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-semibold">{quantity} units</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost Price:</span>
                  <span className="font-semibold">₹{costPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Selling Price:</span>
                  <span className="font-semibold">₹{sellingPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total Purchase Cost:</span>
                  <span className="text-lg font-bold text-orange-600">
                    ₹{totalPurchaseCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Potential Revenue:</span>
                  <span className="text-lg font-bold text-green-600">
                    ₹{potentialRevenue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Expected Profit:</span>
                  <span className={cn(
                    "text-lg font-bold",
                    profitMargin >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    ₹{profitMargin.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Profit Margin:</span>
                  <span className={cn(
                    "text-sm font-semibold",
                    profitPercentage >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {profitPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Batch Details Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Batch Details</CardTitle>
            <CardDescription>
              Enter batch-specific information for this purchase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="batchNumber">
                  Batch Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="batchNumber"
                  name="batchNumber"
                  placeholder="e.g., BT20260115"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">
                  Expiry Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expiryDate && "text-muted-foreground"
                      )}
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiryDate ? format(expiryDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={expiryDate}
                      onSelect={setExpiryDate}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <input
                  type="hidden"
                  name="expiryDate"
                  value={expiryDate ? format(expiryDate, "yyyy-MM-dd") : ""}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantity">
                  Quantity <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  placeholder="100"
                  min="1"
                  required
                  value={quantity || ""}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="costPrice">
                  Cost Price (CP) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="costPrice"
                  name="costPrice"
                  type="number"
                  step="0.01"
                  placeholder="10.00"
                  min="0"
                  required
                  value={costPrice || ""}
                  onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sellingPrice">
                  Selling Price (MRP) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sellingPrice"
                  name="sellingPrice"
                  type="number"
                  step="0.01"
                  placeholder="15.00"
                  min="0"
                  required
                  value={sellingPrice || ""}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mrpPerStrip">
                  MRP per Strip/Pack <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mrpPerStrip"
                  name="mrpPerStrip"
                  type="number"
                  step="0.01"
                  placeholder="50.00"
                  min="0"
                  required
                  value={mrpPerStrip || ""}
                  onChange={(e) => setMrpPerStrip(parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Price per strip (for loose tablet sales)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor Name</Label>
                <Input
                  id="vendor"
                  name="vendor"
                  placeholder="e.g., MediSupply Co."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rackNumber">Rack/Location Number</Label>
              <Input
                id="rackNumber"
                name="rackNumber"
                placeholder="e.g., A-12, Shelf 3"
              />
              <p className="text-xs text-muted-foreground">
                Storage location in pharmacy
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end gap-4">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            className="bg-[#0066CC] hover:bg-[#0052A3]"
          >
            <PackagePlus className="h-4 w-4 mr-2" />
            Add to Stock
          </Button>
        </div>
      </form>
    </div>
  )
}
