"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  processSalary,
  updateEmployeeSalary,
  type PayrollEmployee,
} from "@/app/actions/payroll"
import type { FinancialAccountData } from "@/app/actions/finance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Banknote, IndianRupee, Wallet2 } from "lucide-react"
import { useDebouncedValue } from "@/hooks/use-debounced-value"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function formatINR(amount: number) {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function PayrollClient({
  employees,
  accounts,
}: {
  employees: PayrollEmployee[]
  accounts: FinancialAccountData[]
}) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const debouncedQ = useDebouncedValue(q, 300)
  const [roleFilter, setRoleFilter] = useState("ALL")
  const [deptFilter, setDeptFilter] = useState("ALL")
  const [salaryPendingOnly, setSalaryPendingOnly] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const totalMonthlyBase = useMemo(
    () => employees.reduce((sum, e) => sum + (e.basicSalary || 0), 0),
    [employees]
  )
  const paidThisMonth = useMemo(() => {
    const now = new Date()
    const month = MONTHS[now.getMonth()]
    const year = now.getFullYear()
    return employees.filter((e) =>
      e.recentSalaryRecords.some((r) => r.month === month && r.year === year)
    ).length
  }, [employees])

  const monthNow = MONTHS[new Date().getMonth()]
  const yearNow = new Date().getFullYear()

  const roles = Array.from(new Set(employees.map((e) => e.role)))
  const depts = Array.from(new Set(employees.map((e) => e.department)))

  const filteredEmployees = employees.filter((e) => {
    const byQ =
      !debouncedQ ||
      e.name.toLowerCase().includes(debouncedQ.toLowerCase()) ||
      e.role.toLowerCase().includes(debouncedQ.toLowerCase()) ||
      e.department.toLowerCase().includes(debouncedQ.toLowerCase())
    const byRole = roleFilter === "ALL" || e.role === roleFilter
    const byDept = deptFilter === "ALL" || e.department === deptFilter
    const alreadyPaidThisMonth = e.recentSalaryRecords.some(
      (r) => r.month === monthNow && r.year === yearNow
    )
    const byPending = !salaryPendingOnly || !alreadyPaidThisMonth
    return byQ && byRole && byDept && byPending
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff Payroll &amp; Settlements</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Process monthly salaries directly from financial accounts.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <Label>Search employee</Label>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name / role / department" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Department</Label>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {depts.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={salaryPendingOnly}
                  onChange={(e) => setSalaryPendingOnly(e.target.checked)}
                />
                Salary pending this month
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <BulkProcessDialog
              selectedEmployees={employees.filter((e) => selectedIds.includes(e.id))}
              accounts={accounts}
              onDone={() => {
                setSelectedIds([])
                router.refresh()
              }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Employees</p>
                <p className="text-2xl font-bold">{employees.length}</p>
              </div>
              <Wallet2 className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Monthly Base Payroll</p>
                <p className="text-2xl font-bold">{formatINR(totalMonthlyBase)}</p>
              </div>
              <IndianRupee className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Paid This Month</p>
                <p className="text-2xl font-bold">{paidThisMonth} / {employees.length}</p>
              </div>
              <Banknote className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payroll Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-right">Basic Salary</TableHead>
                <TableHead>Last Paid Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((employee) => {
                const last = employee.recentSalaryRecords[0]
                return (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(employee.id)}
                        onChange={(e) => {
                          setSelectedIds((prev) =>
                            e.target.checked
                              ? [...prev, employee.id]
                              : prev.filter((id) => id !== employee.id)
                          )
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span>{formatINR(employee.basicSalary || 0)}</span>
                        <EditSalaryDialog
                          employeeId={employee.id}
                          employeeName={employee.name}
                          currentSalary={employee.basicSalary || 0}
                          onDone={() => router.refresh()}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      {last ? (
                        <div className="space-y-1">
                          <Badge variant="outline" className="text-xs">
                            {last.status}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {last.month} {last.year} • {formatINR(last.amountPaid)}
                          </p>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Not paid yet</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <ProcessSalaryDialog
                        employee={employee}
                        accounts={accounts}
                        onDone={() => router.refresh()}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function EditSalaryDialog({
  employeeId,
  employeeName,
  currentSalary,
  onDone,
}: {
  employeeId: string
  employeeName: string
  currentSalary: number
  onDone: () => void
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [salary, setSalary] = useState(String(currentSalary))

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) setSalary(String(currentSalary))
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Update Basic Salary</DialogTitle>
          <DialogDescription>{employeeName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Basic Salary (₹)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const newSalary = Number(salary || 0)
                  const result = await updateEmployeeSalary(employeeId, newSalary)
                  if (result.success) {
                    toast.success(result.message)
                    setOpen(false)
                    onDone()
                  } else {
                    toast.error(result.message)
                  }
                })
              }
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProcessSalaryDialog({
  employee,
  accounts,
  onDone,
}: {
  employee: PayrollEmployee
  accounts: FinancialAccountData[]
  onDone: () => void
}) {
  const now = new Date()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [month, setMonth] = useState(MONTHS[now.getMonth()])
  const [year, setYear] = useState(String(now.getFullYear()))
  const [bonus, setBonus] = useState("0")
  const [deductions, setDeductions] = useState("0")
  const [accountId, setAccountId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER")

  const bonusNum = Number(bonus || 0)
  const deductionsNum = Number(deductions || 0)
  const baseAmount = employee.basicSalary || 0
  const netPayable = Math.max(0, baseAmount + bonusNum - deductionsNum)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Process Salary</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Process Salary</DialogTitle>
          <DialogDescription>
            {employee.name} • {employee.role} • {employee.department}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input value={year} onChange={(e) => setYear(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Base Salary</Label>
              <Input value={String(baseAmount)} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Bonus</Label>
              <Input type="number" min="0" value={bonus} onChange={(e) => setBonus(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Deductions</Label>
              <Input type="number" min="0" value={deductions} onChange={(e) => setDeductions(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 flex items-center justify-between">
            <span className="text-sm font-medium">Net Payable</span>
            <span className="text-lg font-bold">{formatINR(netPayable)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Pay From Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) - {formatINR(acc.currentBalance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isPending || !accountId || Number(year) < 2000 || netPayable <= 0}
              onClick={() =>
                startTransition(async () => {
                  const result = await processSalary({
                    employeeId: employee.id,
                    month,
                    year: Number(year),
                    baseAmount,
                    bonus: bonusNum,
                    deductions: deductionsNum,
                    accountId,
                    paymentMethod,
                  })

                  if (result.success) {
                    toast.success(result.message)
                    setOpen(false)
                    onDone()
                  } else {
                    toast.error(result.message)
                  }
                })
              }
            >
              {isPending ? "Processing..." : "Confirm Payment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function BulkProcessDialog({
  selectedEmployees,
  accounts,
  onDone,
}: {
  selectedEmployees: PayrollEmployee[]
  accounts: FinancialAccountData[]
  onDone: () => void
}) {
  const now = new Date()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [month, setMonth] = useState(MONTHS[now.getMonth()])
  const [year, setYear] = useState(String(now.getFullYear()))
  const [accountId, setAccountId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={selectedEmployees.length === 0}>
          Bulk Process ({selectedEmployees.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Salary Process</DialogTitle>
          <DialogDescription>
            Process salary for {selectedEmployees.length} selected employee(s)
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Month</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Pay From Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type}) - {formatINR(acc.currentBalance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="CARD">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="text-sm font-medium mb-2">Employees</p>
          <div className="max-h-36 overflow-y-auto space-y-1 text-sm">
            {selectedEmployees.map((e) => (
              <div key={e.id} className="flex justify-between">
                <span>{e.name}</span>
                <span>{formatINR(e.basicSalary || 0)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            disabled={isPending || !accountId || selectedEmployees.length === 0}
            onClick={() =>
              startTransition(async () => {
                let successCount = 0
                let failCount = 0
                for (const employee of selectedEmployees) {
                  const result = await processSalary({
                    employeeId: employee.id,
                    month,
                    year: Number(year),
                    baseAmount: employee.basicSalary || 0,
                    bonus: 0,
                    deductions: 0,
                    accountId,
                    paymentMethod,
                  })
                  if (result.success) successCount += 1
                  else failCount += 1
                }
                if (successCount > 0) {
                  toast.success(`Processed ${successCount} salary payments`)
                }
                if (failCount > 0) {
                  toast.error(`${failCount} salary payment(s) failed`)
                }
                setOpen(false)
                onDone()
              })
            }
          >
            {isPending ? "Processing..." : "Confirm Bulk Payment"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

