"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ClipboardEdit,
  ShieldCheck,
  IndianRupee,
} from "lucide-react"
import { toast } from "sonner"
import { updateClaimStatus } from "@/lib/actions/insurance"

interface ClaimActionDialogProps {
  claimId: string
  claimNumber: string
  claimAmount: number
  providerName: string
  patientName: string
  currentStatus: string
  invoiceNumber?: string
}

const STATUS_OPTIONS = [
  {
    value: "APPROVED",
    label: "Approve",
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
    description: "Approve the claim and auto-record payment on the invoice",
  },
  {
    value: "REJECTED",
    label: "Reject",
    icon: XCircle,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    description: "Reject the claim — no payment will be recorded",
  },
  {
    value: "QUERY_RAISED",
    label: "Raise Query",
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    description: "Request additional documents or information from the insurer",
  },
  {
    value: "UNDER_REVIEW",
    label: "Under Review",
    icon: ClipboardEdit,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    description: "Mark claim as currently under review by TPA",
  },
  {
    value: "IN_PROCESS",
    label: "In Process",
    icon: ShieldCheck,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200",
    description: "Claim is being processed by the insurance company",
  },
]

export function ClaimActionDialog({
  claimId,
  claimNumber,
  claimAmount,
  providerName,
  patientName,
  currentStatus,
  invoiceNumber,
}: ClaimActionDialogProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [status, setStatus] = useState("")
  const [approvedAmount, setApprovedAmount] = useState(claimAmount.toString())
  const [transactionRef, setTransactionRef] = useState("")
  const [remarks, setRemarks] = useState("")

  const selectedOption = STATUS_OPTIONS.find((o) => o.value === status)
  const parsedAmount = parseFloat(approvedAmount) || 0
  const isApproval = status === "APPROVED"

  const handleSubmit = () => {
    if (!status) {
      toast.error("Please select a status")
      return
    }

    if (isApproval && parsedAmount <= 0) {
      toast.error("Approved amount must be greater than 0")
      return
    }

    const formData = new FormData()
    formData.set("claimId", claimId)
    formData.set("status", status)
    if (isApproval) {
      formData.set("approvedAmount", parsedAmount.toString())
    }
    if (transactionRef) formData.set("transactionRef", transactionRef)
    if (remarks) formData.set("remarks", remarks)

    startTransition(async () => {
      const result = await updateClaimStatus(formData)

      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        resetForm()
      } else {
        toast.error(result.message)
      }
    })
  }

  const resetForm = () => {
    setStatus("")
    setApprovedAmount(claimAmount.toString())
    setTransactionRef("")
    setRemarks("")
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) resetForm()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-teal-700 border-teal-300 hover:bg-teal-50">
          <ClipboardEdit className="mr-1.5 h-3.5 w-3.5" />
          Update
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-600" />
            Update Insurance Claim
          </DialogTitle>
          <DialogDescription>
            Claim <strong>{claimNumber}</strong> &middot; {providerName}
          </DialogDescription>
        </DialogHeader>

        {/* Claim Summary */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Patient</span>
            <span className="font-semibold">{patientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Provider / TPA</span>
            <span className="font-semibold">{providerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Claim Amount</span>
            <span className="font-bold text-lg">₹{claimAmount.toFixed(2)}</span>
          </div>
          {invoiceNumber && (
            <div className="flex justify-between">
              <span className="text-gray-600">Linked Invoice</span>
              <span className="font-semibold text-blue-600">{invoiceNumber}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Current Status</span>
            <Badge variant="outline" className="font-medium">
              {currentStatus.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Action Form */}
        <div className="space-y-4">
          {/* Status Selector */}
          <div className="space-y-2">
            <Label>
              New Status <span className="text-red-500">*</span>
            </Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select action..." />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className={`h-4 w-4 ${option.color}`} />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOption && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedOption.description}
              </p>
            )}
          </div>

          {/* Approved Amount — only for APPROVED status */}
          {isApproval && (
            <div className="space-y-2">
              <Label htmlFor="approved-amount">
                Approved Amount <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                <Input
                  id="approved-amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                  className="pl-8 text-lg font-semibold"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setApprovedAmount(claimAmount.toString())}
                >
                  Full: ₹{claimAmount.toFixed(2)}
                </Button>
                {claimAmount > 1000 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setApprovedAmount(Math.round(claimAmount * 0.8).toString())}
                  >
                    80%: ₹{(claimAmount * 0.8).toFixed(2)}
                  </Button>
                )}
              </div>
              {parsedAmount > claimAmount && (
                <p className="text-xs text-amber-600">
                  Approved amount exceeds claim amount of ₹{claimAmount.toFixed(2)}
                </p>
              )}
            </div>
          )}

          {/* Transaction Reference */}
          {(isApproval || status === "IN_PROCESS") && (
            <div className="space-y-2">
              <Label htmlFor="transaction-ref">
                {isApproval ? "Bank Transfer / UTR Reference" : "TPA Reference Number"}
              </Label>
              <Input
                id="transaction-ref"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder={isApproval ? "e.g., NEFT/RTGS reference" : "e.g., TPA tracking ID"}
              />
            </div>
          )}

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="claim-remarks">
              Remarks {status === "REJECTED" || status === "QUERY_RAISED" ? <span className="text-red-500">*</span> : "(Optional)"}
            </Label>
            <Textarea
              id="claim-remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                status === "REJECTED"
                  ? "Reason for rejection..."
                  : status === "QUERY_RAISED"
                    ? "What documents / information is needed..."
                    : "Any additional notes..."
              }
              rows={2}
            />
          </div>

          {/* Preview Banner */}
          {status && selectedOption && (
            <div className={`rounded-lg p-3 text-sm border ${selectedOption.bg}`}>
              <div className="flex items-start gap-2">
                <selectedOption.icon className={`h-4 w-4 mt-0.5 ${selectedOption.color}`} />
                <div>
                  <p className="font-medium">
                    {isApproval ? (
                      <span className="text-green-700">
                        Approve for ₹{parsedAmount.toFixed(2)} — Payment will be auto-recorded on the linked invoice
                      </span>
                    ) : status === "REJECTED" ? (
                      <span className="text-red-700">
                        Claim will be rejected. No payment will be recorded.
                      </span>
                    ) : status === "QUERY_RAISED" ? (
                      <span className="text-amber-700">
                        Claim will be put on hold until query is resolved.
                      </span>
                    ) : (
                      <span className={selectedOption.color}>
                        Claim status will be updated to &quot;{selectedOption.label}&quot;
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !status}
            className={
              isApproval
                ? "bg-green-600 hover:bg-green-700 text-white"
                : status === "REJECTED"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-teal-600 hover:bg-teal-700 text-white"
            }
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isApproval ? (
              <>
                <IndianRupee className="mr-1.5 h-4 w-4" />
                Approve & Record Payment
              </>
            ) : (
              <>
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Update Status
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
