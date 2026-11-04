"use client"

import { useState, useTransition, useEffect } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
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
import {
  Wallet,
  Plus,
  ArrowLeftRight,
  Banknote,
  Landmark,
  Smartphone,
  CreditCard,
  Loader2,
  Pencil,
  PowerOff,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Eye,
} from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  createAccount,
  updateAccount,
  deactivateAccount,
  transferBetweenAccounts,
  type AccountsDashboardData,
  type AccountDetail,
} from "@/app/actions/accounts"
import {
  getCrossDepartmentAccounts,
  crossDepartmentTransfer,
  type CrossDeptAccount,
} from "@/app/actions/pharmacy-finance"

// ============================================
// HELPERS
// ============================================

function formatINR(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  CASH: <Banknote className="h-5 w-5 text-green-600" />,
  BANK: <Landmark className="h-5 w-5 text-blue-600" />,
  UPI: <Smartphone className="h-5 w-5 text-purple-600" />,
  CARD: <CreditCard className="h-5 w-5 text-orange-600" />,
}

const TYPE_COLORS: Record<string, string> = {
  CASH: "bg-green-50 border-green-200",
  BANK: "bg-blue-50 border-blue-200",
  UPI: "bg-purple-50 border-purple-200",
  CARD: "bg-orange-50 border-orange-200",
}

