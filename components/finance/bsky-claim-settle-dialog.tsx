"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
import { CheckCircle2, Landmark, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { settleBskyClaim, type FinancialAccountData } from "@/app/actions/finance"

interface BskyClaimSettleDialogProps {
  billId: string
  billNumber: string
  patientName: string
  amount: number
  accounts: FinancialAccountData[]
}

export function BskyClaimSettleDialog({
  billId,
  billNumber,
  patientName,
  amount,
  accounts,
}: BskyClaimSettleDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [accountId, setAccountId] = useState("")
  const [isPending, startTransition] = useTransition()

  const resetForm = () => {
    setAccountId("")
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) resetForm()
  }

  const handleConfirm = () => {
    if (!accountId) {
      toast.error("Please select the receiving ledger account")
      return
    }

    startTransition(async () => {
      const result = await settleBskyClaim({ billId, accountId })
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-teal-600 hover:bg-teal-700">
          <CheckCircle2 className="mr-1.5 h-4 w-4" />
          Mark as Paid
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-teal-600" />
            Settle BSKY Claim
          </DialogTitle>
          <DialogDescription>
            Confirm receipt of government payout and post it to the selected ledger.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-muted/40 p-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Patient</span>
            <span className="font-medium">{patientName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Bill</span>
            <Badge variant="outline" className="font-mono">{billNumber}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Claim Amount</span>
            <span className="text-lg font-bold">₹{amount.toLocaleString("en-IN")}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label>
            Deposit Ledger <span className="text-red-500">*</span>
          </Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select bank/cash ledger..." />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} (₹{account.currentBalance.toLocaleString("en-IN")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="bg-teal-600 hover:bg-teal-700" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Settling...
              </>
            ) : (
              "Confirm Settlement"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
