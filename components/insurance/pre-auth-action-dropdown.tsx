"use client"

import { useState } from "react"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { updatePreAuthStatus, submitPreAuth } from "@/lib/actions/pre-authorization"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { MoreHorizontal, CheckCircle, XCircle, Send } from "lucide-react"

interface PreAuthActionDropdownProps {
  preAuthId: string
  status: string
  totalEstimatedCost: number
}

export function PreAuthActionDropdown({ preAuthId, status, totalEstimatedCost }: PreAuthActionDropdownProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT">("APPROVE")
  const [amount, setAmount] = useState(totalEstimatedCost.toString())
  const [remarks, setRemarks] = useState("")

  const handleAction = (type: "APPROVE" | "REJECT") => {
    setActionType(type)
    setDialogOpen(true)
  }

  const handleSubmitPreAuth = () => {
    startTransition(async () => {
      await submitPreAuth(preAuthId)
    })
  }

  const handleConfirm = () => {
    startTransition(async () => {
      const fd = new FormData()
      fd.append("preAuthId", preAuthId)
      if (actionType === "APPROVE") {
        fd.append("status", "APPROVED")
        fd.append("approvedAmount", amount)
        if (remarks) fd.append("remarks", remarks)
      } else {
        fd.append("status", "REJECTED")
        if (remarks) fd.append("rejectionReason", remarks)
      }

      await updatePreAuthStatus(fd)
      setDialogOpen(false)
      setRemarks("")
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status === "DRAFT" && (
            <DropdownMenuItem onClick={handleSubmitPreAuth} disabled={isPending}>
              <Send className="mr-2 h-4 w-4 text-blue-500" />
              <span>Submit to TPA</span>
            </DropdownMenuItem>
          )}
          
          {(status === "SUBMITTED" || status === "DRAFT" || status === "QUERY_RAISED") && (
            <>
              {status === "DRAFT" && <DropdownMenuSeparator />}
              <DropdownMenuItem onClick={() => handleAction("APPROVE")} disabled={isPending}>
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                <span>Approve</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAction("REJECT")} disabled={isPending}>
                <XCircle className="mr-2 h-4 w-4 text-red-500" />
                <span>Decline</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType === "APPROVE" ? "Approve Pre-Authorization" : "Decline Pre-Authorization"}</DialogTitle>
            <DialogDescription>
              {actionType === "APPROVE" 
                ? "Enter the approved amount from the TPA." 
                : "Provide a reason for declining the pre-authorization request."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionType === "APPROVE" && (
              <div className="space-y-2">
                <Label>Approved Amount (Rs.) *</Label>
                <Input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="e.g. 50000"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>{actionType === "APPROVE" ? "Remarks (Optional)" : "Reason for Rejection *"}</Label>
              <Input 
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)} 
                placeholder={actionType === "APPROVE" ? "Any conditions?" : "Why was this rejected?"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isPending}>Cancel</Button>
            <Button 
              variant={actionType === "APPROVE" ? "default" : "destructive"} 
              onClick={handleConfirm} 
              disabled={isPending || (actionType === "REJECT" && !remarks)}
            >
              {isPending ? "Processing..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