const TYPE_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK: "Bank",
  UPI: "UPI",
  CARD: "Card",
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  INSURANCE: "Insurance",
  BSKY: "BSKY",
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AccountsClient({ data }: { data: AccountsDashboardData }) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showCrossTransfer, setShowCrossTransfer] = useState(false)
  const [editAccount, setEditAccount] = useState<AccountDetail | null>(null)
  const [viewAccount, setViewAccount] = useState<AccountDetail | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-teal-600" />
            Accounts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all financial accounts — cash drawers, bank, UPI, and card terminals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCrossTransfer(true)} className="gap-1.5">
            <ArrowLeftRight className="h-4 w-4" /> Inter-Dept
          </Button>
          <Button variant="outline" onClick={() => setShowTransfer(true)} className="gap-1.5">
            <ArrowLeftRight className="h-4 w-4" /> Transfer
          </Button>
          <Button onClick={() => setShowCreate(true)} className="bg-teal-600 hover:bg-teal-700 gap-1.5">
            <Plus className="h-4 w-4" /> New Account
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Balance", value: data.grandTotal, color: "text-gray-900", bg: "bg-white" },
          { label: "Cash", value: data.totalCash, color: "text-green-700", bg: "bg-green-50" },
          { label: "Bank", value: data.totalBank, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "UPI", value: data.totalUPI, color: "text-purple-700", bg: "bg-purple-50" },
          { label: "Card", value: data.totalCard, color: "text-orange-700", bg: "bg-orange-50" },
        ].map((s) => (
          <Card key={s.label} className={`${s.bg} border shadow-sm`}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className={`text-xl font-bold mt-1 ${s.color}`}>{formatINR(s.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Account Cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">All Accounts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.accounts.map((acc) => (
            <Card key={acc.id} className={`border ${TYPE_COLORS[acc.type] || "bg-gray-50"} hover:shadow-md transition-shadow`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    {TYPE_ICONS[acc.type] || <Wallet className="h-5 w-5 text-gray-500" />}
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_LABELS[acc.type] || acc.type}
                        {acc.accountNumber && ` • ${acc.accountNumber}`}
                        {acc.bankName && ` • ${acc.bankName}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {acc.transactionCount} txns
                  </Badge>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                    <p className={`text-lg font-bold ${acc.currentBalance >= 0 ? "text-gray-900" : "text-red-600"}`}>
                      {formatINR(acc.currentBalance)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="View" onClick={() => setViewAccount(acc)}>
                      <Eye className="h-3.5 w-3.5 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit" onClick={() => setEditAccount(acc)}>
                      <Pencil className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-600" /> Recent Transactions (All Accounts)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Account</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Method</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentTransactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="text-sm whitespace-nowrap">{format(new Date(txn.date), "dd MMM yyyy")}</TableCell>
                      <TableCell className="text-sm">{txn.accountName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">{txn.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {txn.type === "INCOME" ? (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1" variant="outline">
                            <ArrowDownLeft className="h-3 w-3" /> In
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 border-red-200 gap-1" variant="outline">
                            <ArrowUpRight className="h-3 w-3" /> Out
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{METHOD_LABELS[txn.paymentMethod] || txn.paymentMethod}</TableCell>
                      <TableCell className={`text-right font-semibold text-sm ${txn.type === "INCOME" ? "text-blue-700" : "text-red-700"}`}>
                        {txn.type === "INCOME" ? "+" : "−"} {formatINR(txn.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateAccountDialog open={showCreate} onOpenChange={setShowCreate} onComplete={() => router.refresh()} />
      <TransferDialog open={showTransfer} onOpenChange={setShowTransfer} accounts={data.accounts} onComplete={() => router.refresh()} />
      <CrossDeptTransferDialog open={showCrossTransfer} onOpenChange={setShowCrossTransfer} onComplete={() => router.refresh()} />
      {editAccount && (
        <EditAccountDialog account={editAccount} onOpenChange={() => setEditAccount(null)} onComplete={() => { setEditAccount(null); router.refresh() }} />
      )}
      {viewAccount && (
        <ViewAccountDialog account={viewAccount} onClose={() => setViewAccount(null)} />
      )}
    </div>
  )
}

// ============================================
// CREATE ACCOUNT DIALOG
// ============================================

function CreateAccountDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState("")
  const [type, setType] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [bankName, setBankName] = useState("")
  const [ifscCode, setIfscCode] = useState("")
  const [description, setDescription] = useState("")
  const [openingBalance, setOpeningBalance] = useState("")

  const reset = () => {
    setName(""); setType(""); setAccountNumber(""); setBankName(""); setIfscCode(""); setDescription(""); setOpeningBalance("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error("Account name is required")
    if (!type) return toast.error("Select an account type")

    startTransition(async () => {
      const result = await createAccount({
        name: name.trim(),
        type,
        accountNumber: accountNumber || undefined,
        bankName: bankName || undefined,
        ifscCode: ifscCode || undefined,
        description: description || undefined,
        openingBalance: openingBalance ? parseFloat(openingBalance) : 0,
      })
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        reset()
        onComplete()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-teal-600" /> Create New Account
          </DialogTitle>
          <DialogDescription>Add a new cash drawer, bank account, UPI, or card terminal.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Account Name <span className="text-red-500">*</span></Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., HDFC Savings" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type <span className="text-red-500">*</span></Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">💵 Cash</SelectItem>
                  <SelectItem value="BANK">🏦 Bank</SelectItem>
                  <SelectItem value="UPI">📱 UPI</SelectItem>
                  <SelectItem value="CARD">💳 Card Terminal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {(type === "BANK" || type === "UPI" || type === "CARD") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{type === "UPI" ? "UPI ID" : type === "CARD" ? "Terminal ID" : "Account Number"}</Label>
                <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder={type === "UPI" ? "hospital@upi" : "Enter number..."} />
              </div>
              {type === "BANK" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Bank Name</Label>
                    <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g., HDFC, SBI" />
                  </div>
                </>
              )}
            </div>
          )}

          {type === "BANK" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">IFSC Code</Label>
              <Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} placeholder="e.g., HDFC0001234" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Opening Balance (₹)</Label>
            <Input type="number" step="0.01" min="0" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0.00" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description / Notes</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional notes..." rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-teal-600 hover:bg-teal-700">
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// EDIT ACCOUNT DIALOG
// ============================================

function EditAccountDialog({
  account,
  onOpenChange,
  onComplete,
}: {
  account: AccountDetail
  onOpenChange: () => void
  onComplete: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(account.name)
  const [accountNumber, setAccountNumber] = useState(account.accountNumber || "")
  const [bankName, setBankName] = useState(account.bankName || "")
  const [ifscCode, setIfscCode] = useState(account.ifscCode || "")
  const [description, setDescription] = useState(account.description || "")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return toast.error("Name is required")

    startTransition(async () => {
      const result = await updateAccount(account.id, {
        name, accountNumber, bankName, ifscCode, description,
      })
      if (result.success) {
        toast.success(result.message)
        onComplete()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleDeactivate = () => {
    startTransition(async () => {
      const result = await deactivateAccount(account.id)
      if (result.success) {
        toast.success(result.message)
        onComplete()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-blue-600" /> Edit Account
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Account Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Account / UPI / Terminal #</Label>
              <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Bank Name</Label>
              <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">IFSC Code</Label>
            <Input value={ifscCode} onChange={(e) => setIfscCode(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <DialogFooter className="flex justify-between">
            <Button type="button" variant="destructive" onClick={handleDeactivate} disabled={isPending} className="gap-1">
              <PowerOff className="h-3.5 w-3.5" /> Deactivate
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onOpenChange}>Cancel</Button>
              <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// TRANSFER DIALOG
// ============================================

function TransferDialog({
  open,
  onOpenChange,
  accounts,
  onComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: AccountDetail[]
  onComplete: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")

  const reset = () => { setFromId(""); setToId(""); setAmount(""); setNotes("") }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromId) return toast.error("Select source account")
    if (!toId) return toast.error("Select destination account")
    if (fromId === toId) return toast.error("Cannot transfer to the same account")
    if (!amount || parseFloat(amount) <= 0) return toast.error("Enter a valid amount")

    startTransition(async () => {
      const result = await transferBetweenAccounts({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: parseFloat(amount),
        notes: notes || undefined,
      })
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        reset()
        onComplete()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-teal-600" /> Transfer Funds
          </DialogTitle>
          <DialogDescription>Move money between your accounts.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">From Account <span className="text-red-500">*</span></Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger><SelectValue placeholder="Select source..." /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} ({formatINR(a.currentBalance)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">To Account <span className="text-red-500">*</span></Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger><SelectValue placeholder="Select destination..." /></SelectTrigger>
              <SelectContent>
                {accounts.filter((a) => a.id !== fromId).map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} ({formatINR(a.currentBalance)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Amount (₹) <span className="text-red-500">*</span></Label>
            <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for transfer..." rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-teal-600 hover:bg-teal-700">
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transferring...</> : "Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// VIEW ACCOUNT DIALOG (details + txn list)
// ============================================

function ViewAccountDialog({
  account,
  onClose,
}: {
  account: AccountDetail
  onClose: () => void
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {TYPE_ICONS[account.type]} {account.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-semibold">{TYPE_LABELS[account.type] || account.type}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Current Balance</p>
              <p className={`font-bold text-lg ${account.currentBalance >= 0 ? "text-green-700" : "text-red-600"}`}>
                {formatINR(account.currentBalance)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Opening Balance</p>
              <p className="font-medium">{formatINR(account.openingBalance)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Total Transactions</p>
              <p className="font-medium">{account.transactionCount}</p>
            </div>
          </div>
          {(account.accountNumber || account.bankName || account.ifscCode) && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              {account.bankName && <p><span className="text-muted-foreground">Bank:</span> {account.bankName}</p>}
              {account.accountNumber && <p><span className="text-muted-foreground">A/c #:</span> {account.accountNumber}</p>}
              {account.ifscCode && <p><span className="text-muted-foreground">IFSC:</span> {account.ifscCode}</p>}
            </div>
          )}
          {account.description && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <p>{account.description}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Created: {format(new Date(account.createdAt), "dd MMM yyyy")}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// CROSS-DEPARTMENT TRANSFER DIALOG
// ============================================

function CrossDeptTransferDialog({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [hospitalAccounts, setHospitalAccounts] = useState<CrossDeptAccount[]>([])
  const [pharmacyAccounts, setPharmacyAccounts] = useState<CrossDeptAccount[]>([])
  const [direction, setDirection] = useState<"HOSPITAL_TO_PHARMACY" | "PHARMACY_TO_HOSPITAL">("HOSPITAL_TO_PHARMACY")
  const [fromId, setFromId] = useState("")
  const [toId, setToId] = useState("")
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [loaded, setLoaded] = useState(false)

  const reset = () => { setFromId(""); setToId(""); setAmount(""); setNotes(""); setDirection("HOSPITAL_TO_PHARMACY") }

  // Load accounts when dialog opens
  useEffect(() => {
    let isMounted = true
    const loadAccounts = async () => {
      if (open && !loaded) {
        const data = await getCrossDepartmentAccounts()
        if (isMounted) {
          setHospitalAccounts(data.hospital)
          setPharmacyAccounts(data.pharmacy)
          setLoaded(true)
        }
      }
    }
    loadAccounts()
    return () => { isMounted = false }
  }, [open, loaded])

  const sourceAccounts = direction === "HOSPITAL_TO_PHARMACY" ? hospitalAccounts : pharmacyAccounts
  const destAccounts = direction === "HOSPITAL_TO_PHARMACY" ? pharmacyAccounts : hospitalAccounts

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromId) return toast.error("Select source account")
    if (!toId) return toast.error("Select destination account")
    if (!amount || parseFloat(amount) <= 0) return toast.error("Enter a valid amount")

    startTransition(async () => {
      const result = await crossDepartmentTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amount: parseFloat(amount),
        notes: notes || undefined,
      })
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        reset()
        setLoaded(false)
        onComplete()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { reset(); setLoaded(false) } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-teal-600" /> Inter-Department Transfer
          </DialogTitle>
          <DialogDescription>Transfer funds between Hospital and Pharmacy accounts.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Direction</Label>
            <Select value={direction} onValueChange={(v: "HOSPITAL_TO_PHARMACY" | "PHARMACY_TO_HOSPITAL") => { setDirection(v); setFromId(""); setToId("") }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HOSPITAL_TO_PHARMACY">🏥 Hospital → 💊 Pharmacy</SelectItem>
                <SelectItem value="PHARMACY_TO_HOSPITAL">💊 Pharmacy → 🏥 Hospital</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">From Account <span className="text-red-500">*</span></Label>
            <Select value={fromId} onValueChange={setFromId}>
              <SelectTrigger><SelectValue placeholder="Select source..." /></SelectTrigger>
              <SelectContent>
                {sourceAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} ({formatINR(a.currentBalance)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">To Account <span className="text-red-500">*</span></Label>
            <Select value={toId} onValueChange={setToId}>
              <SelectTrigger><SelectValue placeholder="Select destination..." /></SelectTrigger>
              <SelectContent>
                {destAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} ({formatINR(a.currentBalance)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Amount (₹) <span className="text-red-500">*</span></Label>
            <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for transfer..." rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className="bg-teal-600 hover:bg-teal-700">
              {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Transferring...</> : "Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
