"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Edit, Trash2, AlertCircle, FileText, Undo2 } from "lucide-react"
import { deletePharmacyBill } from "@/lib/actions/pharmacy-bills"
import { toast } from "sonner"
import { BillingStatus } from "@prisma/client"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export function PharmacyBillsClient({ initialBills }: { initialBills: any[] }) {
  const [bills, setBills] = useState(initialBills)
  const [searchTerm, setSearchTerm] = useState("")
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
  // Alert dialog state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [billToDelete, setBillToDelete] = useState<string | null>(null)

  const filteredBills = bills.filter((bill) =>
    bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.patient.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.pharmacyCustomer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const confirmDelete = (billId: string) => {
    setBillToDelete(billId)
    setDeleteConfirmOpen(true)
  }

  const handleDelete = async () => {
    if (!billToDelete) return

    setIsDeleting(billToDelete)
    try {
      const result = await deletePharmacyBill(billToDelete)
      if (result.success) {
        toast.success("Bill deleted and inventory restored successfully.")
        setBills((prev) => prev.filter((b) => b.id !== billToDelete))
      } else {
        toast.error(result.message || "Failed to delete bill")
      }
    } catch (error) {
      toast.error("An error occurred while deleting the bill.")
    } finally {
      setIsDeleting(null)
      setDeleteConfirmOpen(false)
      setBillToDelete(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-200">Paid</Badge>
      case "PARTIALLY_PAID":
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200">Partially Paid</Badge>
      case "PENDING":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>
      case "REFUNDED":
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">Refunded</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getReturnBadge = (bill: any) => {
    if (!bill.salesReturns || bill.salesReturns.length === 0) return null
    const approvedReturns = bill.salesReturns.filter((r: any) => r.refundStatus === "APPROVED")
    const pendingReturns = bill.salesReturns.filter((r: any) => r.refundStatus === "PENDING_APPROVAL")
    const totalRefunded = approvedReturns.reduce((s: number, r: any) => s + r.refundAmount, 0)
    return (
      <div className="flex flex-col gap-0.5">
        {approvedReturns.length > 0 && (
          <Badge className="bg-purple-50 text-purple-600 hover:bg-purple-100 text-[10px] px-1.5 py-0 gap-1">
            <Undo2 className="h-3 w-3" />
            Returned ₹{totalRefunded.toFixed(0)}
          </Badge>
        )}
        {pendingReturns.length > 0 && (
          <Badge className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 text-[10px] px-1.5 py-0">
            Return Pending
          </Badge>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Pharmacy Bills</CardTitle>
          <CardDescription>Manage pharmacy bills, process refunds, and restore stock</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by bill number or patient name..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No pharmacy bills found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.billNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span>{format(new Date(bill.billDate || bill.createdAt), "dd MMM yyyy, p")}</span>
                          {bill.notes?.includes("[BACK-DATED:") && (
                            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 text-[10px] px-1.5 py-0">
                              Back-Dated
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{bill.pharmacyCustomer?.name || bill.patient.user?.name || "Walk-In"}</p>
                          <p className="text-xs text-muted-foreground">{bill.pharmacyCustomer?.phone || bill.patient.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>₹{bill.netAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(bill.status)}
                          {getReturnBadge(bill)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="secondary" size="sm" asChild>
                          <Link href={`/dashboard/finance/billing/${bill.id}`}>
                            <FileText className="h-4 w-4 mr-2" />
                            View Bill
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/pharmacy/bills/${bill.id}/edit`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit / Refund
                          </Link>
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => confirmDelete(bill.id)}
                          disabled={isDeleting === bill.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Confirm Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bill? This action cannot be undone.
              <br /><br />
              <strong>Note:</strong> Doing this will automatically restore the inventory stock for all medicines in this bill (if they were billed with the new batch tracking system).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting !== null}
            >
              {isDeleting ? "Deleting..." : "Delete Bill & Restore Stock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
