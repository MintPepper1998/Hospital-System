"use client"

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Search, Plus, Trash2, ShoppingCart, CreditCard, X, Printer, RefreshCw, CheckCircle, FileText, User, Phone, MapPin, UserPlus, IndianRupee, Loader2, PackagePlus, CalendarClock, AlertTriangle, Check, ChevronsUpDown } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { processPharmacySale } from "@/lib/actions"
import { searchPharmacyCustomers, createPharmacyCustomer } from "@/lib/actions/pharmacy-customers"
import { Label } from "@/components/ui/label"
import { PaymentModal } from "@/components/payment-modal"
import { MedicineBillTemplate } from "@/components/pharmacy/medicine-bill-template"
import type { HospitalSettingsData } from "@/app/actions/settings"
import type { PrintTemplateSettingsData } from "@/lib/print-template-types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

// ============================================
// INTERFACES (unchanged)
// ============================================

interface InventoryBatch {
  id: string
  batchNumber: string
  expiryDate: Date
  quantity: number
  purchasePrice: number
  sellingPrice: number
  medicinesPerStrip: number
  taxPercent: number
}

interface Medicine {
  id: string
  name: string
  manufacturer: string | null
  genericName: string | null
  strength: string | null
  type: string
  unitPrice: number
  category?: string | null
  hsnCode?: string | null
  noLooseSale?: boolean
  inventoryBatches: InventoryBatch[]
}

interface Patient {
  id: string
  patientId: string
  name: string
  phone: string | null
  email: string | null
}

interface CartItem {
  batchId: string
  medicineId: string
  medicineName: string
  batchNumber: string
  expiryDate: Date
  availableStock: number
  unitPrice: number
  hsnCode?: string | null
  noLooseSale?: boolean
  quantity: number // Units (tablets/bottles/etc)
  sellByStrip: boolean
  medicinesPerStrip: number
  taxRate: number // Editable (default 12%)
  subtotal: number
  taxAmount: number
  discountPercent: number
  discountAmount: number
  total: number
}

interface InitialCartItem {
  batchId: string
  medicineId: string
  medicineName: string
  batchNumber: string
  expiryDate: string
  availableStock: number
  unitPrice: number
  quantity: number
  taxRate: number
  subtotal: number
  taxAmount: number
  discountPercent: number
  discountAmount: number
  total: number
}

interface PendingLabTest {
  id: string
  testName: string
  testPrice: number
  priority: string
}

interface InitialData {
  patientId: string
  patientName: string
  patientCode?: string
  doctorName?: string
  appointmentId?: string
  cartItems: InitialCartItem[]
  prescribedMedicines?: Array<{
    name: string
    dosage: string | null
    frequency: string | null
    duration: string | null
    quantity: number
    instructions: string | null
  }>
  pendingLabTests?: PendingLabTest[]
}

interface PharmacyPOSClientProps {
  medicines: Medicine[]
  recentPatients: Patient[]
  initialData?: InitialData
  hospitalSettings?: HospitalSettingsData
  printSettings?: PrintTemplateSettingsData
}

// ============================================
// COMPONENT
// ============================================

