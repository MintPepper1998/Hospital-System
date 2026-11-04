"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { updateBilling, deleteBilling } from "@/lib/actions/finance"

interface BillingRowActionsProps {
  billing: {
    id: string
    billNumber: string
    status: string
    paymentMethod: string | null
    notes: string | null
    paidAmount: number
    netAmount: number
    balanceAmount: number
  }
}

const PAYMENT_METHODS = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "INSURANCE", "BSKY"]
const STATUSES = ["PENDING", "PARTIALLY_PAID", "PAID", "CANCELLED"]

export function BillingRowActions({ billing }: BillingRowActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false)
  const [editStatus, setEditStatus] = useState(billing.status)
  const [editPaymentMethod, setEditPaymentMethod] = useState(billing.paymentMethod || "CASH")
  const [editNotes, setEditNotes] = useState(billing.notes || "")
  const [editPaidAmount, setEditPaidAmount] = useState(String(billing.paidAmount))
  const [editError, setEditError] = useState("")
  const [editSuccess, setEditSuccess] = useState("")

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  // ── EDIT SUBMIT ────────────────────────────────────────
  function handleEdit() {
    setEditError("")
    setEditSuccess("")
    const paid = parseFloat(editPaidAmount)
    if (isNaN(paid) || paid < 0) {
      setEditError("Please enter a valid paid amount")
      return
    }
    if (paid > billing.netAmount + 0.01) {
      setEditError(`Paid amount cannot exceed bill total (₹${billing.netAmount.toFixed(2)})`)
      return
    }

    startTransition(async () => {
      const fd = new FormData()
      fd.set("status", editStatus)
      fd.set("paymentMethod", editPaymentMethod)
      fd.set("notes", editNotes)
      fd.set("paidAmount", editPaidAmount)

      const result = await updateBilling(billing.id, fd)
      if (result.success) {
        setEditSuccess(result.message || "Updated successfully")
        setTimeout(() => {
          setEditOpen(false)
          setEditSuccess("")
          router.refresh()
        }, 800)
      } else {
        setEditError(result.message || "Update failed")
      }
    })
  }

  // ── DELETE SUBMIT ──────────────────────────────────────
  function handleDelete() {
    setDeleteError("")
    startTransition(async () => {
      const result = await deleteBilling(billing.id)
      if (result.success) {
        setDeleteOpen(false)
        router.refresh()
      } else {
        setDeleteError(result.message || "Delete failed")
      }
    })
  }

  return (
    <>
      {/* Edit + Delete buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 w-8 p-0"
          onClick={() => setEditOpen(true)}
          title="Edit bill"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
          onClick={() => setDeleteOpen(true)}
          title="Delete bill"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* ── EDIT DIALOG ─────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bill — {billing.billNumber}</DialogTitle>
            <DialogDescription>
              Update payment status, method, and notes for this bill.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Bill Summary */}
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Bill Total</span>
                <span className="font-semibold">₹{billing.netAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Currently Paid</span>
                <span className="font-semibold text-green-600">₹{billing.paidAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Balance</span>
                <span className="font-semibold text-orange-600">₹{billing.balanceAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Paid Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="paidAmount">Paid Amount (₹)</Label>
              <Input
                id="paidAmount"
                type="number"
                step="0.01"
                min="0"
                max={billing.netAmount}
                value={editPaidAmount}
                onChange={(e) => setEditPaidAmount(e.target.value)}
              />
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map(s => (
                    <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={editPaymentMethod} onValueChange={setEditPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Optional notes..."
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
              />
            </div>

            {editError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {editError}
              </p>
            )}
            {editSuccess && (
              <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded px-3 py-2">
                ✓ {editSuccess}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM DIALOG ────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Delete Bill?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Bill No.</span>
                <span className="font-semibold">{billing.billNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Amount</span>
                <span className="font-semibold">₹{billing.netAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-semibold ${billing.status === "PAID" ? "text-green-600" : "text-orange-600"}`}>
                  {billing.status}
                </span>
              </div>
            </div>

            {billing.status === "PAID" && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                ⚠️ This is a <strong>PAID</strong> bill. Deleting it will remove it from revenue reports.
              </p>
            )}

            <p className="text-sm text-gray-600">
              All payments, insurance claims, and line items linked to this bill will also be deleted.
              Lab tests and surgery records will be kept but unlinked from this bill.
            </p>

            {deleteError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {deleteError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
