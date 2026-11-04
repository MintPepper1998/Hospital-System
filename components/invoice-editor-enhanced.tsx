"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trash2, Save, Loader2, FlaskConical, Search } from "lucide-react"
import { toast } from "sonner"
import { generateInvoiceWithAutoCreate } from "@/lib/actions"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  labRequestId?: string // Link to existing lab request
  labTestCatalogId?: string // Link to lab test catalog (for manual entry)
  itemType?: 'CONSULTATION' | 'LAB_TEST' | 'MEDICINE' | 'OTHER'
}

interface LabTest {
  id: string
  name: string
  code: string
  price: number
  category: string
}

interface InvoiceEditorEnhancedProps {
  appointmentId: string
  patientId: string
  doctorId: string
  initialItems: InvoiceItem[]
  labTests: LabTest[]
}

export function InvoiceEditorEnhanced({
  appointmentId,
  patientId,
  doctorId,
  initialItems,
  labTests,
}: InvoiceEditorEnhancedProps) {
  const [items, setItems] = useState<InvoiceItem[]>(initialItems)
  const [isPending, startTransition] = useTransition()
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300)
  const [showLabTestDialog, setShowLabTestDialog] = useState(false)
  const router = useRouter()

  // Filter lab tests by search term
  const filteredLabTests = labTests.filter(test =>
    test.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    test.code.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    test.category.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  )

  // Add lab test to invoice
  const addLabTest = (test: LabTest) => {
    const newItem: InvoiceItem = {
      description: `Lab Test: ${test.name}`,
      quantity: 1,
      unitPrice: test.price,
      labTestCatalogId: test.id,
      itemType: 'LAB_TEST',
    }
    setItems([...items, newItem])
    setShowLabTestDialog(false)
    setSearchTerm("")
    toast.success(`Added ${test.name} to invoice`)
  }

  // Add new empty item (medicine/other)
  const addItem = () => {
    setItems([...items, { 
      description: "", 
      quantity: 1, 
      unitPrice: 0, 
      itemType: 'MEDICINE' 
    }])
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

    // Extract lab request IDs from existing pending tests
    const labRequestIds = items
      .filter(item => item.labRequestId)
      .map(item => item.labRequestId!)

    // Extract new lab tests to create
    const newLabTests = items
      .filter(item => item.labTestCatalogId && !item.labRequestId)
      .map(item => ({
        testCatalogId: item.labTestCatalogId!,
        testName: item.description.replace('Lab Test: ', ''),
        testPrice: item.unitPrice,
      }))

    // Debug logging
    console.log("=== INVOICE SUBMISSION DEBUG ===")
    console.log("Total items:", items.length)
    console.log("Existing lab request IDs:", labRequestIds)
    console.log("New lab tests to create:", newLabTests)
    console.log("Items with labTestCatalogId:", items.filter(item => item.labTestCatalogId))

    startTransition(async () => {
      const result = await generateInvoiceWithAutoCreate(
        appointmentId,
        patientId,
        doctorId,
        items,
        labRequestIds,
        newLabTests
      )

      if (result.success) {
        toast.success("Invoice generated successfully!")
        if (labRequestIds.length > 0 || newLabTests.length > 0) {
          const totalLabs = labRequestIds.length + newLabTests.length
          toast.success(`${totalLabs} lab test(s) marked as PAID - Ready for sample collection`)
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
          <div className="flex gap-2">
            <Dialog open={showLabTestDialog} onOpenChange={setShowLabTestDialog}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-purple-600 border-purple-600"
                >
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Add Lab Test
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Add Lab Test to Invoice</DialogTitle>
                  <DialogDescription>
                    Search and select lab tests for paper prescription billing
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by test name, code, or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                  </div>

                  {/* Test List */}
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {filteredLabTests.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">
                        No tests found matching "{searchTerm}"
                      </p>
                    ) : (
                      filteredLabTests.map((test) => (
                        <div
                          key={test.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => addLabTest(test)}
                        >
                          <div className="flex-1">
                            <p className="font-medium">{test.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {test.code} • {test.category}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">₹{test.price.toFixed(2)}</Badge>
                            <Button size="sm" variant="ghost">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              onClick={addItem}
              variant="outline"
              size="sm"
              className="text-[#0066CC]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Medicine
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[45%]">Description</TableHead>
                <TableHead className="w-[10%]">Type</TableHead>
                <TableHead className="w-[10%] text-center">Quantity</TableHead>
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
                      disabled={!!item.labRequestId || !!item.labTestCatalogId}
                    />
                  </TableCell>
                  <TableCell>
                    {item.itemType === 'LAB_TEST' ? (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                        Lab
                      </Badge>
                    ) : item.itemType === 'CONSULTATION' ? (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        OPD
                      </Badge>
                    ) : (
                      <Badge variant="outline">Med</Badge>
                    )}
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
                      disabled={!!item.labRequestId || !!item.labTestCatalogId}
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No items added. Click "Add Lab Test" or "Add Medicine" to start building the invoice.
                  </TableCell>
                </TableRow>
              )}

              {/* Totals Section */}
              {items.length > 0 && (
                <>
                  {/* Subtotal Row */}
                  <TableRow className="border-t-2">
                    <TableCell colSpan={4} className="text-right font-medium">
                      Subtotal:
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{calculateSubtotal().toFixed(2)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {/* GST Row */}
                  <TableRow>
                    <TableCell colSpan={4} className="text-right text-muted-foreground">
                      GST (18%):
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      ₹{calculateGST().toFixed(2)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>

                  {/* Grand Total Row */}
                  <TableRow className="bg-muted/30 font-bold">
                    <TableCell colSpan={4} className="text-right">
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
