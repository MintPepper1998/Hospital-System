"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Plus,
  FileText,
  Users,
  Loader2,
  ShoppingCart,
  Phone,
  Mail,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"
import { addSupplier, type PurchaseInvoiceData, type SupplierData } from "@/app/actions/purchase"
import { useRouter } from "next/navigation"

// ============================================
// HELPERS
// ============================================

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    PAID: { label: "Paid", className: "bg-green-100 text-green-700 border-green-200" },
    PARTIAL: { label: "Partial", className: "bg-amber-100 text-amber-700 border-amber-200" },
    UNPAID: { label: "Unpaid", className: "bg-red-100 text-red-700 border-red-200" },
  }
  const c = cfg[status] || cfg.UNPAID
  return <Badge variant="outline" className={`text-xs ${c.className}`}>{c.label}</Badge>
}

// ============================================
// MAIN
// ============================================

interface Props {
  invoices: PurchaseInvoiceData[]
  suppliers: SupplierData[]
}

export function PurchasesListClient({ invoices, suppliers }: Props) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-teal-600" />
            Purchases & Suppliers
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage purchase bills, suppliers, and vendor payments
          </p>
        </div>
        <Button asChild className="bg-teal-600 hover:bg-teal-700">
          <Link href="/dashboard/finance/purchases/new">
            <Plus className="h-4 w-4 mr-2" />
            New Purchase Bill
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Purchases ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Suppliers ({suppliers.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Purchases ──────────────── */}
        <TabsContent value="purchases" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Purchase Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No purchase bills yet</p>
                  <p className="text-xs mt-1">Click &quot;New Purchase Bill&quot; to create one</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Bill No</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead className="text-right">Grand Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(inv.date), "dd MMM yyyy")}
                          </TableCell>
                          <TableCell className="text-sm font-medium">{inv.invoiceNumber}</TableCell>
                          <TableCell className="text-sm">{inv.supplierName}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{inv.itemCount} items</TableCell>
                          <TableCell className="text-right text-sm font-semibold">{formatINR(inv.grandTotal)}</TableCell>
                          <TableCell className="text-right text-sm">{formatINR(inv.amountPaid)}</TableCell>
                          <TableCell><StatusBadge status={inv.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: Suppliers ──────────────── */}
        <TabsContent value="suppliers" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Supplier Directory</CardTitle>
              <AddSupplierDialog onAdded={() => router.refresh()} />
            </CardHeader>
            <CardContent>
              {suppliers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No suppliers added</p>
                  <p className="text-xs mt-1">Add your first supplier to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {suppliers.map((s) => (
                    <div key={s.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-semibold">{s.name}</h4>
                          {s.contactPerson && (
                            <p className="text-xs text-muted-foreground mt-0.5">{s.contactPerson}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px]">
                          {s.purchaseCount} bills
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {s.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3" /> {s.phone}
                          </div>
                        )}
                        {s.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3" /> {s.email}
                          </div>
                        )}
                        {(s.city || s.state) && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3" /> {[s.city, s.state].filter(Boolean).join(", ")}
                          </div>
                        )}
                        {s.gstNumber && (
                          <div className="text-[10px]">GST: {s.gstNumber}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================
// ADD SUPPLIER DIALOG
// ============================================

function AddSupplierDialog({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [name, setName] = useState("")
  const [contact, setContact] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [gst, setGst] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [state, setState] = useState("")

  const reset = () => {
    setName(""); setContact(""); setPhone(""); setEmail("")
    setGst(""); setAddress(""); setCity(""); setState("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error("Supplier name is required")

    startTransition(async () => {
      const result = await addSupplier({
        name, contactPerson: contact, phone, email,
         gstNumber: gst, address, city, state,
      })
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        reset()
        onAdded()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
          <DialogDescription>Enter vendor/supplier details</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Supplier Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., ABC Pharma" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Contact Person</Label>
              <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
            </div>
          </div>
          <p className="text-xs text-muted-foreground rounded-md bg-slate-50 px-3 py-2">
            Suppliers added here are Hospital Finance suppliers and stay separate from Pharmacy suppliers.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@vendor.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">GST Number</Label>
              <Input value={gst} onChange={(e) => setGst(e.target.value)} placeholder="22AAAA0000A1Z5" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">State</Label>
              <Input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-teal-600 hover:bg-teal-700">
              {isPending ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Saving...</> : "Add Supplier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
