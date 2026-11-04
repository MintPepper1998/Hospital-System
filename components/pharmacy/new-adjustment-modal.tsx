"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { searchInventoryBatches, createStockAdjustment, updateStockAdjustment } from "@/app/actions/stock-adjustment"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Loader2, Trash2, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface NewAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  adjustmentToEdit?: any | null
}

export function NewAdjustmentModal({ isOpen, onClose, adjustmentToEdit }: NewAdjustmentModalProps) {
  const [reason, setReason] = useState<string>("")
  const [notes, setNotes] = useState("")
  
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (adjustmentToEdit) {
        setReason(adjustmentToEdit.reason)
        setNotes(adjustmentToEdit.notes || "")
        setSelectedItems(adjustmentToEdit.items.map((i: any) => ({
          inventoryBatchId: i.inventoryBatchId,
          medicineId: i.medicineId,
          medicineName: i.inventoryBatch?.medicine?.name || "Unknown",
          batchNumber: i.inventoryBatch?.batchNumber || "Unknown",
          currentStock: i.inventoryBatch?.quantity || 0,
          unitCost: i.unitCost,
          quantityChange: i.quantityChange,
        })))
      } else {
        setReason("")
        setNotes("")
        setSelectedItems([])
        setSearchQuery("")
        setSearchResults([])
      }
    }
  }, [isOpen, adjustmentToEdit])

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    const result = await searchInventoryBatches(query)
    if (result.success) {
      setSearchResults(result.data)
    }
    setIsSearching(false)
  }

  const handleAddItem = (batch: any) => {
    if (selectedItems.some(item => item.inventoryBatchId === batch.id)) {
      toast.error("Batch already added")
      return
    }

    setSelectedItems(prev => [
      ...prev,
      {
        inventoryBatchId: batch.id,
        medicineId: batch.medicineId,
        medicineName: batch.medicine.name,
        batchNumber: batch.batchNumber,
        currentStock: batch.quantity,
        unitCost: batch.purchasePrice,
        quantityChange: 0,
      }
    ])
    setSearchQuery("")
    setSearchResults([])
  }

  const handleRemoveItem = (batchId: string) => {
    setSelectedItems(prev => prev.filter(item => item.inventoryBatchId !== batchId))
  }

  const handleUpdateChange = (batchId: string, change: string) => {
    const numChange = parseInt(change) || 0
    setSelectedItems(prev => prev.map(item => {
      if (item.inventoryBatchId === batchId) {
        return { ...item, quantityChange: numChange }
      }
      return item
    }))
  }

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Please select an adjustment reason")
      return
    }
    if (selectedItems.length === 0) {
      toast.error("Please add at least one item to adjust")
      return
    }
    
    // Validation
    for (const item of selectedItems) {
      if (item.quantityChange === 0) {
        toast.error(`Please specify a quantity change for ${item.medicineName}`)
        return
      }
      if (item.currentStock + item.quantityChange < 0) {
        toast.error(`Cannot reduce ${item.medicineName} below 0`)
        return
      }
    }

    setIsSubmitting(true)
    const payload = {
      reason,
      notes,
      items: selectedItems.map(item => ({
        inventoryBatchId: item.inventoryBatchId,
        medicineId: item.medicineId,
        quantityChange: item.quantityChange,
        unitCost: item.unitCost
      }))
    }

    let result
    if (adjustmentToEdit) {
      result = await updateStockAdjustment(adjustmentToEdit.id, payload)
    } else {
      result = await createStockAdjustment(payload)
    }

    if (result.success) {
      toast.success("Adjustment saved successfully")
      onClose()
      // Reset form
      setReason("")
      setNotes("")
      setSelectedItems([])
    } else {
      toast.error(result.message || "Failed to save adjustment")
    }
    setIsSubmitting(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {adjustmentToEdit ? "Edit Stock Adjustment" : "New Stock Adjustment"}
          </DialogTitle>
          <DialogDescription>
            Record damaged, expired, or lost stock manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reason for Adjustment</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="border-slate-200 bg-white/50 h-10 rounded-xl">
                  <SelectValue placeholder="Select Reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EXPIRED">Expired Stock</SelectItem>
                  <SelectItem value="DAMAGED">Damaged/Broken</SelectItem>
                  <SelectItem value="AUDIT">Audit Reconciliation</SelectItem>
                  <SelectItem value="LOST">Lost/Theft</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Additional Notes</Label>
              <Input 
                placeholder="Optional explanation..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="border-slate-200 bg-white/50 h-10 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2 relative">
            <Label>Search & Add Items</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search by medicine name or batch number..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-9 h-11 border-slate-200 bg-white/50 focus-visible:ring-indigo-500 rounded-xl"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
              )}
            </div>

            {/* Search Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                {searchResults.map((batch) => (
                  <div 
                    key={batch.id}
                    onClick={() => handleAddItem(batch)}
                    className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0 transition-colors"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{batch.medicine.name}</div>
                      <div className="text-xs text-slate-500 flex gap-2">
                        <span>Batch: {batch.batchNumber}</span>
                        <span>•</span>
                        <span>Stock: {batch.quantity}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-indigo-600 rounded-lg">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow>
                    <TableHead>Medicine</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Change (+/-)</TableHead>
                    <TableHead>Final</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedItems.map((item) => (
                    <TableRow key={item.inventoryBatchId}>
                      <TableCell>
                        <div className="font-medium text-slate-700">{item.medicineName}</div>
                        <div className="text-xs text-slate-400">{item.batchNumber}</div>
                      </TableCell>
                      <TableCell className="text-slate-600">{item.currentStock}</TableCell>
                      <TableCell>
                        <Input 
                          type="number"
                          value={item.quantityChange || ""}
                          onChange={e => handleUpdateChange(item.inventoryBatchId, e.target.value)}
                          className="w-24 h-9 border-slate-200"
                          placeholder="-5 or +2"
                        />
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${item.currentStock + item.quantityChange < 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                          {item.currentStock + (item.quantityChange || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleRemoveItem(item.inventoryBatchId)}
                          className="text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
            ) : (
              "Save Adjustment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
