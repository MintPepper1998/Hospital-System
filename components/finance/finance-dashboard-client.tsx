"use client"

import { useState, useTransition, useEffect } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
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
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Landmark,
  Banknote,
  Receipt,
  Pencil,
  Trash2,
  AlertTriangle,
  Settings2,
  CalendarIcon,
  Printer,
  Filter,
  Search,
  X,
} from "lucide-react"
import { toast } from "sonner"
import {
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getLedgerTransactions,
  type FinanceDashboardStats,
  type FinancialAccountData,
  type TransactionData,
} from "@/app/actions/finance"
import { useRouter } from "next/navigation"

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_INCOME_CATEGORIES = [
  "Patient Bill",
  "OPD Consultation",
  "Lab Fees",
  "Pharmacy Sale",
  "Room Rent",
  "Surgery Fee",
  "Insurance Claim",
  "Miscellaneous",
]

const DEFAULT_EXPENSE_CATEGORIES = [
  "Purchase",
  "Salary",
  "Utility Bill",
  "Rent",
  "Equipment",
  "Maintenance",
  "Transport",
  "Miscellaneous",
]

const LS_KEY_INCOME = "finance_income_categories"
const LS_KEY_EXPENSE = "finance_expense_categories"

function loadCategories(key: string, defaults: string[]): string[] {
  if (typeof window === "undefined") return defaults
  try {
    const stored = localStorage.getItem(key)
    if (stored) return JSON.parse(stored) as string[]
  } catch {}
  return defaults
}

function saveCategories(key: string, list: string[]) {
  try { localStorage.setItem(key, JSON.stringify(list)) } catch {}
}

const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "INSURANCE", "BSKY"]

// Legacy key mapping — transactions stored with old enum keys still render nicely
const CATEGORY_LABELS: Record<string, string> = {
  PATIENT_BILL: "Patient Bill",
  OPD_CONSULTATION: "OPD Consultation",
  LAB_FEES: "Lab Fees",
  PHARMACY_SALE: "Pharmacy Sale",
  ROOM_RENT: "Room Rent",
  SURGERY_FEE: "Surgery Fee",
  INSURANCE_CLAIM: "Insurance Claim",
  PURCHASE: "Purchase",
  SALARY: "Salary",
  UTILITY: "Utility Bill",
  RENT: "Rent",
  EQUIPMENT: "Equipment",
  MAINTENANCE: "Maintenance",
  TRANSPORT: "Transport",
  MISCELLANEOUS: "Miscellaneous",
}

const METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  UPI: "UPI / QR Code",
  CARD: "Card (Debit/Credit)",
  BANK_TRANSFER: "Bank Transfer / NEFT",
  INSURANCE: "Private Insurance / TPA",
  BSKY: "BSKY (Government)",
}

// ============================================
// FORMAT HELPERS
// ============================================

