"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { generateInvoice } from "@/lib/actions"
import { useRouter } from "next/navigation"

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  labRequestId?: string // Link to lab request (if this is a lab test)
}

interface InvoiceEditorProps {
  appointmentId: string
  patientId: string
  initialItems: InvoiceItem[]
}

export function InvoiceEditor({
  appointmentId,
  patientId,
  initialItems,
}: InvoiceEditorProps) {
  const [items, setItems] = useState<InvoiceItem[]>(initialItems)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Add new empty item
  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, labRequestId: undefined }])
  }

  // Remove item
  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
  }

  // Update item field
  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  // Calculate totals
  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item.quantity, item.unitPrice), 0)
  }

  const calculateGST = () => {
    return calculateSubtotal() * 0.18 // 18% GST
  }

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateGST()
  }

  // Handle form submission
  const handleSubmit = () => {
    // Validate items
    if (items.length === 0) {
      toast.error("Please add at least one item")
      return
    }

    const emptyItems = items.filter((item) => !item.description.trim())
    if (emptyItems.length > 0) {
      toast.error("Please fill in all item descriptions")
      return
    }

    const invalidPrices = items.filter((item) => item.unitPrice <= 0)
    if (invalidPrices.length > 0) {
      toast.error("Please set prices for all items")
      return
    }

    // Extract lab request IDs from items
    const labRequestIds = items
      .filter(item => item.labRequestId)
      .map(item => item.labRequestId!)

    startTransition(async () => {
      const result = await generateInvoice(appointmentId, patientId, items, labRequestIds)

      if (result.success) {
        toast.success("Invoice generated successfully!")
        if (labRequestIds.length > 0) {
          toast.success(`${labRequestIds.length} lab test(s) marked as PAID - Ready for sample collection`)
        }
        // Redirect to pharmacy POS or billing list
        router.push("/dashboard/pharmacy/pos")
        router.refresh()
      } else {
        toast.error(result.message || "Failed to generate invoice")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Invoice Items</span>
          <Button
            onClick={addItem}
            variant="outline"
            size="sm"
            className="text-[#0066CC]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50%]">Description</TableHead>
                <TableHead className="w-[15%] text-center">Quantity</TableHead>
                <TableHead className="w-[15%] text-right">Unit Price (₹)</TableHead>
                <TableHead className="w-[15%] text-right">Total (₹)</TableHead>
                <TableHead className="w-[5%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder="Item description"
                      className="h-9"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseInt(e.target.value) || 1)}
                      className="h-9 text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="h-9 text-right"
                      placeholder="0.00"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{calculateItemTotal(item.quantity, item.unitPrice).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      onClick={() => removeItem(index)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No items added. Click "Add Item" to start building the invoice.
                  </TableCell>
                </TableRow>
              )}

              {/* Totals Section */}
              {items.length > 0 && (
                <>
                  {/* Subtotal Row */}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={3} className="text-right font-medium">
                      Subtotal:
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{calculateSubtotal().toFixed(2)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {/* GST Row */}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right text-muted-foreground">
                      GST (18%):
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ₹{calculateGST().toFixed(2)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {/* Grand Total Row */}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell colSpan={3} className="text-right">
                      Grand Total:
                    </TableCell>
                    <TableCell className="text-right text-lg text-[#0066CC]">
                      ₹{calculateGrandTotal().toFixed(2)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          <p>{items.length} item{items.length !== 1 ? "s" : ""}</p>
          <p className="mt-1">
            Subtotal: ₹{calculateSubtotal().toFixed(2)} + GST: ₹{calculateGST().toFixed(2)} = <span className="font-semibold text-[#0066CC]">₹{calculateGrandTotal().toFixed(2)}</span>
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isPending || items.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Generate Invoice
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
