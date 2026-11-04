"use client"

import { useState, useEffect, useTransition } from "react"
import { ArrowLeft, Receipt, Search, Eye, Printer, MessageCircle, Filter, IndianRupee } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import Link from "next/link"
import { format } from "date-fns"
import { toast } from "sonner"
import { getBillHistory, sendBillViaWhatsApp } from "@/lib/actions/billing-counter"

interface BillRecord {
  id: string
  billNumber: string
  patientName: string
  patientId: string
  type: string
  billDate: string
  totalAmount: number
  discountAmount: number
  netAmount: number
  paidAmount: number
  balanceAmount: number
  status: string
  paymentMethod: string | null
  itemCount: number
}

const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  PENDING: "bg-amber-100 text-amber-700",
  PARTIALLY_PAID: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  REFUNDED: "bg-red-100 text-red-700",
  DRAFT: "bg-gray-100 text-gray-500",
  PENDING_GOVERNMENT_PAYMENT: "bg-purple-100 text-purple-700",
}

const TYPE_COLORS: Record<string, string> = {
  OPD: "bg-blue-100 text-blue-700",
  IPD: "bg-indigo-100 text-indigo-700",
  CASUALTY: "bg-orange-100 text-orange-700",
  EMERGENCY: "bg-red-100 text-red-700",
  OT: "bg-purple-100 text-purple-700",
  LABORATORY: "bg-teal-100 text-teal-700",
  AMBULANCE: "bg-amber-100 text-amber-700",
  CANTEEN: "bg-green-100 text-green-700",
  CUSTOM: "bg-slate-100 text-slate-700",
}

export default function BillHistoryPage() {
  const [isPending, startTransition] = useTransition()
  const [bills, setBills] = useState<BillRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState("")
  const [billingType, setBillingType] = useState("ALL")
  const [status, setStatus] = useState("ALL")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    loadBills()
  }, [billingType, status, dateFrom, dateTo])

  const loadBills = async (searchOverride?: string) => {
    setLoading(true)
    const result = await getBillHistory({
      search: searchOverride ?? search,
      billingType,
      status,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      limit: 100,
    })
    setBills((result.data as BillRecord[]) || [])
    setTotal(result.total || 0)
    setLoading(false)
  }

  const handleSearch = () => loadBills()

  const handleWhatsApp = async (billId: string) => {
    startTransition(async () => {
      const result = await sendBillViaWhatsApp(billId)
      if (result.success) {
        toast.success("Bill sent on WhatsApp")
      } else {
        toast.error(result.message || "Failed to send")
      }
    })
  }

  // Summary
  const totalRevenue = bills.reduce((s, b) => s + b.paidAmount, 0)
  const totalPending = bills.filter((b) => b.status === "PENDING" || b.status === "PARTIALLY_PAID").reduce((s, b) => s + b.balanceAmount, 0)

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/billing-counter">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-[#0066CC] flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Bill History
          </h2>
          <p className="text-sm text-gray-500">
            View, search, and manage all hospital bills (excludes pharmacy)
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-600">Total Collected</p>
            <p className="text-xl font-bold text-green-700">
              ₹{totalRevenue.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-600">Total Pending</p>
            <p className="text-xl font-bold text-amber-700">
              ₹{totalPending.toLocaleString("en-IN")}
            </p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-600">Bills Shown</p>
            <p className="text-xl font-bold text-blue-700">{total}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by bill #, patient name or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="h-9"
              />
            </div>
            <Select value={billingType} onValueChange={setBillingType}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="OPD">OPD</SelectItem>
                <SelectItem value="IPD">IPD</SelectItem>
                <SelectItem value="CASUALTY">Casualty</SelectItem>
                <SelectItem value="EMERGENCY">Emergency</SelectItem>
                <SelectItem value="OT">Surgery/OT</SelectItem>
                <SelectItem value="LABORATORY">Lab</SelectItem>
                <SelectItem value="AMBULANCE">Ambulance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partial</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-[140px] h-9"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-[140px] h-9"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
              className="h-9"
            >
              <Search className="h-3.5 w-3.5 mr-1" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card className="border-gray-200">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs font-semibold">Bill #</TableHead>
                  <TableHead className="text-xs font-semibold">Date</TableHead>
                  <TableHead className="text-xs font-semibold">Patient</TableHead>
                  <TableHead className="text-xs font-semibold">Type</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Amount</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Paid</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Balance</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  bills.map((bill) => (
                    <TableRow key={bill.id} className="text-sm hover:bg-gray-50">
                      <TableCell className="font-medium text-blue-700">
                        {bill.billNumber}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {format(new Date(bill.billDate), "dd MMM yy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900 text-xs">
                            {bill.patientName}
                          </p>
                          <p className="text-[10px] text-gray-500">{bill.patientId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 ${TYPE_COLORS[bill.type] || "bg-gray-100 text-gray-600"}`}
                        >
                          {bill.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{bill.netAmount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right text-green-700 font-medium">
                        ₹{bill.paidAmount.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right">
                        {bill.balanceAmount > 0 ? (
                          <span className="text-red-600 font-medium">
                            ₹{bill.balanceAmount.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[bill.status] || "bg-gray-100"}`}
                        >
                          {bill.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/dashboard/finance/billing/${bill.id}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="h-3.5 w-3.5 text-gray-500" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() =>
                              window.open(
                                `/dashboard/finance/billing/${bill.id}`,
                                "_blank"
                              )
                            }
                          >
                            <Printer className="h-3.5 w-3.5 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleWhatsApp(bill.id)}
                            disabled={isPending}
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
