"use client"

import { useState, useTransition, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Plus, Trash2, Save, Loader2, User, FlaskConical, Pill, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { createSmartInvoice } from "@/lib/actions"
import { useRouter } from "next/navigation"

interface Patient {
  id: string
  patientId: string
  user: {
    name: string | null
  }
}

interface LabTest {
  id: string
  name: string
  code: string
  price: number
  category: string | null
}

interface Medicine {
  id: string
  name: string
  manufacturer: string | null
  inventoryBatches: Array<{
    id: string
    batchNumber: string
    expiryDate: Date
    quantity: number
    sellingPrice: number
  }>
}

interface BillItem {
  id: string
  type: 'LAB_TEST' | 'MEDICINE' | 'OTHER'
  description: string
  quantity: number
  unitPrice: number
  total: number
  labRequestId?: string // For pending lab tests
  labTestCatalogId?: string // For manual lab test entry
  medicineId?: string
  batchId?: string
}

interface PendingOrder {
  labRequests: Array<{
    id: string
    testName: string
    testPrice: number
    status: string
  }>
  prescriptions: Array<{
    id: string
    prescription: string
    appointmentDate: Date
  }>
}

interface SmartBillingClientProps {
  patients: Patient[]
  labTests: LabTest[]
  medicines: Medicine[]
}

export function SmartBillingClient({ patients, labTests, medicines }: SmartBillingClientProps) {
  const [selectedPatientId, setSelectedPatientId] = useState<string>("")
  const [referredBy, setReferredBy] = useState<string>("self") // "self" or doctor ID
  const [pendingOrders, setPendingOrders] = useState<PendingOrder | null>(null)
  const [loadingPending, setLoadingPending] = useState(false)
  const [items, setItems] = useState<BillItem[]>([])
  const [discount, setDiscount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH")
  const [isPending, startTransition] = useTransition()
  const [labTestSearch, setLabTestSearch] = useState("")
  const [medicineSearch, setMedicineSearch] = useState("")
  const router = useRouter()

  // Fetch pending orders when patient is selected
  useEffect(() => {
    if (selectedPatientId) {
      fetchPendingOrders(selectedPatientId)
    } else {
      setPendingOrders(null)
      setItems([])
    }
  }, [selectedPatientId])

  const fetchPendingOrders = async (patientId: string) => {
    setLoadingPending(true)
    try {
      const response = await fetch(`/api/billing/pending-orders?patientId=${patientId}`)
      const data = await response.json()
      
      console.log("🔥 DEBUG: Fetched pending orders:", data)
      
      setPendingOrders(data)
      
      // Auto-add pending lab tests to bill
      if (data.labRequests && data.labRequests.length > 0) {
        const labItems: BillItem[] = data.labRequests.map((req: any) => ({
          id: Math.random().toString(),
          type: 'LAB_TEST' as const,
          description: `Lab Test: ${req.testName}`,
          quantity: 1,
          unitPrice: req.testPrice,
          total: req.testPrice,
          labRequestId: req.id,
        }))
        
        setItems(labItems)
        toast.success(`Added ${labItems.length} pending lab test(s) to invoice`)
      }
    } catch (error) {
      console.error("Failed to fetch pending orders:", error)
      toast.error("Failed to load pending orders")
    } finally {
      setLoadingPending(false)
    }
  }

  // Add manual lab test
  const addLabTest = (test: LabTest) => {
    const newItem: BillItem = {
      id: Math.random().toString(),
      type: 'LAB_TEST',
      description: `Lab Test: ${test.name}`,
      quantity: 1,
      unitPrice: test.price,
      total: test.price,
      labTestCatalogId: test.id,
    }
    setItems([...items, newItem])
    toast.success(`Added ${test.name}`)
  }

  // Add medicine
  const addMedicine = (medicine: Medicine, batch: any) => {
    const pricePerUnit = batch.sellingPrice
    const newItem: BillItem = {
      id: Math.random().toString(),
      type: 'MEDICINE',
      description: `${medicine.name} (Batch: ${batch.batchNumber})`,
      quantity: 1,
      unitPrice: pricePerUnit,
      total: pricePerUnit,
      medicineId: medicine.id,
      batchId: batch.id,
    }
    setItems([...items, newItem])
    toast.success(`Added ${medicine.name}`)
  }

  // Add custom item
  const addCustomItem = () => {
    const newItem: BillItem = {
      id: Math.random().toString(),
      type: 'OTHER',
      description: "",
      quantity: 1,
      unitPrice: 0,
      total: 0,
    }
    setItems([...items, newItem])
  }

  // Update item
  const updateItem = (id: string, field: keyof BillItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice
        }
        return updated
      }
      return item
    }))
  }

  // Remove item
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id))
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0)
  const discountAmount = (subtotal * discount) / 100
  // GST only on medicines, not lab tests or services
  const medicineSubtotal = items
    .filter(item => item.type === 'MEDICINE')
    .reduce((sum, item) => sum + item.total, 0)
  const taxAmount = medicineSubtotal * 0.18 // 18% GST on medicines only
  const grandTotal = subtotal - discountAmount + taxAmount

  // Submit invoice
  const handleSubmit = () => {
    if (!selectedPatientId) {
      toast.error("Please select a patient")
      return
    }

    if (items.length === 0) {
      toast.error("Please add at least one item")
      return
    }

    const invalidItems = items.filter(item => !item.description.trim() || item.unitPrice <= 0)
    if (invalidItems.length > 0) {
      toast.error("Please fill in all item details")
      return
    }

    console.log("🔥 DEBUG: Submitting invoice with items:", items)

      startTransition(async () => {
      const result = await createSmartInvoice({
        patientId: selectedPatientId,
        referredBy: referredBy === "self" ? null : referredBy,
        items: items.map(item => ({
          type: item.type,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          labRequestId: item.labRequestId,
          labTestCatalogId: item.labTestCatalogId,
          medicineId: item.medicineId,
          batchId: item.batchId,
        })),
        discount,
        paymentMethod,
      })

      if (result.success) {
        toast.success("Invoice generated successfully!")
        router.push(`/dashboard/finance/billing/${result.billingId}`)
      } else {
        toast.error(result.message || "Failed to generate invoice")
      }
    })
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId)
  
  // Filter lab tests based on search
  const filteredLabTests = labTests.filter(test =>
    test.name.toLowerCase().includes(labTestSearch.toLowerCase()) ||
    test.code.toLowerCase().includes(labTestSearch.toLowerCase()) ||
    test.category?.toLowerCase().includes(labTestSearch.toLowerCase())
  )
  
  // Filter medicines based on search
  const filteredMedicines = medicines.filter(med =>
    med.name.toLowerCase().includes(medicineSearch.toLowerCase()) ||
    med.manufacturer?.toLowerCase().includes(medicineSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Patient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#0066CC]" />
            Select Patient
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="patient">Patient</Label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger id="patient">
                  <SelectValue placeholder="Search and select patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.user.name} - {patient.patientId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingPending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading pending orders...
              </div>
            )}

            {pendingOrders && !loadingPending && (pendingOrders.labRequests?.length > 0 || pendingOrders.prescriptions?.length > 0) && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Pending Orders Detected
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  {pendingOrders.labRequests?.length > 0 && (
                    <li>✓ {pendingOrders.labRequests.length} pending lab test(s) - Auto-added to invoice</li>
                  )}
                  {pendingOrders.prescriptions?.length > 0 && (
                    <li>✓ {pendingOrders.prescriptions.length} unbilled prescription(s)</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Referred By / Doctor (Optional) */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-purple-600" />
              Referred By (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="referredBy">Doctor / Referral</Label>
              <Select value={referredBy} onValueChange={setReferredBy}>
                <SelectTrigger id="referredBy">
                  <SelectValue placeholder="Select referring doctor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">
                    <span className="font-medium">Self / Walk-in (No Referral)</span>
                  </SelectItem>
                  <SelectItem value="external">
                    <span className="font-medium">External Doctor</span>
                  </SelectItem>
                  {/* TODO: Add actual doctors from database */}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave as "Self / Walk-in" for direct lab billing without prescription
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Lab Tests & Medicines */}
      {selectedPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-600" />
              Add Tests & Medicines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Lab Tests Search */}
              <div className="space-y-3">
                <Label htmlFor="labTestSearch" className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-purple-600" />
                  Search Lab Tests
                </Label>
                <Input
                  id="labTestSearch"
                  placeholder="Search by test name, code, or category..."
                  value={labTestSearch}
                  onChange={(e) => setLabTestSearch(e.target.value)}
                  className="mb-2"
                />
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {labTestSearch && filteredLabTests.length > 0 ? (
                    <div className="divide-y">
                      {filteredLabTests.slice(0, 10).map((test) => (
                        <button
                          key={test.id}
                          onClick={() => {
                            addLabTest(test)
                            setLabTestSearch("")
                          }}
                          className="w-full text-left p-3 hover:bg-accent transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{test.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {test.code} {test.category && `• ${test.category}`}
                              </p>
                            </div>
                            <Badge variant="secondary" className="ml-2">
                              ₹{test.price}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : labTestSearch ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No tests found matching "{labTestSearch}"
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Type to search for lab tests...
                    </div>
                  )}
                </div>
              </div>

              {/* Medicines Search */}
              <div className="space-y-3">
                <Label htmlFor="medicineSearch" className="flex items-center gap-2">
                  <Pill className="h-4 w-4 text-green-600" />
                  Search Medicines
                </Label>
                <Input
                  id="medicineSearch"
                  placeholder="Search by medicine name or manufacturer..."
                  value={medicineSearch}
                  onChange={(e) => setMedicineSearch(e.target.value)}
                  className="mb-2"
                />
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {medicineSearch && filteredMedicines.length > 0 ? (
                    <div className="divide-y">
                      {filteredMedicines.slice(0, 10).map((medicine) => (
                        <div key={medicine.id} className="p-3">
                          <p className="font-medium text-sm mb-2">{medicine.name}</p>
                          {medicine.inventoryBatches && medicine.inventoryBatches.length > 0 ? (
                            <div className="space-y-1">
                              {medicine.inventoryBatches.slice(0, 3).map((batch: any) => (
                                <button
                                  key={batch.id}
                                  onClick={() => {
                                    addMedicine(medicine, batch)
                                    setMedicineSearch("")
                                  }}
                                  className="w-full text-left p-2 text-xs bg-muted hover:bg-accent rounded transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <span>Batch: {batch.batchNumber} • Stock: {batch.quantity}</span>
                                    <Badge variant="outline" className="ml-2">
                                      ₹{batch.sellingPrice}
                                    </Badge>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-red-600">No stock available</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : medicineSearch ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No medicines found matching "{medicineSearch}"
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Type to search for medicines...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bill Items */}
      {selectedPatient && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Invoice Items</span>
                <div className="flex gap-2">
                  <Button onClick={addCustomItem} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Custom Item
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[5%]">Type</TableHead>
                      <TableHead className="w-[40%]">Description</TableHead>
                      <TableHead className="w-[15%] text-center">Quantity</TableHead>
                      <TableHead className="w-[15%] text-right">Unit Price (₹)</TableHead>
                      <TableHead className="w-[15%] text-right">Total (₹)</TableHead>
                      <TableHead className="w-[10%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge
                            variant={item.type === 'LAB_TEST' ? 'default' : item.type === 'MEDICINE' ? 'secondary' : 'outline'}
                            className={item.type === 'LAB_TEST' ? 'bg-purple-600' : item.type === 'MEDICINE' ? 'bg-green-600' : ''}
                          >
                            {item.type === 'LAB_TEST' ? <FlaskConical className="h-3 w-3" /> : item.type === 'MEDICINE' ? <Pill className="h-3 w-3" /> : 'Other'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            disabled={!!item.labRequestId || !!item.labTestCatalogId}
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                            className="h-9 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            disabled={!!item.labRequestId || !!item.labTestCatalogId}
                            className="h-9 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{item.total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            onClick={() => removeItem(item.id)}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No items added. Select a patient to see pending orders or add items manually.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              {items.length > 0 && (
                <div className="mt-6 space-y-2">
                  <Separator />
                  <div className="flex justify-end gap-8 text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end gap-8 text-sm items-center">
                    <Label htmlFor="discount" className="text-muted-foreground">Discount (%):</Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-24 h-8 text-right"
                    />
                    <span className="font-medium text-red-600">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-end gap-8 text-sm">
                    <span className="text-muted-foreground">GST on Medicines (18%):</span>
                    <span className="font-medium">₹{taxAmount.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-end gap-8 text-lg font-bold">
                    <span>Grand Total:</span>
                    <span className="text-[#0066CC]">₹{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="paymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="UPI">UPI / QR Code</SelectItem>
                      <SelectItem value="CARD">Card (Debit/Credit)</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                      <SelectItem value="INSURANCE">Private Insurance / TPA</SelectItem>
                      <SelectItem value="BSKY">BSKY (Government)</SelectItem>
                      <SelectItem value="CREDIT">Credit (Pay Later)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={isPending || items.length === 0}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating Invoice...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-5 w-5" />
                      Generate Invoice & Print
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