function formatINR(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

// ============================================
// MAIN COMPONENT
// ============================================

interface FinanceDashboardClientProps {
  stats: FinanceDashboardStats
}

export function FinanceDashboardClient({ stats }: FinanceDashboardClientProps) {
  const router = useRouter()
  const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INCOME_CATEGORIES)
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES)
  const [showCatDialog, setShowCatDialog] = useState(false)
  const [printTxn, setPrintTxn] = useState<any>(null)

  // Hydrate from localStorage on client mount
  useEffect(() => {
    setIncomeCategories(loadCategories(LS_KEY_INCOME, DEFAULT_INCOME_CATEGORIES))
    setExpenseCategories(loadCategories(LS_KEY_EXPENSE, DEFAULT_EXPENSE_CATEGORIES))
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Wallet className="h-6 w-6 text-teal-600" />
            Financial Overview
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track income, expenses, and manage your hospital&apos;s cash flow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCatDialog(true)}>
            <Settings2 className="mr-2 h-4 w-4" /> Categories
          </Button>
          <TransactionDialog
            type="INCOME"
            accounts={stats.accounts}
            categories={incomeCategories}
            onComplete={() => router.refresh()}
          />
          <TransactionDialog
            type="EXPENSE"
            accounts={stats.accounts}
            categories={expenseCategories}
            onComplete={() => router.refresh()}
          />
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Balance */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Cash & Bank</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">{formatINR(stats.totalBalance)}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Landmark className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            {/* Account breakdown */}
            <div className="mt-3 pt-3 border-t space-y-1">
              {stats.accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {acc.type === "CASH" ? <Banknote className="h-3 w-3" /> : <Landmark className="h-3 w-3" />}
                    {acc.name}
                  </span>
                  <span className="font-medium">{formatINR(acc.currentBalance)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Month Income */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Money In (This Month)</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{formatINR(stats.monthIncome)}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t">
              {format(new Date(), "MMMM yyyy")} collections
            </p>
          </CardContent>
        </Card>

        {/* Month Expense */}
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Money Out (This Month)</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{formatINR(stats.monthExpense)}</p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t">
              {format(new Date(), "MMMM yyyy")} expenditure
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ledger Transactions — Filterable, Unlimited */}
      <LedgerTransactionsSection
        initialTransactions={stats.recentTransactions}
        accounts={stats.accounts}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        onRefresh={() => router.refresh()}
        setPrintTxn={setPrintTxn}
      />
      {/* Manage Categories Dialog */}
      <ManageCategoriesDialog
        open={showCatDialog}
        onOpenChange={setShowCatDialog}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        onSaveIncome={(updated) => {
          setIncomeCategories(updated)
          saveCategories(LS_KEY_INCOME, updated)
        }}
        onSaveExpense={(updated) => {
          setExpenseCategories(updated)
          saveCategories(LS_KEY_EXPENSE, updated)
        }}
      />

      {/* ── HIDDEN PRINT SECTION FOR VOUCHER ── */}
      {printTxn && (
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
                padding: 40px;
              }
              div[role="dialog"], .bg-background\\/80, [data-state="open"] {
                display: none !important;
                visibility: hidden !important;
              }
            }
          `}</style>
          <div className="border-2 border-gray-800 p-8 rounded-lg max-w-3xl mx-auto font-sans">
            <div className="text-center border-b-2 border-gray-800 pb-6 mb-6">
              <h1 className="text-3xl font-bold uppercase tracking-wider text-gray-900">Hospital Receipt Voucher</h1>
              <p className="text-lg text-gray-600 mt-2">{printTxn.type === "INCOME" ? "Income Receipt" : "Expense Payment"}</p>
            </div>
            
            <div className="flex justify-between mb-8 text-sm">
              <div>
                <p><span className="font-semibold w-24 inline-block">Voucher No:</span> VCH-{printTxn.id.slice(-6).toUpperCase()}</p>
                <p><span className="font-semibold w-24 inline-block">Date:</span> {format(new Date(printTxn.date), "dd MMM yyyy, hh:mm a")}</p>
              </div>
              <div className="text-right">
                <p><span className="font-semibold inline-block mr-2">Account:</span> {printTxn.accountName}</p>
                <p><span className="font-semibold inline-block mr-2">Payment Mode:</span> {printTxn.paymentMethod}</p>
              </div>
            </div>

            <table className="w-full mb-12 border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-800 text-left">
                  <th className="py-3 px-4 font-bold text-gray-800 uppercase text-sm">Category</th>
                  <th className="py-3 px-4 font-bold text-gray-800 uppercase text-sm">Description / Particulars</th>
                  <th className="py-3 px-4 font-bold text-gray-800 uppercase text-sm text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-4 align-top">
                    {printTxn.category}
                  </td>
                  <td className="py-4 px-4 align-top text-gray-700 whitespace-pre-wrap">
                    {printTxn.description || "N/A"}
                  </td>
                  <td className="py-4 px-4 align-top text-right font-semibold text-lg">
                    {Number(printTxn.amount).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between items-end mt-20 pt-8 border-t border-gray-300">
              <div className="text-sm text-gray-500">
                <p>Printed on: {format(new Date(), "dd MMM yyyy, hh:mm a")}</p>
                <p>System Generated Voucher</p>
              </div>
              <div className="text-center">
                <div className="w-48 border-b border-gray-800 mb-2"></div>
                <p className="font-bold text-sm uppercase text-gray-800">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// TRANSACTION DIALOG
// ============================================

function TransactionDialog({
  type,
  accounts,
  categories,
  onComplete,
}: {
  type: "INCOME" | "EXPENSE"
  accounts: FinancialAccountData[]
  categories: string[]
  onComplete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [accountId, setAccountId] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState<Date>(new Date())

  const isIncome = type === "INCOME"

  const resetForm = () => {
    setAccountId("")
    setAmount("")
    setCategory("")
    setPaymentMethod("")
    setDescription("")
    setDate(new Date())
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!accountId) return toast.error("Select an account")
    if (!amount || parseFloat(amount) <= 0) return toast.error("Enter a valid amount")
    if (!category) return toast.error("Select a category")
    if (!paymentMethod) return toast.error("Select a payment method")

    startTransition(async () => {
      const result = await addTransaction({
        accountId,
        type,
        amount: parseFloat(amount),
        category,
        paymentMethod,
        description: description || undefined,
        date: date.toISOString(),
      })

      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        resetForm()
        onComplete()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        {isIncome ? (
          <Button className="bg-blue-600 hover:bg-blue-700 gap-1.5">
            <Plus className="h-4 w-4" />
            Add Income
          </Button>
        ) : (
          <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 gap-1.5">
            <Minus className="h-4 w-4" />
            Add Expense
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIncome ? (
              <><ArrowDownLeft className="h-5 w-5 text-blue-600" /> Record Income</>
            ) : (
              <><ArrowUpRight className="h-5 w-5 text-red-600" /> Record Expense</>
            )}
          </DialogTitle>
          <DialogDescription>
            {isIncome ? "Record money coming into the hospital" : "Record money going out of the hospital"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Date <span className="text-red-500">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Account <span className="text-red-500">*</span></Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.type === "CASH" ? "💵" : "🏦"} {acc.name} ({formatINR(acc.currentBalance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Amount (₹) <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Category <span className="text-red-500">*</span></Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}
                  >{CATEGORY_LABELS[cat] || cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Payment Method <span className="text-red-500">*</span></Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method..." />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {METHOD_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description / Notes</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isIncome ? "e.g., OPD payment from patient..." : "e.g., Electricity bill for January..."}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className={isIncome ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <>{isIncome ? "Record Income" : "Record Expense"}</>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// TRANSACTION EDIT DIALOG (same form as entry)
// ============================================

function TransactionEditDialog({
  txn,
  accounts,
  categories,
  onComplete,
}: {
  txn: {
    id: string
    accountId: string
    type: string
    amount: number
    category: string
    paymentMethod: string
    description: string | null
    date: string
  }
  accounts: FinancialAccountData[]
  categories: string[]
  onComplete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [accountId, setAccountId] = useState(txn.accountId)
  const [type, setType] = useState<"INCOME" | "EXPENSE">(txn.type as "INCOME" | "EXPENSE")
  const [amount, setAmount] = useState(String(txn.amount))
  const [category, setCategory] = useState(txn.category)
  const [paymentMethod, setPaymentMethod] = useState(txn.paymentMethod)
  const [description, setDescription] = useState(txn.description || "")
  const [date, setDate] = useState<Date>(new Date(txn.date))

  const isIncome = type === "INCOME"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId) return toast.error("Select an account")
    if (!amount || parseFloat(amount) <= 0) return toast.error("Enter a valid amount")
    if (!category) return toast.error("Select a category")
    if (!paymentMethod) return toast.error("Select a payment method")

    startTransition(async () => {
      const result = await updateTransaction(txn.id, {
        accountId,
        type,
        amount: parseFloat(amount),
        category,
        paymentMethod,
        description: description || undefined,
        date: date.toISOString(),
      })
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        onComplete()
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50" title="Edit transaction">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-blue-600" /> Edit Transaction
          </DialogTitle>
          <DialogDescription>Update this ledger entry. Account balance will be adjusted automatically.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Date <span className="text-red-500">*</span></Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Type toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Transaction Type <span className="text-red-500">*</span></Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={type === "INCOME" ? "default" : "outline"}
                className={type === "INCOME" ? "bg-blue-600 hover:bg-blue-700 flex-1" : "flex-1"}
                onClick={() => { setType("INCOME"); setCategory("") }}
              >
                <ArrowDownLeft className="h-3.5 w-3.5 mr-1" /> Income
              </Button>
              <Button
                type="button"
                size="sm"
                variant={type === "EXPENSE" ? "default" : "outline"}
                className={type === "EXPENSE" ? "bg-red-600 hover:bg-red-700 flex-1" : "flex-1"}
                onClick={() => { setType("EXPENSE"); setCategory("") }}
              >
                <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> Expense
              </Button>
            </div>
          </div>

          {/* Account */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Account <span className="text-red-500">*</span></Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.type === "CASH" ? "💵" : "🏦"} {acc.name} ({formatINR(acc.currentBalance)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Amount (₹) <span className="text-red-500">*</span></Label>
            <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Category <span className="text-red-500">*</span></Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat] || cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Payment Method <span className="text-red-500">*</span></Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue placeholder="Select method..." /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description / Notes</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending} className={isIncome ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}>
              {isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// TRANSACTION DELETE BUTTON
// ============================================

function TransactionDeleteButton({
  txnId,
  txnDescription,
  onComplete,
}: {
  txnId: string
  txnDescription: string
  onComplete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteTransaction(txnId)
      if (result.success) {
        toast.success(result.message)
        setOpen(false)
        onComplete()
      } else {
        toast.error(result.message)
        setOpen(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" title="Delete transaction">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" /> Delete Transaction?
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The account balance will be automatically reversed.
          </DialogDescription>
        </DialogHeader>
        <div className="py-3">
          <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-gray-700">
            <span className="font-medium">Entry:</span> {txnDescription}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// MANAGE CATEGORIES DIALOG
// ============================================

function ManageCategoriesDialog({
  open,
  onOpenChange,
  incomeCategories,
  expenseCategories,
  onSaveIncome,
  onSaveExpense,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  incomeCategories: string[]
  expenseCategories: string[]
  onSaveIncome: (updated: string[]) => void
  onSaveExpense: (updated: string[]) => void
}) {
  const [tab, setTab] = useState<"income" | "expense">("expense")
  const [incList, setIncList] = useState<string[]>([])
  const [expList, setExpList] = useState<string[]>([])
  const [newName, setNewName] = useState("")
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null)

  // Sync when dialog opens
  useEffect(() => {
    if (open) {
      setIncList([...incomeCategories])
      setExpList([...expenseCategories])
      setEditingIdx(null)
      setDeletingIdx(null)
      setNewName("")
    }
  }, [open, incomeCategories, expenseCategories])

  const activeList = tab === "income" ? incList : expList
  const setActiveList = tab === "income" ? setIncList : setExpList
  const onSave = tab === "income" ? onSaveIncome : onSaveExpense

  const handleAdd = () => {
    const trimmed = newName.trim()
    if (!trimmed) return toast.error("Category name is required")
    if (activeList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error("Category already exists")
    }
    const updated = [...activeList, trimmed]
    setActiveList(updated)
    setNewName("")
    onSave(updated)
    toast.success(`"${trimmed}" added`)
  }

  const handleRename = (idx: number) => {
    const trimmed = editName.trim()
    if (!trimmed) return toast.error("Name cannot be empty")
    if (activeList.some((c, i) => i !== idx && c.toLowerCase() === trimmed.toLowerCase())) {
      return toast.error("Category already exists")
    }
    const updated = activeList.map((c, i) => (i === idx ? trimmed : c))
    setActiveList(updated)
    setEditingIdx(null)
    onSave(updated)
    toast.success("Category renamed")
  }

  const handleDelete = (idx: number) => {
    const name = activeList[idx]
    const updated = activeList.filter((_, i) => i !== idx)
    setActiveList(updated)
    setDeletingIdx(null)
    onSave(updated)
    toast.success(`"${name}" removed`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-teal-600" /> Manage Categories
          </DialogTitle>
          <DialogDescription>
            Add, rename, or remove transaction categories.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => { setTab("income"); setEditingIdx(null); setDeletingIdx(null); setNewName("") }}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition ${tab === "income" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => { setTab("expense"); setEditingIdx(null); setDeletingIdx(null); setNewName("") }}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition ${tab === "expense" ? "bg-red-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            Expense
          </button>
        </div>

        {/* Add new */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`New ${tab} category...`}
            className="text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd() } }}
          />
          <Button size="sm" onClick={handleAdd} className={`shrink-0 ${tab === "income" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}`}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Category list */}
        <div className="mt-1 max-h-72 overflow-y-auto space-y-1.5">
          {activeList.map((cat, idx) => (
            <div key={idx} className="bg-gray-50 rounded-md text-sm">
              {deletingIdx === idx ? (
                <div className="px-3 py-2.5 space-y-2">
                  <p className="text-xs text-red-700 font-medium">Remove &quot;{cat}&quot;?</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={() => setDeletingIdx(null)}>Cancel</Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs flex-1" onClick={() => handleDelete(idx)}>Confirm</Button>
                  </div>
                </div>
              ) : editingIdx === idx ? (
                <div className="flex items-center gap-1.5 px-2 py-1.5">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-xs flex-1"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleRename(idx) }
                      if (e.key === "Escape") setEditingIdx(null)
                    }}
                  />
                  <Button size="sm" className={`h-7 w-7 p-0 ${tab === "income" ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"}`} onClick={() => handleRename(idx)} title="Save">
                    <span className="text-xs">✓</span>
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setEditingIdx(null)} title="Cancel">
                    <span className="text-xs">✕</span>
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="font-medium">{cat}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-50" title="Rename"
                      onClick={() => { setEditingIdx(idx); setEditName(cat) }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50" title="Delete"
                      onClick={() => setDeletingIdx(idx)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {activeList.length === 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">No categories. Add one above.</p>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// LEDGER TRANSACTIONS SECTION (FILTERABLE)
// ============================================

function LedgerTransactionsSection({
  initialTransactions,
  accounts,
  incomeCategories,
  expenseCategories,
  onRefresh,
  setPrintTxn,
}: {
  initialTransactions: TransactionData[]
  accounts: FinancialAccountData[]
  incomeCategories: string[]
  expenseCategories: string[]
  onRefresh: () => void
  setPrintTxn: (txn: any) => void
}) {
  const [transactions, setTransactions] = useState<TransactionData[]>(initialTransactions)
  const [total, setTotal] = useState(initialTransactions.length)
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoadedAll, setHasLoadedAll] = useState(false)

  // Filter state
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [filterCategory, setFilterCategory] = useState<string>("ALL")
  const [filterType, setFilterType] = useState<string>("ALL")

  // Combine all categories for filter dropdown
  const allCategories = [...new Set([...incomeCategories, ...expenseCategories])]

  const loadTransactions = async (filters?: {
    startDate?: string
    endDate?: string
    category?: string
    type?: "INCOME" | "EXPENSE"
  }) => {
    setIsLoading(true)
    try {
      const result = await getLedgerTransactions(filters)
      if (result.success) {
        setTransactions(result.data)
        setTotal(result.total)
        setHasLoadedAll(true)
      }
    } catch (err) {
      console.error("Failed to load transactions:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFilter = () => {
    loadTransactions({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      category: filterCategory !== "ALL" ? filterCategory : undefined,
      type: filterType !== "ALL" ? (filterType as "INCOME" | "EXPENSE") : undefined,
    })
  }

  const handleClearFilters = () => {
    setStartDate("")
    setEndDate("")
    setFilterCategory("ALL")
    setFilterType("ALL")
    loadTransactions()
  }

  const handleLoadAll = () => {
    loadTransactions()
  }

  const hasActiveFilters = startDate || endDate || filterCategory !== "ALL" || filterType !== "ALL"

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4 text-gray-500" />
              Ledger Transactions
            </CardTitle>
            <CardDescription>
              {hasLoadedAll
                ? `${total} transaction${total !== 1 ? "s" : ""}${hasActiveFilters ? " (filtered)" : " total"}`
                : `Showing last ${transactions.length} — click "Load All" to see all`
              }
            </CardDescription>
          </div>
          {!hasLoadedAll && (
            <Button variant="outline" size="sm" onClick={handleLoadAll} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Search className="h-3.5 w-3.5 mr-1.5" />}
              Load All
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Filter Bar */}
      <div className="px-6 pb-4">
        <div className="flex flex-wrap items-end gap-3 p-3 bg-gray-50 rounded-lg border">
          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">From</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 w-[150px] text-sm"
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">To</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 w-[150px] text-sm"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Category</label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 w-[180px] text-sm">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {allCategories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat] || cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Type</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="h-9 w-[130px] text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700" onClick={handleFilter} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Filter className="h-3.5 w-3.5 mr-1.5" />}
              Apply
            </Button>
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" className="h-9 text-muted-foreground" onClick={handleClearFilters}>
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <CardContent className="pt-0">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <IndianRupee className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="font-medium">{hasActiveFilters ? "No transactions match filters" : "No transactions yet"}</p>
            <p className="text-xs mt-1">
              {hasActiveFilters ? "Try adjusting the date range or category" : 'Use the "Add Income" or "Add Expense" buttons to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {format(new Date(txn.date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {txn.description || "—"}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{txn.accountName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {CATEGORY_LABELS[txn.category] || txn.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {METHOD_LABELS[txn.paymentMethod] || txn.paymentMethod}
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
                    <TableCell className={`text-right font-semibold text-sm ${txn.type === "INCOME" ? "text-blue-700" : "text-red-700"}`}>
                      {txn.type === "INCOME" ? "+" : "−"} {formatINR(txn.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TransactionEditDialog
                          txn={txn}
                          accounts={accounts}
                          categories={txn.type === "INCOME" ? incomeCategories : expenseCategories}
                          onComplete={() => { onRefresh(); handleFilter(); }}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                          title="Print Voucher"
                          onClick={() => {
                            setPrintTxn(txn)
                            setTimeout(() => { window.print(); setPrintTxn(null) }, 100)
                          }}
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <TransactionDeleteButton
                          txnId={txn.id}
                          txnDescription={txn.description || txn.category}
                          onComplete={() => { onRefresh(); handleFilter(); }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
