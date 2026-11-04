"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Loader2, Trash2, Plus, CalendarIcon, Check, ChevronsUpDown, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { createPurchaseOrder, updatePurchaseOrder } from "@/app/actions/purchase-order"

interface NewPurchaseOrderPageProps {
  suppliers: any[]
  medicines: any[]
  poToEdit?: any | null
  autoItems?: any[] | null
}

export function NewPurchaseOrderPage({ suppliers, medicines, poToEdit, autoItems }: NewPurchaseOrderPageProps) {
  const router = useRouter()
  
  const [supplierId, setSupplierId] = useState("")
  const [expectedDate, setExpectedDate] = useState("")
  const [notes, setNotes] = useState("")
  const [selectedItems, setSelectedItems] = useState<any[]>([])

  const [selectedMedicineId, setSelectedMedicineId] = useState("")
  const [medOpen, setMedOpen] = useState(false)
  const [quantity, setQuantity] = useState("")
  const [unitCost, setUnitCost] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialization
  useEffect(() => {
    if (poToEdit) {
      setSupplierId(poToEdit.supplierId)
      if (poToEdit.expectedDate) {
        setExpectedDate(format(new Date(poToEdit.expectedDate), "yyyy-MM-dd"))
      }
      setNotes(poToEdit.notes || "")
      setSelectedItems(poToEdit.items.map((i: any) => ({
        medicineId: i.medicineId,
        medicineName: i.medicine.name,
        medicineStrength: i.medicine.strength,
        medicineGeneric: i.medicine.genericName,
        quantity: i.quantity,
        unitCost: i.unitCost
      })))
    } else if (autoItems && autoItems.length > 0) {
      // Auto PO flow: autoItems just has medicineId, quantity, unitCost
      // Let's enrich it with name/strength
      const enriched = autoItems.map(ai => {
        const med = medicines.find(m => m.id === ai.medicineId)
        return {
          ...ai,
          medicineName: med?.name || ai.medicineName,
          medicineStrength: med?.strength,
          medicineGeneric: med?.genericName,
        }
      })
      setSelectedItems(enriched)
    }
  }, [poToEdit, autoItems, medicines])

  const handleAddItem = () => {
    if (!selectedMedicineId || !quantity || !unitCost) {
      toast.error("Please fill all item fields")
      return
    }

    const med = medicines.find(m => m.id === selectedMedicineId)
    if (!med) return

    if (selectedItems.find(i => i.medicineId === selectedMedicineId)) {
      toast.error("Medicine already added")
      return
    }

    setSelectedItems([
      ...selectedItems,
      {
        medicineId: med.id,
        medicineName: med.name,
        medicineStrength: med.strength,
        medicineGeneric: med.genericName,
        quantity: parseInt(quantity),
        unitCost: parseFloat(unitCost)
      }
    ])

    setSelectedMedicineId("")
    setQuantity("")
    setUnitCost("")
  }

  const handleRemoveItem = (medicineId: string) => {
    setSelectedItems(selectedItems.filter(i => i.medicineId !== medicineId))
  }

  const handleSubmit = async () => {
    if (!supplierId) {
      toast.error("Please select a supplier")
      return
    }
    if (selectedItems.length === 0) {
      toast.error("Please add at least one item")
      return
    }

    setIsSubmitting(true)
    const data = {
      supplierId,
      expectedDate: expectedDate ? new Date(expectedDate) : undefined,
      notes,
      items: selectedItems.map(i => ({
        medicineId: i.medicineId,
        quantity: i.quantity,
        unitCost: i.unitCost
      }))
    }

    let result
    if (poToEdit) {
      result = await updatePurchaseOrder(poToEdit.id, data)
    } else {
      result = await createPurchaseOrder(data)
    }

    if (result.success) {
      toast.success(`Purchase order ${poToEdit ? "updated" : "created"} successfully`)
      router.push("/dashboard/pharmacy/purchase-orders")
    } else {
      toast.error(result.message || "Something went wrong")
    }
    setIsSubmitting(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.push("/dashboard/pharmacy/purchase-orders")}
          className="rounded-full h-10 w-10 text-slate-500 hover:text-slate-900 bg-white shadow-sm"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold text-slate-800">
          {poToEdit ? "Edit Purchase Order" : "New Purchase Order"}
        </h1>
      </div>

      <Card className="border-0 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
        <CardContent className="p-6 space-y-8">
          {/* Supplier & Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="bg-slate-50/50 border-slate-200 h-11 rounded-xl">
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expected Date</Label>
              <Input 
                type="date" 
                value={expectedDate}
                onChange={e => setExpectedDate(e.target.value)}
                className="bg-slate-50/50 border-slate-200 h-11 rounded-xl"
              />
            </div>
            <div className="col-span-1 md:col-span-2 space-y-2">
              <Label>Notes</Label>
              <Input 
                placeholder="Additional instructions..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="bg-slate-50/50 border-slate-200 h-11 rounded-xl"
              />
            </div>
          </div>

          {/* Add Items Section */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-5">
            <div className="font-semibold text-slate-800">Add Items</div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-4 space-y-2">
                <Label className="text-sm">Medicine</Label>
                <Popover open={medOpen} onOpenChange={setMedOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={medOpen}
                      className="w-full justify-between bg-white text-left font-normal h-11 px-4 rounded-xl border-slate-200"
                    >
                      <span className="truncate">
                        {selectedMedicineId
                          ? (() => {
                              const m = medicines.find(med => med.id === selectedMedicineId)
                              return m ? m.name : "Search medicine..."
                            })()
                          : "Search medicine..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 z-[100]" align="start">
                    <Command>
                      <CommandInput placeholder="Search medicine name or generic name..." />
                      <CommandList>
                        <CommandEmpty>No medicine found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-auto">
                          {medicines.map((med) => (
                            <CommandItem
                              key={med.id}
                              value={`${med.name} ${med.genericName} ${med.strength}`}
                              onSelect={() => {
                                setSelectedMedicineId(med.id)
                                setMedOpen(false)
                              }}
                              className="py-2"
                            >
                              <Check
                                className={cn(
                                  "mr-3 h-4 w-4 shrink-0",
                                  selectedMedicineId === med.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col overflow-hidden">
                                <span className="font-medium text-slate-700 truncate">
                                  {med.name} {med.strength && <span className="text-slate-400 font-normal">({med.strength})</span>}
                                </span>
                                {med.genericName && (
                                  <span className="text-xs text-slate-500 truncate mt-0.5">
                                    {med.genericName}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm">Strength</Label>
                <Input 
                  readOnly
                  value={selectedMedicineId ? (medicines.find(m => m.id === selectedMedicineId)?.strength || "-") : ""}
                  className="bg-slate-50/50 text-slate-500 h-11 rounded-xl border-slate-200"
                  placeholder="-"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm">Quantity (Units)</Label>
                <Input 
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  className="bg-white h-11 rounded-xl border-slate-200"
                  placeholder="e.g. 100"
                />
              </div>
              <div className="md:col-span-3 space-y-2">
                <Label className="text-sm">Unit Cost (₹)</Label>
                <Input 
                  type="number"
                  value={unitCost}
                  onChange={e => setUnitCost(e.target.value)}
                  className="bg-white h-11 rounded-xl border-slate-200"
                  placeholder="e.g. 5.50"
                />
              </div>
              <div className="md:col-span-1">
                <Button onClick={handleAddItem} variant="outline" className="w-full h-11 rounded-xl text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {selectedItems.length > 0 && (
              <div className="mt-6 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50 border-b border-slate-100">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-600">Medicine Details</TableHead>
                      <TableHead className="font-semibold text-slate-600">Qty</TableHead>
                      <TableHead className="font-semibold text-slate-600">Cost/Unit</TableHead>
                      <TableHead className="font-semibold text-slate-600">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedItems.map(item => (
                      <TableRow key={item.medicineId} className="border-slate-100 hover:bg-slate-50/50">
                        <TableCell>
                          <div className="font-medium text-slate-800">
                            {item.medicineName} {item.medicineStrength && <span className="text-slate-500 font-normal">({item.medicineStrength})</span>}
                          </div>
                          {item.medicineGeneric && (
                            <div className="text-xs text-slate-500 mt-1">{item.medicineGeneric}</div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-slate-700">{item.quantity}</TableCell>
                        <TableCell className="text-slate-600">₹{item.unitCost}</TableCell>
                        <TableCell className="font-semibold text-slate-700">₹{(item.quantity * item.unitCost).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleRemoveItem(item.medicineId)}
                            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 h-8 w-8 p-0 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50/80">
                      <TableCell colSpan={3} className="text-right font-semibold text-slate-700">Grand Total:</TableCell>
                      <TableCell colSpan={2} className="font-bold text-lg text-indigo-700">
                        ₹{selectedItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitCost), 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => router.push("/dashboard/pharmacy/purchase-orders")}
            className="rounded-xl h-11 px-6 border-slate-200"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || isLoading}
            className="rounded-xl h-11 px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {poToEdit ? "Update PO" : "Create PO"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