export function PharmacyPOSClient({ medicines, recentPatients, initialData, hospitalSettings, printSettings }: PharmacyPOSClientProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350)
  const [selectedPatient, setSelectedPatient] = useState<string | null>(initialData?.patientId || null)
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Initialize cart from initialData if provided
    if (initialData?.cartItems && initialData.cartItems.length > 0) {
      return initialData.cartItems.map((item) => ({
        ...item,
        expiryDate: new Date(item.expiryDate),
        sellByStrip: false,
        medicinesPerStrip: 1
      }))
    }
    return []
  })
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [lastBillData, setLastBillData] = useState<any>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false)

  // Keyboard-first POS fast entry state and refs
  const topSearchInputRef = useRef<HTMLInputElement>(null)
  const [selectedTopOptionIndex, setSelectedTopOptionIndex] = useState(0)

  const newRowInputRef = useRef<HTMLInputElement>(null)
  const qtyInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const pendingFocusBatchId = useRef<string | null>(null)
  const [rowSearchTerm, setRowSearchTerm] = useState("")
  const [showRowResults, setShowRowResults] = useState(false)
  const [selectedRowOptionIndex, setSelectedRowOptionIndex] = useState(0)
  const dropdownListRef = useRef<HTMLDivElement>(null)

  // Lab tests state - initialized from props
  const [labTests, setLabTests] = useState<PendingLabTest[]>(
    initialData?.pendingLabTests || []
  )

  // Back-date billing state
  const [isBackDateEnabled, setIsBackDateEnabled] = useState(false)
  const [backDate, setBackDate] = useState<Date | undefined>(undefined)
  const [backTimeHour, setBackTimeHour] = useState("10")
  const [backTimeMinute, setBackTimeMinute] = useState("00")

  // Discount and Round Off state
  const [discountType, setDiscountType] = useState<"percent" | "amount">("percent")
  const [discountValue, setDiscountValue] = useState<string>("0")
  const [isRoundOff, setIsRoundOff] = useState<boolean>(true)

  // Customer mode: 'walkin' | 'patient' | 'pharmacy'
  const [customerMode, setCustomerMode] = useState<"walkin" | "patient" | "pharmacy">(initialData?.patientId ? "patient" : "walkin")
  
  // Pharmacy customer state
  const [pharmacyCustomer, setPharmacyCustomer] = useState<{ id: string; name: string; phone: string; address: string | null } | null>(null)
  const [customerSearchQuery, setCustomerSearchQuery] = useState("")
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([])
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState("")
  const [newCustomerPhone, setNewCustomerPhone] = useState("")
  const [newCustomerAddress, setNewCustomerAddress] = useState("")
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)

  // Show notification when cart is pre-populated from prescription
  useEffect(() => {
    if (!isInitialized && initialData) {
      setIsInitialized(true)
      const medicineCount = initialData.cartItems?.length || 0
      const labTestCount = initialData.pendingLabTests?.length || 0
      
      if (medicineCount > 0 || labTestCount > 0) {
        const parts = []
        if (medicineCount > 0) parts.push(`${medicineCount} medicine(s)`)
        if (labTestCount > 0) parts.push(`${labTestCount} lab test(s)`)
        
        toast.success(
          `Loaded ${parts.join(' and ')} for ${initialData.patientName}`,
          { duration: 5000 }
        )
      }
    }
  }, [initialData, isInitialized])

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Filter medicines based on search
  const filteredMedicines = useMemo(() => {
    if (!debouncedSearchTerm) return []

    const search = debouncedSearchTerm.trim().toLowerCase()
    return medicines.filter((med) => {
      return (
        med.name.toLowerCase().includes(search) ||
        med.genericName?.toLowerCase().includes(search) ||
        med.manufacturer?.toLowerCase().includes(search) ||
        med.category?.toLowerCase().includes(search) ||
        med.strength?.toLowerCase().includes(search)
      )
    })
  }, [debouncedSearchTerm, medicines])

  // Calculate cart totals (including lab tests)
  const cartTotals = useMemo(() => {
    const medicineSubtotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
    const medicineTax = cart.reduce((sum, item) => sum + item.taxAmount, 0)
    const medicineTotal = cart.reduce((sum, item) => sum + item.total, 0)
    const medicineItemDiscount = cart.reduce((sum, item) => sum + item.discountAmount, 0)
    
    // Lab tests (no tax on medical tests in India)
    const labTestsTotal = labTests.reduce((sum, test) => sum + test.testPrice, 0)
    
    const subtotal = medicineSubtotal + labTestsTotal
    const totalTax = medicineTax
    const baseTotal = medicineTotal + labTestsTotal

    // Calculate Bill-level Discount
    const dVal = parseFloat(discountValue) || 0
    let discountAmount = 0
    if (dVal > 0) {
      if (discountType === "percent") {
        discountAmount = (baseTotal * dVal) / 100
      } else {
        discountAmount = dVal
      }
    }

    let grandTotal = baseTotal - discountAmount
    let roundOff = 0
    
    // Calculate Round Off
    if (isRoundOff) {
      const roundedTotal = Math.round(grandTotal)
      roundOff = roundedTotal - grandTotal
      grandTotal = roundedTotal
    }

    return {
      subtotal,
      totalTax,
      discountAmount,
      medicineItemDiscount,
      roundOff,
      grandTotal,
      labTestsTotal
    }
  }, [cart, labTests, discountType, discountValue, isRoundOff])

  // Add item to cart
  const addToCart = (medicine: Medicine, batch: InventoryBatch, inputQuantity: number, sellByStrip?: boolean) => {
    // Auto-default to strip mode for noLooseSale medicines when strips are available
    const hasStrips = (batch.medicinesPerStrip || 1) > 1
    if (sellByStrip === undefined) {
      sellByStrip = (medicine.noLooseSale && hasStrips) ? true : false
    }
    const medicinesPerStrip = batch.medicinesPerStrip || 1
    const quantityInUnits = sellByStrip ? inputQuantity * medicinesPerStrip : inputQuantity

    if (quantityInUnits < 0 || quantityInUnits > batch.quantity) {
      toast.error(sellByStrip ? `Only ${Math.floor(batch.quantity / medicinesPerStrip)} strips available` : `Only ${batch.quantity} units available`)
      return
    }

    // Use batch selling price (MRP) per unit
    const unitPrice = batch.sellingPrice
    const taxRate = batch.taxPercent ?? 0 // Use batch GST rate (0% fallback for safety)

    const amount = unitPrice * quantityInUnits
    const discountPercent = 0
    const discountAmount = 0
    const total = amount - discountAmount
    const taxableAmount = total > 0 ? total / (1 + (taxRate / 100)) : 0
    const taxAmount = total - taxableAmount
    const subtotal = amount // Keeping subtotal as gross amount for compatibility

    const newItem: CartItem = {
      batchId: batch.id,
      medicineId: medicine.id,
      medicineName: `${medicine.name}${medicine.strength ? ` - ${medicine.strength}` : ''}`,
      hsnCode: medicine.hsnCode,
      noLooseSale: medicine.noLooseSale,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      availableStock: batch.quantity,
      unitPrice,
      quantity: quantityInUnits,
      sellByStrip,
      medicinesPerStrip,
      taxRate,
      subtotal,
      discountPercent,
      discountAmount,
      taxAmount,
      total,
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.findIndex((item) => item.batchId === batch.id)
    if (existingItemIndex > -1) {
      // Update quantity
      const updatedCart = [...cart]
      const updatedItem = updatedCart[existingItemIndex]
      updatedItem.quantity += quantityInUnits
      updatedItem.subtotal = updatedItem.unitPrice * updatedItem.quantity
      updatedItem.discountAmount = (updatedItem.subtotal * updatedItem.discountPercent) / 100
      updatedItem.total = updatedItem.subtotal - updatedItem.discountAmount
      const taxableAmount = updatedItem.total / (1 + (updatedItem.taxRate / 100))
      updatedItem.taxAmount = updatedItem.total - taxableAmount
      setCart(updatedCart)
    } else {
      setCart([...cart, newItem])
    }

    pendingFocusBatchId.current = batch.id
    toast.success(`Added ${medicine.name} to bill`)
    setSearchTerm("")
    setShowSearchResults(false)
  }

  // Top search flattened selectable in-stock batches
  const topSelectableBatches = useMemo(() => {
    if (!debouncedSearchTerm) return []
    const list: Array<{ medicine: Medicine; batch: InventoryBatch }> = []
    for (const med of filteredMedicines) {
      for (const batch of med.inventoryBatches) {
        if (batch.quantity > 0) {
          list.push({ medicine: med, batch })
        }
      }
    }
    return list
  }, [debouncedSearchTerm, filteredMedicines])

  // Top search keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleTopSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchResults || topSelectableBatches.length === 0) {
      if (e.key === "ArrowDown" && topSelectableBatches.length > 0) {
        e.preventDefault()
        setShowSearchResults(true)
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedTopOptionIndex((prev) => (prev + 1) % topSelectableBatches.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedTopOptionIndex((prev) => (prev - 1 + topSelectableBatches.length) % topSelectableBatches.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = topSelectableBatches[selectedTopOptionIndex] || topSelectableBatches[0]
      if (item) {
        addToCart(item.medicine, item.batch, 0)
        setSearchTerm("")
        setShowSearchResults(false)
        setSelectedTopOptionIndex(0)
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setShowSearchResults(false)
    }
  }

  // Row inline search: flattened selectable in-stock batches & out-of-stock items
  const { rowSelectableBatches, rowOutOfStockMedicines } = useMemo(() => {
    const term = rowSearchTerm.trim().toLowerCase()
    if (!term) return { rowSelectableBatches: [], rowOutOfStockMedicines: [] }

    const selectable: Array<{
      batchId: string
      medicine: Medicine
      batch: InventoryBatch
    }> = []
    const outOfStock: Medicine[] = []

    const matches = medicines.filter((med) => {
      return (
        med.name.toLowerCase().includes(term) ||
        med.genericName?.toLowerCase().includes(term) ||
        med.manufacturer?.toLowerCase().includes(term) ||
        med.category?.toLowerCase().includes(term) ||
        med.strength?.toLowerCase().includes(term)
      )
    })

    for (const med of matches) {
      const inStock = (med.inventoryBatches || []).filter((b) => b.quantity > 0)
      if (inStock.length > 0) {
        for (const batch of inStock) {
          selectable.push({ batchId: batch.id, medicine: med, batch })
        }
      } else {
        outOfStock.push(med)
      }
    }

    return { rowSelectableBatches: selectable, rowOutOfStockMedicines: outOfStock }
  }, [rowSearchTerm, medicines])

  // Select batch from inline row search and add to cart
  const handleSelectRowBatch = useCallback((medicine: Medicine, batch: InventoryBatch) => {
    addToCart(medicine, batch, 0)
    setRowSearchTerm("")
    setShowRowResults(false)
    setSelectedRowOptionIndex(0)
  }, [addToCart])

  // Inline row search keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  const handleRowSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!showRowResults) {
        setShowRowResults(true)
      } else if (rowSelectableBatches.length > 0) {
        setSelectedRowOptionIndex((prev) => (prev + 1) % rowSelectableBatches.length)
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (showRowResults && rowSelectableBatches.length > 0) {
        setSelectedRowOptionIndex((prev) => (prev - 1 + rowSelectableBatches.length) % rowSelectableBatches.length)
      }
    } else if (e.key === "Enter") {
      if (showRowResults && rowSelectableBatches.length > 0) {
        e.preventDefault()
        const selected = rowSelectableBatches[selectedRowOptionIndex] || rowSelectableBatches[0]
        if (selected) {
          handleSelectRowBatch(selected.medicine, selected.batch)
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setShowRowResults(false)
    }
  }

  // Ensure selected dropdown item stays in view
  useEffect(() => {
    if (showRowResults && dropdownListRef.current) {
      const selectedEl = dropdownListRef.current.querySelector(
        `[data-index="${selectedRowOptionIndex}"]`
      ) as HTMLElement | null
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" })
      }
    }
  }, [selectedRowOptionIndex, showRowResults])

  // Auto-focus into newly added item's Qty input with selection
  useEffect(() => {
    if (pendingFocusBatchId.current) {
      const targetBatchId = pendingFocusBatchId.current
      const timer = setTimeout(() => {
        const inputEl = qtyInputRefs.current[targetBatchId]
        if (inputEl) {
          inputEl.focus()
          inputEl.select()
          pendingFocusBatchId.current = null
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [cart])

  // Global F2 keyboard shortcut to jump directly to New Medicine row
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault()
        newRowInputRef.current?.focus()
        newRowInputRef.current?.select()
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown)
    return () => window.removeEventListener("keydown", handleGlobalKeyDown)
  }, [])

  // Update cart item quantity
  const updateCartItemQuantity = (batchId: string, inputQuantity: number) => {
    const updatedCart = cart.map((item) => {
      if (item.batchId === batchId) {
        if (inputQuantity < 0) return item
        const quantityInUnits = item.sellByStrip ? inputQuantity * item.medicinesPerStrip : inputQuantity

        if (quantityInUnits > item.availableStock) {
          toast.error(`Only ${item.sellByStrip ? Math.floor(item.availableStock / item.medicinesPerStrip) + " strips" : item.availableStock + " units"} available`)
          return item
        }

        const subtotal = item.unitPrice * quantityInUnits
        const discountAmount = (subtotal * item.discountPercent) / 100
        const total = subtotal - discountAmount
        const taxableAmount = total > 0 ? total / (1 + (item.taxRate / 100)) : 0
        const taxAmount = total - taxableAmount

        return {
          ...item,
          quantity: quantityInUnits,
          subtotal,
          discountAmount,
          taxAmount,
          total,
        }
      }
      return item
    })

    setCart(updatedCart)
  }

  // Toggle sell by strip/unit for a cart item
  const updateCartSellMode = (batchId: string, sellByStrip: boolean) => {
    const updatedCart = cart.map((item) => {
      if (item.batchId === batchId) {
        const mps = item.medicinesPerStrip || 1
        // Convert current quantity to new mode
        let newQtyInUnits = item.quantity
        if (sellByStrip && !item.sellByStrip) {
          // switching from unit to strip: keep same units
          newQtyInUnits = item.quantity
        } else if (!sellByStrip && item.sellByStrip) {
          // switching from strip to unit: keep same units
          newQtyInUnits = item.quantity
        }

        const subtotal = item.unitPrice * newQtyInUnits
        const discountAmount = (subtotal * item.discountPercent) / 100
        const total = subtotal - discountAmount
        const taxableAmount = total > 0 ? total / (1 + (item.taxRate / 100)) : 0
        const taxAmount = total - taxableAmount

        return {
          ...item,
          sellByStrip,
          quantity: newQtyInUnits,
          subtotal,
          discountAmount,
          taxAmount,
          total,
        }
      }
      return item
    })
    setCart(updatedCart)
  }

  // Update tax rate for a cart item
  const updateCartItemTaxRate = (batchId: string, newTaxRate: number) => {
    const updatedCart = cart.map((item) => {
      if (item.batchId === batchId) {
        const total = item.subtotal - item.discountAmount
        const taxableAmount = total / (1 + (newTaxRate / 100))
        const taxAmount = total - taxableAmount

        return {
          ...item,
          taxRate: newTaxRate,
          taxAmount,
          total,
        }
      }
      return item
    })

    setCart(updatedCart)
  }

  // Update discount for a cart item
  const updateCartItemDiscount = (batchId: string, newDiscountPercent: number) => {
    const updatedCart = cart.map((item) => {
      if (item.batchId === batchId) {
        const discountAmount = (item.subtotal * newDiscountPercent) / 100
        const total = item.subtotal - discountAmount
        const taxableAmount = total / (1 + (item.taxRate / 100))
        const taxAmount = total - taxableAmount

        return {
          ...item,
          discountPercent: newDiscountPercent,
          discountAmount,
          taxAmount,
          total,
        }
      }
      return item
    })

    setCart(updatedCart)
  }

  // Remove item from cart
  const removeFromCart = (batchId: string) => {
    setCart(cart.filter((item) => item.batchId !== batchId))
    toast.info("Item removed from bill")
  }

  // Clear cart
  const clearCart = () => {
    setCart([])
    setSelectedPatient(null)
    setPharmacyCustomer(null)
    setCustomerMode("walkin")
    setCustomerSearchQuery("")
    setShowNewCustomerForm(false)
    setIsBackDateEnabled(false)
    setBackDate(undefined)
    setBackTimeHour("10")
    setBackTimeMinute("00")
    toast.info("Cart cleared")
  }

  // Handle payment completion
  const handlePaymentComplete = async (paymentDetails: any) => {
    setIsProcessing(true)

    try {
      // Pass appointmentId and lab test IDs if this is a prescription dispense
      // Build back-date ISO string if enabled
      let backDateISO: string | null = null
      if (isBackDateEnabled && backDate) {
        const d = new Date(backDate)
        d.setHours(parseInt(backTimeHour) || 10, parseInt(backTimeMinute) || 0, 0, 0)
        backDateISO = d.toISOString()
      }

      const result = await processPharmacySale(
        customerMode === "patient" ? selectedPatient : null, 
        cart, 
        paymentDetails,
        initialData?.appointmentId || null,
        labTests.map(t => t.id), // Pass lab test IDs
        cartTotals.discountAmount,
        cartTotals.roundOff,
        customerMode === "pharmacy" ? pharmacyCustomer?.id || null : null,
        backDateISO
      )

      if (result.success) {
        // Combine medicine and lab test items for bill
        const medicineItems = cart.map(item => ({
          description: item.medicineName,
          hsnCode: item.hsnCode,
          batchNumber: item.batchNumber,
          expiryDate: item.expiryDate,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.subtotal,
          gstRate: item.taxRate,
          gstAmount: item.taxAmount,
          totalAmount: item.total,
        }))
        
        const labTestItems = labTests.map(test => ({
          description: `Lab Test: ${test.testName}`,
          batchNumber: "-",
          expiryDate: null,
          quantity: 1,
          unitPrice: test.testPrice,
          amount: test.testPrice,
          gstAmount: 0,
          totalAmount: test.testPrice,
        }))

        // Store bill data for printing
        const effectiveBillDate = (isBackDateEnabled && backDate)
          ? (() => { const d = new Date(backDate); d.setHours(parseInt(backTimeHour) || 10, parseInt(backTimeMinute) || 0, 0, 0); return d })()
          : new Date()
        setLastBillData({
          billNumber: result.billNumber,
          billingId: result.billingId,
          billDate: effectiveBillDate,
          isBackDated: isBackDateEnabled && !!backDate,
          patientName: result.patientName || initialData?.patientName || "Walk-In Customer",
          patientId: result.patientId,
          pharmacyCustomer: result.pharmacyCustomer || null,
          items: [...medicineItems, ...labTestItems],
          subtotal: cartTotals.subtotal,
          totalTax: cartTotals.totalTax,
          grandTotal: cartTotals.grandTotal,
          discountAmount: cartTotals.discountAmount,
          roundOff: cartTotals.roundOff,
          paidAmount: paymentDetails.totalPaid || cartTotals.grandTotal,
          paymentMethod: paymentDetails.mode || "CASH",
        })
        
        // Clear lab tests after successful payment
        setLabTests([])
        
        // Close payment modal and show success modal
        setIsPaymentModalOpen(false)
        setShowSuccessModal(true)
        toast.success(result.message)
        
        // Refresh server data so inventory stock numbers reflect the deduction
        router.refresh()
      } else {
        toast.error(result.message)
      }
    } catch (error: any) {
      toast.error(error?.message || "Failed to process sale")
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle print
  const handlePrint = () => {
    window.print()
  }

  // Reset and start new sale
  const resetAndNewSale = () => {
    clearCart()
    setShowSuccessModal(false)
    setLastBillData(null)
    toast.info("Ready for new sale")
  }

  // ============================================
  // JSX — TABLE-BASED LAYOUT
  // ============================================

  return (
    <div className="space-y-6">
      {/* ── CUSTOMER SELECTION ────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Customer Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Mode Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setCustomerMode("walkin"); setSelectedPatient(null); setPharmacyCustomer(null) }}
              className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all ${
                customerMode === "walkin" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Walk-in
            </button>
            <button
              onClick={() => { setCustomerMode("patient"); setPharmacyCustomer(null) }}
              className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all ${
                customerMode === "patient" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Hospital Patient
            </button>
            <button
              onClick={() => { setCustomerMode("pharmacy"); setSelectedPatient(null) }}
              className={`flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all ${
                customerMode === "pharmacy" ? "bg-white shadow-sm text-blue-700" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Pharmacy Customer
            </button>
          </div>

          {/* Walk-in */}
          {customerMode === "walkin" && (
            <div className="text-sm text-muted-foreground bg-gray-50 rounded-md px-3 py-2">
              Billing as anonymous walk-in customer. No customer details on bill.
            </div>
          )}

          {/* Patient */}
          {customerMode === "patient" && (
            <Popover open={patientDropdownOpen} onOpenChange={setPatientDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={patientDropdownOpen}
                  className="w-full justify-between font-normal text-left h-auto py-2"
                >
                  {selectedPatient
                    ? (() => {
                        const p = recentPatients.find((p) => p.id === selectedPatient)
                        if (!p) return "Select a patient..."
                        const name = p.name || "Unknown Patient"
                        return `${name} - ${p.patientId} (${p.phone || "No phone"})`
                      })()
                    : "Search and select a hospital patient..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search by name, ID or phone..." />
                  <CommandList>
                    <CommandEmpty>No hospital patient found.</CommandEmpty>
                    <CommandGroup>
                      {recentPatients.map((patient) => {
                        const name = patient.name || "Unknown Patient"
                        const displayText = `${name} - ${patient.patientId} (${patient.phone || "No phone"})`
                        
                        return (
                          <CommandItem
                            key={patient.id}
                            value={displayText}
                            onSelect={() => {
                              setSelectedPatient(patient.id === selectedPatient ? null : patient.id)
                              setPatientDropdownOpen(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedPatient === patient.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {displayText}
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}

          {/* Pharmacy Customer */}
          {customerMode === "pharmacy" && (
            <div className="space-y-3">
              {pharmacyCustomer ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start justify-between">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-sm text-blue-900 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5" />
                      {pharmacyCustomer.name}
                    </p>
                    <p className="text-xs text-blue-700 flex items-center gap-1.5">
                      <Phone className="h-3 w-3" />
                      {pharmacyCustomer.phone}
                    </p>
                    {pharmacyCustomer.address && (
                      <p className="text-xs text-blue-600 flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {pharmacyCustomer.address}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-blue-400 hover:text-blue-600"
                    onClick={() => { setPharmacyCustomer(null); setCustomerSearchQuery(""); setShowNewCustomerForm(false) }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by phone number or name..."
                      value={customerSearchQuery}
                      onChange={async (e) => {
                        const val = e.target.value
                        setCustomerSearchQuery(val)
                        if (val.trim().length >= 3) {
                          setIsSearchingCustomers(true)
                          const result = await searchPharmacyCustomers(val.trim())
                          if (result.success && result.data) {
                            setCustomerSearchResults(result.data)
                          }
                          setIsSearchingCustomers(false)
                        } else {
                          setCustomerSearchResults([])
                        }
                      }}
                      className="pl-9 h-9 text-sm"
                    />
                  </div>

                  {customerSearchResults.length > 0 && (
                    <div className="border rounded-md divide-y max-h-32 overflow-y-auto">
                      {customerSearchResults.map((c: any) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setPharmacyCustomer({ id: c.id, name: c.name, phone: c.phone, address: c.address })
                            setCustomerSearchResults([])
                            setCustomerSearchQuery("")
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                        >
                          <p className="text-sm font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.phone}{c.address ? ` • ${c.address}` : ""}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {customerSearchQuery.trim().length >= 3 && customerSearchResults.length === 0 && !isSearchingCustomers && (
                    <p className="text-xs text-muted-foreground">No customer found.</p>
                  )}

                  {!showNewCustomerForm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs gap-1.5"
                      onClick={() => {
                        setShowNewCustomerForm(true)
                        if (/^\d+$/.test(customerSearchQuery.trim())) {
                          setNewCustomerPhone(customerSearchQuery.trim())
                        }
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add New Customer
                    </Button>
                  ) : (
                    <div className="border rounded-lg p-3 space-y-2.5 bg-gray-50">
                      <p className="text-xs font-semibold text-gray-700">New Customer</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Name <span className="text-red-500">*</span></Label>
                          <Input
                            value={newCustomerName}
                            onChange={(e) => setNewCustomerName(e.target.value)}
                            placeholder="Full name"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Phone</Label>
                          <Input
                            value={newCustomerPhone}
                            onChange={(e) => setNewCustomerPhone(e.target.value)}
                            placeholder="10-digit number"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Address</Label>
                        <Input
                          value={newCustomerAddress}
                          onChange={(e) => setNewCustomerAddress(e.target.value)}
                          placeholder="Street, City, PIN"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          disabled={isCreatingCustomer || !newCustomerName.trim()}
                          onClick={async () => {
                            setIsCreatingCustomer(true)
                            const result = await createPharmacyCustomer({
                              name: newCustomerName.trim(),
                              phone: newCustomerPhone.trim() || undefined,
                              address: newCustomerAddress.trim() || undefined,
                            })
                            if (result.success && result.data) {
                              setPharmacyCustomer({
                                id: result.data.id,
                                name: result.data.name,
                                phone: result.data.phone || "",
                                address: result.data.address,
                              })
                              setShowNewCustomerForm(false)
                              setNewCustomerName("")
                              setNewCustomerPhone("")
                              setNewCustomerAddress("")
                              toast.success(result.message)
                            } else {
                              toast.error(result.message || "Failed to create customer")
                            }
                            setIsCreatingCustomer(false)
                          }}
                        >
                          {isCreatingCustomer ? "Saving..." : "Save Customer"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setShowNewCustomerForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── BACK DATE BILLING ────────────────────── */}
      <Card className={`transition-all ${isBackDateEnabled ? 'border-amber-300 bg-amber-50/30' : ''}`}>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CalendarClock className={`h-4 w-4 ${isBackDateEnabled ? 'text-amber-600' : 'text-gray-400'}`} />
              <div>
                <p className="text-sm font-medium">Back Date Billing</p>
                <p className="text-xs text-muted-foreground">Record this bill with a past date</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isBackDateEnabled}
                onChange={(e) => {
                  setIsBackDateEnabled(e.target.checked)
                  if (!e.target.checked) {
                    setBackDate(undefined)
                    setBackTimeHour("10")
                    setBackTimeMinute("00")
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {isBackDateEnabled && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                {/* Date Picker */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Bill Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-[200px] justify-start text-left font-normal h-9 text-sm ${
                          !backDate ? 'text-muted-foreground' : ''
                        }`}
                      >
                        <CalendarClock className="mr-2 h-3.5 w-3.5" />
                        {backDate ? format(backDate, 'dd MMM yyyy') : 'Select date...'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={backDate}
                        onSelect={setBackDate}
                        disabled={(date) => {
                          const today = new Date()
                          today.setHours(23, 59, 59, 999)
                          if (date > today) return true
                          const oneYearAgo = new Date()
                          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
                          if (date < oneYearAgo) return true
                          return false
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Inputs */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600">Time</label>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      max="23"
                      value={backTimeHour}
                      onChange={(e) => setBackTimeHour(e.target.value)}
                      className="h-9 w-14 text-center text-sm"
                      placeholder="HH"
                    />
                    <span className="text-lg font-bold text-gray-400">:</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={backTimeMinute}
                      onChange={(e) => setBackTimeMinute(e.target.value)}
                      className="h-9 w-14 text-center text-sm"
                      placeholder="MM"
                    />
                  </div>
                </div>
              </div>

              {/* Warning Banner */}
              {backDate && (
                <div className="flex items-start gap-2 bg-amber-100 border border-amber-300 rounded-md px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold">Back-dated bill</p>
                    <p>This bill will be recorded as <span className="font-medium">{format(backDate, 'dd MMM yyyy')}</span> at <span className="font-medium">{backTimeHour.padStart(2, '0')}:{backTimeMinute.padStart(2, '0')}</span>. Stock deduction will happen in real-time.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── BILL ITEMS TABLE ────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <PackagePlus className="h-4 w-4" />
              Bill Items ({cart.length})
              {labTests.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">+ {labTests.length} Lab Tests</Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground bg-blue-50/70 border border-blue-200/60 px-2 py-0.5 rounded-md">
                <span className="font-semibold text-blue-700">Keyboard shortcuts:</span>
                <kbd className="bg-white border rounded px-1 text-[10px] font-mono text-gray-700">Tab</kbd>
                <span>/</span>
                <kbd className="bg-white border rounded px-1 text-[10px] font-mono text-gray-700">F2</kbd>
                <span>New Row</span>
                <span className="text-blue-300">•</span>
                <kbd className="bg-white border rounded px-1 text-[10px] font-mono text-gray-700">Enter</kbd>
                <span>Select & Next</span>
              </div>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 hover:text-red-700 h-7 text-xs">
                  <X className="h-3.5 w-3.5 mr-1" /> Clear All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div ref={searchRef} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={topSearchInputRef}
              placeholder="Search medicine by name, generic name, manufacturer, strength... (or use table row below)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setShowSearchResults(true)
                setSelectedTopOptionIndex(0)
              }}
              onFocus={() => setShowSearchResults(true)}
              onKeyDown={handleTopSearchKeyDown}
              className="pl-9 pr-9 h-10"
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(""); setShowSearchResults(false) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Search Results Dropdown */}
            {showSearchResults && debouncedSearchTerm && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-xl max-h-[400px] overflow-y-auto">
                {filteredMedicines.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">No medicines found</div>
                ) : (
                  <div className="divide-y">
                    {filteredMedicines.map((medicine) => (
                      <div key={medicine.id} className="p-3 hover:bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="font-semibold text-sm">{medicine.name}</span>
                          {medicine.strength && (
                            <span className="text-xs text-muted-foreground">({medicine.strength})</span>
                          )}
                          <Badge variant="secondary" className="text-[10px] py-0 h-4">{medicine.type}</Badge>
                          {medicine.noLooseSale && (
                            <Badge variant="outline" className="text-[10px] py-0 h-4 border-orange-300 text-orange-600 bg-orange-50">Strip Only</Badge>
                          )}
                        </div>
                        {medicine.inventoryBatches.length === 0 ? (
                          <p className="text-xs text-red-500">Out of stock</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {medicine.inventoryBatches.map((batch) => {
                              const isTopSelected = topSelectableBatches[selectedTopOptionIndex]?.batch.id === batch.id
                              return (
                                <button
                                  key={batch.id}
                                  onClick={() => addToCart(medicine, batch, 0)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 transition-colors border",
                                    isTopSelected
                                      ? "bg-blue-600 text-white border-blue-600 font-semibold ring-2 ring-blue-300"
                                      : "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                  )}
                                >
                                  <span className="font-medium">{batch.batchNumber}</span>
                                  <span className={isTopSelected ? "text-blue-200" : "text-blue-500"}>|</span>
                                  <span>Exp: {format(new Date(batch.expiryDate), "MMM yy")}</span>
                                  <span className={isTopSelected ? "text-blue-200" : "text-blue-500"}>|</span>
                                  <span>Stock: {batch.quantity}</span>
                                  <span className={isTopSelected ? "text-blue-200" : "text-blue-500"}>|</span>
                                  <span className="font-semibold">₹{batch.sellingPrice.toFixed(2)}/unit</span>
                                  <Plus className="h-3 w-3 ml-0.5" />
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Items Table — Always rendered with inline new medicine entry */}
          <div className="overflow-x-auto border rounded-lg bg-white shadow-xs">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80 border-b">
                  <th className="text-left py-2.5 px-3 font-semibold text-xs text-gray-600 uppercase tracking-wide">Medicine</th>
                  <th className="text-left py-2.5 px-2 font-semibold text-xs text-gray-600 uppercase tracking-wide">Batch</th>
                  <th className="text-left py-2.5 px-2 font-semibold text-xs text-gray-600 uppercase tracking-wide">Expiry</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-xs text-gray-600 uppercase tracking-wide">Stock</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-xs text-gray-600 uppercase tracking-wide w-20">Sell As</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-xs text-gray-600 uppercase tracking-wide w-20">Qty</th>
                  <th className="text-right py-2.5 px-2 font-semibold text-xs text-gray-600 uppercase tracking-wide">MRP (₹)</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-xs text-gray-600 uppercase tracking-wide w-20">Disc %</th>
                  <th className="text-center py-2.5 px-2 font-semibold text-xs text-gray-600 uppercase tracking-wide w-20">GST %</th>
                  <th className="text-right py-2.5 px-2 font-semibold text-xs text-gray-600 uppercase tracking-wide">Amount</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cart.map((item) => {
                  const hasStrips = (item.medicinesPerStrip || 1) > 1
                  const displayQty = item.sellByStrip ? item.quantity / item.medicinesPerStrip : item.quantity
                  const displayPrice = item.sellByStrip ? item.unitPrice * item.medicinesPerStrip : item.unitPrice
                  const availDisplay = item.sellByStrip ? Math.floor(item.availableStock / item.medicinesPerStrip) : item.availableStock
                  return (
                    <tr key={item.batchId} className="hover:bg-gray-50/50">
                      <td className="py-2 px-3">
                        <div className="font-medium text-sm">{item.medicineName}</div>
                        {item.noLooseSale && (
                          <span className="text-[10px] text-orange-600 font-medium">⚠ Strip Only</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{item.batchNumber}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">{format(new Date(item.expiryDate), "MMM yy")}</td>
                      <td className="py-2 px-2 text-center text-xs text-muted-foreground">{availDisplay}</td>
                      {/* Sell As: Unit / Strip toggle */}
                      <td className="py-2 px-2">
                        {hasStrips ? (
                          <select
                            value={item.sellByStrip ? "strip" : "unit"}
                            onChange={(e) => updateCartSellMode(item.batchId, e.target.value === "strip")}
                            className="h-7 text-xs border rounded-md px-1 w-16 mx-auto block bg-white"
                          >
                            <option value="unit">Unit</option>
                            <option value="strip">Strip</option>
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground text-center block">Unit</span>
                        )}
                      </td>
                      {/* Qty — blank by default, auto-focused with Enter jumping to New Row */}
                      <td className="py-2 px-2">
                        <Input
                          ref={(el) => { qtyInputRefs.current[item.batchId] = el }}
                          type="number"
                          min="0"
                          max={availDisplay}
                          value={displayQty || ""}
                          onChange={(e) => updateCartItemQuantity(item.batchId, parseInt(e.target.value) || 0)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              newRowInputRef.current?.focus()
                              newRowInputRef.current?.select()
                            }
                          }}
                          placeholder="Qty"
                          className="h-7 text-xs text-center w-16 mx-auto focus-visible:ring-blue-500 font-medium"
                        />
                      </td>
                      <td className="py-2 px-2 text-right text-xs font-medium">₹{displayPrice.toFixed(2)}</td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={item.discountPercent || ""}
                          onChange={(e) => updateCartItemDiscount(item.batchId, e.target.value === "" ? 0 : Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              newRowInputRef.current?.focus()
                              newRowInputRef.current?.select()
                            }
                          }}
                          className="h-7 text-xs text-center w-16 mx-auto"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="any"
                          value={item.taxRate || ""}
                          onChange={(e) => updateCartItemTaxRate(item.batchId, e.target.value === "" ? 0 : Number(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              newRowInputRef.current?.focus()
                              newRowInputRef.current?.select()
                            }
                          }}
                          className="h-7 text-xs text-center w-16 mx-auto"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-semibold text-sm whitespace-nowrap">₹{item.total.toFixed(2)}</td>
                      <td className="py-2 px-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-400 hover:text-red-600"
                          onClick={() => removeFromCart(item.batchId)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              removeFromCart(item.batchId)
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}

                {/* ── INLINE NEW MEDICINE ROW (Keyboard-first entry via Tab / Enter / F2) ── */}
                <tr className="bg-blue-50/40 hover:bg-blue-50/60 transition-colors border-t-2 border-blue-200">
                  <td className="py-2 px-3" colSpan={4}>
                    <Popover
                      open={showRowResults && rowSearchTerm.trim().length > 0}
                      onOpenChange={setShowRowResults}
                    >
                      <PopoverAnchor asChild>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500 pointer-events-none" />
                          <Input
                            ref={newRowInputRef}
                            type="text"
                            placeholder="+ Type medicine name (Tab / F2 to jump here)..."
                            value={rowSearchTerm}
                            onChange={(e) => {
                              setRowSearchTerm(e.target.value)
                              setShowRowResults(true)
                              setSelectedRowOptionIndex(0)
                            }}
                            onFocus={() => {
                              if (rowSearchTerm.trim().length > 0) setShowRowResults(true)
                            }}
                            onKeyDown={handleRowSearchKeyDown}
                            className="h-8 text-xs pl-8 pr-7 bg-white border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-500 font-medium placeholder:text-gray-400 shadow-xs"
                          />
                          {rowSearchTerm && (
                            <button
                              type="button"
                              onClick={() => {
                                setRowSearchTerm("")
                                setShowRowResults(false)
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </PopoverAnchor>
                      <PopoverContent
                        align="start"
                        sideOffset={4}
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        className="p-0 w-[580px] max-w-[90vw] shadow-xl border-blue-200 z-50 bg-white"
                      >
                        <div className="px-3 py-1.5 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between text-[11px] text-blue-900 font-medium">
                          <span className="flex items-center gap-1.5">
                            <span>Select batch with</span>
                            <kbd className="px-1 py-0.2 bg-white border border-blue-200 rounded text-[10px]">↑</kbd>
                            <kbd className="px-1 py-0.2 bg-white border border-blue-200 rounded text-[10px]">↓</kbd>
                            <span>and press</span>
                            <kbd className="px-1.5 py-0.2 bg-blue-600 text-white font-semibold rounded text-[10px]">Enter</kbd>
                          </span>
                          <span className="text-[10px] text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded font-semibold">
                            {rowSelectableBatches.length} batch(es)
                          </span>
                        </div>
                        <div className="max-h-64 overflow-y-auto divide-y divide-gray-100" ref={dropdownListRef}>
                          {rowSelectableBatches.length === 0 && rowOutOfStockMedicines.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              No medicines found matching "{rowSearchTerm}"
                            </div>
                          ) : (
                            <>
                              {rowSelectableBatches.map((item, idx) => {
                                const isSelected = idx === selectedRowOptionIndex
                                return (
                                  <div
                                    key={`${item.medicine.id}-${item.batch.id}`}
                                    data-index={idx}
                                    onClick={() => handleSelectRowBatch(item.medicine, item.batch)}
                                    className={cn(
                                      "p-2.5 cursor-pointer text-xs transition-colors flex items-center justify-between gap-2",
                                      isSelected ? "bg-blue-600 text-white" : "hover:bg-blue-50/70"
                                    )}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={cn("font-semibold truncate", isSelected ? "text-white" : "text-gray-900")}>
                                          {item.medicine.name}
                                        </span>
                                        {item.medicine.strength && (
                                          <span className={cn("text-[11px]", isSelected ? "text-blue-100" : "text-muted-foreground")}>
                                            ({item.medicine.strength})
                                          </span>
                                        )}
                                        <Badge
                                          variant="secondary"
                                          className={cn(
                                            "text-[9px] py-0 h-4 font-normal",
                                            isSelected ? "bg-blue-700 text-white" : ""
                                          )}
                                        >
                                          {item.medicine.type}
                                        </Badge>
                                        {item.medicine.noLooseSale && (
                                          <Badge
                                            variant="outline"
                                            className={cn(
                                              "text-[9px] py-0 h-4",
                                              isSelected ? "border-blue-400 text-blue-100" : "border-orange-300 text-orange-600 bg-orange-50"
                                            )}
                                          >
                                            Strip Only
                                          </Badge>
                                        )}
                                      </div>
                                      <div className={cn("text-[11px] flex items-center gap-2 mt-0.5", isSelected ? "text-blue-100" : "text-muted-foreground")}>
                                        <span>Batch: <strong className={isSelected ? "text-white" : "text-gray-700"}>{item.batch.batchNumber}</strong></span>
                                        <span>•</span>
                                        <span>Exp: {format(new Date(item.batch.expiryDate), "MMM yy")}</span>
                                        <span>•</span>
                                        <span>Stock: <strong className={isSelected ? "text-white" : "text-emerald-600"}>{item.batch.quantity}</strong></span>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <div className={cn("font-bold text-xs", isSelected ? "text-white" : "text-gray-900")}>
                                        ₹{item.batch.sellingPrice.toFixed(2)}
                                      </div>
                                      <span className={cn("text-[10px]", isSelected ? "text-blue-200" : "text-muted-foreground")}>
                                        per unit
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}

                              {rowOutOfStockMedicines.length > 0 && (
                                <div className="p-2.5 bg-gray-50 border-t border-gray-100">
                                  <div className="font-semibold text-gray-400 uppercase text-[10px] mb-1">Out of Stock</div>
                                  {rowOutOfStockMedicines.slice(0, 3).map((m) => (
                                    <div key={m.id} className="text-xs text-gray-400 flex items-center justify-between py-0.5">
                                      <span>{m.name} {m.strength ? `(${m.strength})` : ""}</span>
                                      <span className="text-[10px] text-red-500 font-medium">0 available</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  </td>
                  <td colSpan={7} className="py-2 px-3 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">
                        {cart.length === 0
                          ? "Type medicine name and press Enter to start billing"
                          : "Press Enter or Tab in Qty field to jump here"}
                      </span>
                      <div className="hidden sm:flex items-center gap-1.5 text-gray-400">
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-[10px] text-gray-600">Tab</kbd>
                        <span>or</span>
                        <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-[10px] text-gray-600">F2</kbd>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Empty State Helper when no items */}
                {cart.length === 0 && labTests.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-muted-foreground bg-gray-50/40">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30 text-gray-400" />
                      <p className="text-xs font-medium text-gray-600">No items added yet</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Type in the medicine row above or search at top to add items
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Lab Tests Section */}
          {labTests.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-purple-50 px-3 py-2 border-b">
                <p className="text-xs font-semibold text-purple-700 uppercase">🧪 Lab Tests ({labTests.length})</p>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {labTests.map((test) => (
                    <tr key={test.id} className="bg-purple-50/30">
                      <td className="py-2 px-3 font-medium">{test.testName}</td>
                      <td className="py-2 px-2 text-xs text-purple-600">{test.priority} priority</td>
                      <td className="py-2 px-2 text-right font-semibold">₹{test.testPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── BILL SUMMARY ────────────────────── */}
      {(cart.length > 0 || labTests.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — Discount & Round Off controls */}
          <Card className="border-0 shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle className="text-base flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-gray-500" />
                Adjustments
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
              {/* Bill-level Discount */}
              <div className="space-y-1.5 max-w-sm">
                <Label className="text-xs font-medium">Bill Discount</Label>
                <div className="flex items-center gap-2">
                  <select
                    className="h-9 text-xs border rounded-md px-2 bg-white"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "percent" | "amount")}
                  >
                    <option value="percent">%</option>
                    <option value="amount">₹ (flat)</option>
                  </select>
                  <Input
                    type="number"
                    className="h-9 text-sm text-right max-w-24"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
              {/* Round Off */}
              <div className="flex items-center gap-3 max-w-sm">
                <Label className="text-xs font-medium">Auto Round Off</Label>
                <input
                  type="checkbox"
                  checked={isRoundOff}
                  onChange={(e) => setIsRoundOff(e.target.checked)}
                  className="w-4 h-4 cursor-pointer rounded"
                />
                {isRoundOff && (
                  <span className="text-xs text-muted-foreground">
                    ({cartTotals.roundOff > 0 ? "+" : ""}{cartTotals.roundOff.toFixed(2)})
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right — Summary */}
          <Card>
            <CardHeader className="pb-3 bg-gray-50/50 rounded-t-xl">
              <CardTitle className="text-base">Bill Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2.5 text-sm">
                {cart.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Medicines ({cart.length} items)</span>
                    <span>₹{cart.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span>
                  </div>
                )}
                {labTests.length > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>Lab Tests ({labTests.length})</span>
                    <span>₹{cartTotals.labTestsTotal?.toFixed(2) || '0.00'}</span>
                  </div>
                )}
                {cartTotals.medicineItemDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Item Discounts</span>
                    <span>-₹{cartTotals.medicineItemDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>GST (included in MRP)</span>
                  <span>₹{cartTotals.totalTax.toFixed(2)}</span>
                </div>
                {cartTotals.discountAmount > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between text-emerald-600">
                      <span>Bill Discount</span>
                      <span>-₹{cartTotals.discountAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                {isRoundOff && cartTotals.roundOff !== 0 && (
                  <div className="flex justify-between text-gray-500 text-xs">
                    <span>Round Off</span>
                    <span>{cartTotals.roundOff > 0 ? "+" : ""}{cartTotals.roundOff.toFixed(2)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total</span>
                  <span className="text-[#0066CC]">₹{cartTotals.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── CHECKOUT BUTTON ────────────────────── */}
      {(cart.length > 0 || labTests.length > 0) && (
        <div className="flex justify-end">
          <Button
            className="bg-[#0066CC] hover:bg-[#0052A3] px-10 py-6 text-base shadow-md hover:shadow-lg transition-all"
            onClick={() => setIsPaymentModalOpen(true)}
            disabled={cart.some(item => item.quantity <= 0)}
          >
            <CreditCard className="mr-2 h-5 w-5" />
            Proceed to Payment — ₹{cartTotals.grandTotal.toFixed(2)}
          </Button>
        </div>
      )}

      {/* ── PAYMENT MODAL (unchanged) ────────────────────── */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        grandTotal={cartTotals.grandTotal}
        onConfirm={handlePaymentComplete}
        isProcessing={isProcessing}
      />

      {/* ── SUCCESS MODAL (unchanged) ────────────────────── */}
      <Dialog open={showSuccessModal} onOpenChange={(open) => { if (!open) resetAndNewSale(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              Payment Successful!
            </DialogTitle>
            <DialogDescription className="text-center text-lg">
              Amount Collected: <span className="font-bold text-green-600">₹{lastBillData?.grandTotal.toFixed(2)}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>Bill Number: <span className="font-semibold">{lastBillData?.billNumber}</span></p>
              <p>Patient: <span className="font-semibold">{lastBillData?.patientName}</span></p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handlePrint}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Invoice
            </Button>
            <Button
              onClick={() => {
                if (lastBillData?.billingId) {
                  router.push(`/dashboard/pharmacy/invoice/${lastBillData.billingId}`)
                }
              }}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Invoice
            </Button>
            <Button
              onClick={resetAndNewSale}
              variant="outline"
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              New Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PRINT INVOICE (hidden, only visible when printing) ────── */}
      {lastBillData && hospitalSettings && printSettings && (
        <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[99999] print-section">
          <style>{`
            @media print {
              body * {
                visibility: hidden;
              }
              .print-section, .print-section * {
                visibility: visible;
              }
              .print-section {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              /* Hide shadcn dialog overlays which use portals */
              div[role="dialog"], .bg-background\\/80, [data-state="open"] {
                display: none !important;
                visibility: hidden !important;
              }
            }
          `}</style>
          <MedicineBillTemplate
            billing={{
              billNumber: lastBillData.billNumber,
              billDate: lastBillData.billDate,
              status: "PAID",
              type: "OPD",
              totalAmount: lastBillData.subtotal,
              discountAmount: lastBillData.discountAmount || 0,
              roundOff: lastBillData.roundOff || 0,
              taxAmount: lastBillData.totalTax,
              netAmount: lastBillData.grandTotal,
              paidAmount: lastBillData.paidAmount,
              balanceAmount: Math.max(0, lastBillData.grandTotal - lastBillData.paidAmount),
              paymentMethod: lastBillData.paymentMethod,
              notes: lastBillData.notes,
              transactionId: null,
              patient: lastBillData.pharmacyCustomer ? {
                patientId: "PHARMACY-CUSTOMER",
                user: { name: lastBillData.pharmacyCustomer.name, phone: lastBillData.pharmacyCustomer.phone },
                dateOfBirth: null,
                gender: null,
                phone: lastBillData.pharmacyCustomer.phone,
                address: lastBillData.pharmacyCustomer.address,
              } : {
                patientId: lastBillData.patientId || "PAT-WALKIN",
                user: { name: lastBillData.patientName },
                dateOfBirth: null,
                gender: null,
                phone: null,
                address: null,
              },
              appointment: initialData?.doctorName ? {
                doctor: { user: { name: initialData.doctorName } }
              } : null,
              items: lastBillData.items
            }}
            hospitalSettings={hospitalSettings}
            printSettings={printSettings}
          />
        </div>
      )}
    </div>
  )
}
