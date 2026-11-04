"use client"

import { useState, useEffect, useMemo } from "react"
import {
  getPayrollData,
  processMasterFinanceSalary,
  batchProcessMasterFinanceSalaries,
  updateMasterFinanceEmployeeSalary,
} from "@/app/actions/master-finance-remaining"
import {
  Users,
  IndianRupee,
  CheckCircle2,
  Clock,
  Filter,
  Building2,
  Search,
  Zap,
  Printer,
  RefreshCw,
  X,
  AlertCircle,
  Edit3,
  ChevronRight,
  FileText,
  Banknote,
  Sparkles,
  Download,
  CreditCard,
  Wallet,
  ShieldCheck,
  Check,
  ArrowRight,
} from "lucide-react"
import { toast } from "sonner"

interface SalaryRecordInfo {
  id: string
  amountPaid: number
  bonus: number
  deductions: number
  status: string
  paymentDate: string
  transactionId: string | null
  voucherNumber: string | null
  accountName: string | null
  paymentMethod: string | null
}

interface EmployeePayroll {
  id: string
  name: string
  role: string
  department: string
  basicSalary: number
  record: SalaryRecordInfo | null
}

interface FinancialAccountInfo {
  id: string
  name: string
  type: string
  bankName: string | null
  accountNumber: string | null
  currentBalance: number
}

interface DeptData {
  name: string
  count: number
  paid: number
  basic: number
}

const MONTH_NAMES = [
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

export function PayrollClient() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"))
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // Data
  const [employees, setEmployees] = useState<EmployeePayroll[]>([])
  const [accounts, setAccounts] = useState<FinancialAccountInfo[]>([])
  const [totalBasic, setTotalBasic] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)
  const [totalBonus, setTotalBonus] = useState(0)
  const [totalDeductions, setTotalDeductions] = useState(0)
  const [paidCount, setPaidCount] = useState(0)
  const [pendingCount, setPendingCount] = useState(0)
  const [departments, setDepartments] = useState<DeptData[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "UNPAID" | "PAID">("ALL")
  const [selectedDept, setSelectedDept] = useState<string>("ALL")

  // Modals state
  const [disburseModalEmp, setDisburseModalEmp] = useState<EmployeePayroll | null>(null)
  const [disburseForm, setDisburseForm] = useState({
    basicSalary: 0,
    bonus: 0,
    deductions: 0,
    accountId: "",
    paymentMethod: "BANK_TRANSFER",
    notes: "",
  })

  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchAccountId, setBatchAccountId] = useState("")
  const [batchPaymentMethod, setBatchPaymentMethod] = useState("BANK_TRANSFER")

  const [payslipModalData, setPayslipModalData] = useState<{
    employee: EmployeePayroll
    record: SalaryRecordInfo
  } | null>(null)

  const [editSalaryModalEmp, setEditSalaryModalEmp] = useState<EmployeePayroll | null>(null)
  const [editSalaryAmount, setEditSalaryAmount] = useState(0)

  // Fetch Payroll Data
  async function fetchData() {
    setLoading(true)
    try {
      const data = await getPayrollData({ month, year })
      setEmployees(JSON.parse(JSON.stringify(data.employees)))
      setAccounts(JSON.parse(JSON.stringify(data.accounts || [])))
      setTotalBasic(data.totalBasic)
      setTotalPaid(data.totalPaid)
      setTotalBonus(data.totalBonus)
      setTotalDeductions(data.totalDeductions)
      setPaidCount(data.paidCount)
      setPendingCount(data.pendingCount)
      setDepartments(data.departments)

      // Set default account for disburse modals if available
      if (data.accounts && data.accounts.length > 0 && !batchAccountId) {
        const defaultAcc = data.accounts.find((a: any) => a.currentBalance > 0) || data.accounts[0]
        setBatchAccountId(defaultAcc.id)
      }
    } catch (e: any) {
      console.error(e)
      toast.error("Failed to load payroll data: " + (e.message || "Unknown error"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [month, year])

  // Total liquid hospital reserves
  const totalLiquidReserves = useMemo(() => {
    return accounts.reduce((acc, a) => acc + (a.currentBalance > 0 ? a.currentBalance : 0), 0)
  }, [accounts])

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch =
        !q ||
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        (emp.record?.voucherNumber && emp.record.voucherNumber.toLowerCase().includes(q))

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PAID" && emp.record !== null) ||
        (statusFilter === "UNPAID" && emp.record === null)

      const matchesDept = selectedDept === "ALL" || emp.department === selectedDept

      return matchesSearch && matchesStatus && matchesDept
    })
  }, [employees, searchQuery, statusFilter, selectedDept])

  // Eligible unpaid employees for batch
  const eligibleUnpaidEmployees = useMemo(() => {
    return employees.filter((e) => !e.record && e.basicSalary > 0)
  }, [employees])

  const totalBatchRequired = useMemo(() => {
    return eligibleUnpaidEmployees.reduce((sum, e) => sum + e.basicSalary, 0)
  }, [eligibleUnpaidEmployees])

  // Open single disburse modal
  function openDisburseModal(emp: EmployeePayroll) {
    const defaultAcc = accounts.find((a) => a.currentBalance >= emp.basicSalary) || accounts[0]
    setDisburseModalEmp(emp)
    setDisburseForm({
      basicSalary: emp.basicSalary,
      bonus: 0,
      deductions: 0,
      accountId: defaultAcc?.id || "",
      paymentMethod: "BANK_TRANSFER",
      notes: "",
    })
  }

  // Calculate live net payable in disburse modal
  const liveNetPayable = useMemo(() => {
    const base = Number(disburseForm.basicSalary) || 0
    const b = Number(disburseForm.bonus) || 0
    const d = Number(disburseForm.deductions) || 0
    return Math.max(0, Math.round((base + b - d) * 100) / 100)
  }, [disburseForm])

  // Submit single salary disburse
  async function handleDisburseSubmit() {
    if (!disburseModalEmp) return
    if (!disburseForm.accountId) {
      toast.error("Please select a disbursement account.")
      return
    }
    if (liveNetPayable <= 0) {
      toast.error("Net payable salary must be greater than ₹0.")
      return
    }

    const selectedAcc = accounts.find((a) => a.id === disburseForm.accountId)
    if (selectedAcc && selectedAcc.currentBalance < liveNetPayable) {
      toast.error(
        `Insufficient balance in ${selectedAcc.name}. Available: ₹${selectedAcc.currentBalance.toLocaleString("en-IN")}`
      )
      return
    }

    setActionLoading(true)
    try {
      const res = await processMasterFinanceSalary({
        employeeId: disburseModalEmp.id,
        month,
        year,
        accountId: disburseForm.accountId,
        basicSalary: disburseForm.basicSalary,
        bonus: disburseForm.bonus,
        deductions: disburseForm.deductions,
        paymentMethod: disburseForm.paymentMethod,
        notes: disburseForm.notes,
      })

      if (res.success) {
        toast.success(res.message || "Salary successfully disbursed!")
        setDisburseModalEmp(null)
        await fetchData()
      } else {
        toast.error(res.message || "Failed to process salary")
      }
    } catch (e: any) {
      toast.error(e.message || "Error processing salary")
    } finally {
      setActionLoading(false)
    }
  }

  // Submit batch disburse
  async function handleBatchSubmit() {
    if (!batchAccountId) {
      toast.error("Please select a disbursement account.")
      return
    }
    if (eligibleUnpaidEmployees.length === 0) {
      toast.error("No eligible unpaid employees found with configured salary.")
      return
    }

    const selectedAcc = accounts.find((a) => a.id === batchAccountId)
    if (selectedAcc && selectedAcc.currentBalance < totalBatchRequired) {
      toast.error(
        `Insufficient balance in ${selectedAcc.name}. Required: ₹${totalBatchRequired.toLocaleString("en-IN")}, Available: ₹${selectedAcc.currentBalance.toLocaleString("en-IN")}`
      )
      return
    }

    setActionLoading(true)
    try {
      const res = await batchProcessMasterFinanceSalaries({
        month,
        year,
        accountId: batchAccountId,
        paymentMethod: batchPaymentMethod,
      })

      if (res.success) {
        toast.success(res.message)
        setBatchModalOpen(false)
        await fetchData()
      } else {
        toast.error(res.message || "Failed to process batch payroll")
      }
    } catch (e: any) {
      toast.error(e.message || "Error processing batch payroll")
    } finally {
      setActionLoading(false)
    }
  }

  // Submit edit base salary
  async function handleEditSalarySubmit() {
    if (!editSalaryModalEmp) return
    if (editSalaryAmount < 0) {
      toast.error("Salary amount cannot be negative.")
      return
    }

    setActionLoading(true)
    try {
      const res = await updateMasterFinanceEmployeeSalary({
        employeeId: editSalaryModalEmp.id,
        basicSalary: editSalaryAmount,
      })

      if (res.success) {
        toast.success(`Base salary updated for ${editSalaryModalEmp.name}`)
        setEditSalaryModalEmp(null)
        await fetchData()
      } else {
        toast.error(res.message || "Failed to update salary")
      }
    } catch (e: any) {
      toast.error(e.message || "Error updating salary")
    } finally {
      setActionLoading(false)
    }
  }

  // Export CSV
  function exportPayrollCSV() {
    if (employees.length === 0) return
    const headers = [
      "Staff Name",
      "Role",
      "Department",
      "Base Salary (INR)",
      "Bonus (INR)",
      "Deductions (INR)",
      "Net Paid (INR)",
      "Status",
      "Voucher Number",
      "Disbursement Account",
      "Payment Date",
    ]

    const rows = employees.map((emp) => [
      `"${emp.name}"`,
      `"${emp.role}"`,
      `"${emp.department}"`,
      emp.basicSalary,
      emp.record?.bonus || 0,
      emp.record?.deductions || 0,
      emp.record?.amountPaid || (emp.basicSalary),
      emp.record ? "PAID" : "PENDING",
      `"${emp.record?.voucherNumber || ""}"`,
      `"${emp.record?.accountName || ""}"`,
      `"${emp.record?.paymentDate ? new Date(emp.record.paymentDate).toLocaleDateString("en-IN") : ""}"`,
    ])

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Payroll_Register_${MONTH_NAMES[parseInt(month) - 1]}_${year}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Quick Preset Helper
  function applyPreset(presetMonth: number, presetYear: number) {
    setMonth(String(presetMonth).padStart(2, "0"))
    setYear(presetYear)
  }

  const currentMonthNum = now.getMonth() + 1
  const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1
  const prevMonthYear = currentMonthNum === 1 ? now.getFullYear() - 1 : now.getFullYear()

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* COMMAND TERMINAL HEADER                                          */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 md:p-8 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ACTIVE DISBURSEMENT CONSOLE
              </span>
              <span className="text-slate-400 text-xs font-mono">MASTER FINANCE // PAYROLL</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Users className="w-7 h-7 text-indigo-400" />
              Hospital Staff Payroll & Vouchers
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Audited salary execution terminal. Generates balanced double-entry payment vouchers (
              <span className="text-indigo-300 font-mono font-medium">PV-XXXXX</span>), debits verified cash/bank accounts,
              and posts live to the General Ledger & Day Book.
            </p>
          </div>

          {/* Quick Presets & Batch Action */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setBatchModalOpen(true)}
              disabled={eligibleUnpaidEmployees.length === 0 || loading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/40 hover:shadow-emerald-900/60 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-white" />
              Batch Disburse ({eligibleUnpaidEmployees.length} Pending)
            </button>

            <button
              onClick={exportPayrollCSV}
              disabled={employees.length === 0}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-sm font-medium transition cursor-pointer disabled:opacity-40"
              title="Export Register as CSV"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 transition cursor-pointer"
              title="Refresh register"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Period Selector Strip */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-medium">Quick Periods:</span>
            <button
              onClick={() => applyPreset(currentMonthNum, now.getFullYear())}
              className={`px-3 py-1.5 rounded-lg font-mono transition cursor-pointer ${
                parseInt(month) === currentMonthNum && year === now.getFullYear()
                  ? "bg-indigo-600 text-white font-bold"
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-300"
              }`}
            >
              This Month ({MONTH_NAMES[currentMonthNum - 1]?.slice(0, 3)} {now.getFullYear()})
            </button>
            <button
              onClick={() => applyPreset(prevMonthNum, prevMonthYear)}
              className={`px-3 py-1.5 rounded-lg font-mono transition cursor-pointer ${
                parseInt(month) === prevMonthNum && year === prevMonthYear
                  ? "bg-indigo-600 text-white font-bold"
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-300"
              }`}
            >
              Last Month ({MONTH_NAMES[prevMonthNum - 1]?.slice(0, 3)} {prevMonthYear})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Custom Cycle:</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 font-mono focus:border-indigo-500 outline-none"
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={String(idx + 1).padStart(2, "0")}>
                  {name}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-100 font-mono focus:border-indigo-500 outline-none"
            >
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* FINANCIAL HEALTH & DISBURSEMENT KPI STRIP                        */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total Payroll */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500 flex items-center justify-between mb-1">
            <span>MONTHLY BASE COMMITMENT</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-slate-900">
            ₹{totalBasic.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />
            {employees.length} active staff on roster
          </div>
        </div>

        {/* KPI 2: Paid To Date */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-emerald-200 transition">
          <div className="text-[11px] font-semibold tracking-wider text-emerald-600 flex items-center justify-between mb-1">
            <span>DISBURSED TO DATE</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-emerald-600">
            ₹{totalPaid.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
            <span>
              {paidCount} of {employees.length} paid
            </span>
            <span className="text-slate-400">
              ({employees.length > 0 ? Math.round((paidCount / employees.length) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* KPI 3: Pending Disbursement */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-amber-200 transition">
          <div className="text-[11px] font-semibold tracking-wider text-amber-600 flex items-center justify-between mb-1">
            <span>PENDING DISBURSEMENT</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-amber-600">
            ₹{Math.max(0, totalBasic - totalPaid).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">
            {pendingCount} staff members awaiting payout
          </div>
        </div>

        {/* KPI 4: Allowances & Deductions */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider text-slate-500 flex items-center justify-between mb-1">
            <span>ADJUSTMENTS APPLIED</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold font-mono text-emerald-600">
              +₹{totalBonus.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-base font-bold font-mono text-rose-600">
              -₹{totalDeductions.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Net: ₹{(totalBonus - totalDeductions).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* KPI 5: Liquid Reserves */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 text-white shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider text-slate-400 flex items-center justify-between mb-1">
            <span>HOSPITAL LIQUID RESERVES</span>
            <Wallet className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-teal-400">
            ₹{totalLiquidReserves.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {accounts.length} active bank & cash drawers
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* DEPARTMENTAL DISBURSEMENT ALLOCATION PROGRESS                    */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {departments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold tracking-wider uppercase text-slate-600 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              Department Payroll Distribution & Utilization
            </h3>
            <span className="text-xs text-slate-400">{departments.length} functional units</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {departments.map((dept) => {
              const pct = dept.basic > 0 ? Math.min(100, Math.round((dept.paid / dept.basic) * 100)) : 0
              return (
                <div
                  key={dept.name}
                  onClick={() => setSelectedDept(selectedDept === dept.name ? "ALL" : dept.name)}
                  className={`p-3 rounded-lg border transition cursor-pointer ${
                    selectedDept === dept.name
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-slate-100 bg-slate-50/60 hover:bg-slate-100/60"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                    <span className="truncate">{dept.name}</span>
                    <span className="text-[10px] text-slate-500">{dept.count}</span>
                  </div>
                  <div className="text-xs font-mono font-medium text-slate-700 mt-1">
                    ₹{dept.paid.toLocaleString("en-IN")} <span className="text-[10px] text-slate-400">/ ₹{dept.basic.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-indigo-500" : "bg-slate-300"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* FILTER & SEARCH CONTROL STRIP                                    */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, designation, department, or voucher #..."
            className="w-full pl-9 pr-3 py-2 text-xs md:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium self-start md:self-auto">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${
              statusFilter === "ALL" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Staff ({employees.length})
          </button>
          <button
            onClick={() => setStatusFilter("UNPAID")}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
              statusFilter === "UNPAID" ? "bg-white text-amber-700 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Unpaid ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter("PAID")}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${
              statusFilter === "PAID" ? "bg-white text-emerald-700 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Disbursed ({paidCount})
          </button>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 bg-white focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name} ({d.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* STAFF PAYROLL REGISTER TABLE                                     */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Staff Payroll Register</h2>
            <p className="text-xs text-slate-500">
              Period: {MONTH_NAMES[parseInt(month) - 1]} {year} — Showing {filteredEmployees.length} of {employees.length} records
            </p>
          </div>
          <div className="text-xs font-mono text-slate-400">DOUBLE-ENTRY POSTING: POSTED</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 text-[11px] font-semibold tracking-wider text-slate-600 uppercase border-b border-slate-200">
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4 text-right">Base Pay</th>
                <th className="py-3 px-4 text-right">Bonus / Allow.</th>
                <th className="py-3 px-4 text-right">Deductions</th>
                <th className="py-3 px-4 text-right">Net Amount</th>
                <th className="py-3 px-4">Audit Voucher & Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                      <span className="text-xs">Loading staff register and vouchers...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <span className="text-sm font-medium text-slate-600">No staff records match filter</span>
                      <span className="text-xs text-slate-400">Try adjusting your search query or status filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isPaid = Boolean(emp.record)
                  const netAmount = isPaid ? emp.record!.amountPaid : emp.basicSalary

                  return (
                    <tr
                      key={emp.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isPaid ? "bg-white" : "bg-amber-50/20"
                      }`}
                    >
                      {/* 1. Staff Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                              {emp.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">ID: {emp.id.slice(-6).toUpperCase()}</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Department & Role */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            {emp.role}
                          </span>
                          <div className="text-[11px] text-slate-500 truncate max-w-[140px]">{emp.department}</div>
                        </div>
                      </td>

                      {/* 3. Base Pay */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 group">
                          <span className="font-mono font-medium text-slate-800">
                            ₹{emp.basicSalary.toLocaleString("en-IN")}
                          </span>
                          {!isPaid && (
                            <button
                              onClick={() => {
                                setEditSalaryModalEmp(emp)
                                setEditSalaryAmount(emp.basicSalary)
                              }}
                              className="text-slate-300 hover:text-indigo-600 transition p-0.5 cursor-pointer"
                              title="Edit base recurring salary"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* 4. Bonus */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {isPaid && emp.record!.bonus > 0 ? (
                          <span className="text-emerald-600 font-medium">
                            +₹{emp.record!.bonus.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* 5. Deductions */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {isPaid && emp.record!.deductions > 0 ? (
                          <span className="text-rose-600 font-medium">
                            -₹{emp.record!.deductions.toLocaleString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* 6. Net Amount */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                        ₹{netAmount.toLocaleString("en-IN")}
                      </td>

                      {/* 7. Status & Voucher */}
                      <td className="py-3.5 px-4">
                        {isPaid ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-3 h-3 text-emerald-600" />
                                PAID
                              </span>
                              {emp.record?.voucherNumber && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {emp.record.voucherNumber}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {emp.record?.accountName || "Bank"} •{" "}
                              {emp.record?.paymentDate
                                ? new Date(emp.record.paymentDate).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                  })
                                : ""}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              UNPAID
                            </span>
                            {emp.basicSalary === 0 && (
                              <div className="text-[10px] text-rose-500 font-medium mt-0.5">Base pay ₹0</div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 8. Actions */}
                      <td className="py-3.5 px-4 text-center">
                        {isPaid ? (
                          <button
                            onClick={() => setPayslipModalData({ employee: emp, record: emp.record! })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600" />
                            Payslip
                          </button>
                        ) : (
                          <button
                            onClick={() => openDisburseModal(emp)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
                          >
                            <Zap className="w-3 h-3 fill-white" />
                            Disburse
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: INDIVIDUAL SALARY DISBURSEMENT DIALOG                    */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {disburseModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono tracking-wider text-emerald-400 uppercase">
                  SALARY DISBURSEMENT // PV GENERATOR
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-indigo-400" />
                  Disburse Salary — {disburseModalEmp.name}
                </h3>
                <p className="text-xs text-slate-300">
                  {disburseModalEmp.role} • {disburseModalEmp.department} • Period: {MONTH_NAMES[parseInt(month) - 1]} {year}
                </p>
              </div>
              <button
                onClick={() => setDisburseModalEmp(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Financial Inputs: Base, Bonus, Deductions */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Base Salary (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={disburseForm.basicSalary}
                    onChange={(e) => setDisburseForm({ ...disburseForm, basicSalary: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-emerald-700 mb-1">+ Bonus / Allow (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={disburseForm.bonus}
                    onChange={(e) => setDisburseForm({ ...disburseForm, bonus: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-rose-700 mb-1">- Deductions (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={disburseForm.deductions}
                    onChange={(e) => setDisburseForm({ ...disburseForm, deductions: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 text-xs font-mono font-medium border border-slate-300 rounded-lg focus:ring-1 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              {/* Net Payable Banner */}
              <div className="bg-slate-900 rounded-xl p-3.5 text-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 block uppercase">NET DISBURSEMENT AMOUNT</span>
                  <div className="text-xl font-bold font-mono tracking-tight text-emerald-400">
                    ₹{liveNetPayable.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="text-[11px] font-mono text-slate-400 text-right">
                  ₹{disburseForm.basicSalary} + ₹{disburseForm.bonus} - ₹{disburseForm.deductions}
                </div>
              </div>

              {/* Disbursement Source Account Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Disbursement Account (Debit Source)
                </label>
                <select
                  value={disburseForm.accountId}
                  onChange={(e) => setDisburseForm({ ...disburseForm, accountId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                >
                  <option value="">Select Hospital Financial Account...</option>
                  {accounts.map((acc) => {
                    const hasFunds = acc.currentBalance >= liveNetPayable
                    return (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}) — Available: ₹{acc.currentBalance.toLocaleString("en-IN")}
                        {!hasFunds ? " [INSUFFICIENT FUNDS]" : ""}
                      </option>
                    )
                  })}
                </select>
                {disburseForm.accountId && (
                  <div className="mt-1 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>
                      Current Balance: ₹
                      {accounts
                        .find((a) => a.id === disburseForm.accountId)
                        ?.currentBalance.toLocaleString("en-IN") || 0}
                    </span>
                    {accounts.find((a) => a.id === disburseForm.accountId && a.currentBalance < liveNetPayable) && (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Insufficient balance
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Payment Method & UTR / Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Channel</label>
                  <select
                    value={disburseForm.paymentMethod}
                    onChange={(e) => setDisburseForm({ ...disburseForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="CASH">Cash Drawer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Remarks / Reference</label>
                  <input
                    type="text"
                    value={disburseForm.notes}
                    onChange={(e) => setDisburseForm({ ...disburseForm, notes: e.target.value })}
                    placeholder="e.g. UTR #, Cheque #, Oct Stipend"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Double Entry Audit Preview */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] font-mono space-y-1">
                <div className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  Double-Entry Ledger Impact:
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>DR: 5000 Salaries & Wages Expense</span>
                  <span className="font-bold text-slate-900">₹{liveNetPayable.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>
                    CR: {accounts.find((a) => a.id === disburseForm.accountId)?.name || "Selected Account"}
                  </span>
                  <span className="font-bold text-slate-900">₹{liveNetPayable.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setDisburseModalEmp(null)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDisburseSubmit}
                disabled={actionLoading || liveNetPayable <= 0}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Posting Voucher...
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    Confirm & Generate Payment Voucher
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: BATCH DISBURSEMENT DIALOG                               */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-wider text-emerald-400 uppercase">
                  BULK SALARY DISBURSEMENT
                </span>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400" />
                  Batch Process Payroll ({eligibleUnpaidEmployees.length} Staff)
                </h3>
                <p className="text-xs text-slate-300">
                  Period: {MONTH_NAMES[parseInt(month) - 1]} {year}
                </p>
              </div>
              <button
                onClick={() => setBatchModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-emerald-800 font-medium">Total Batch Disbursement</span>
                  <div className="text-2xl font-bold font-mono text-emerald-900">
                    ₹{totalBatchRequired.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="text-right text-xs text-emerald-700">
                  <span className="font-bold">{eligibleUnpaidEmployees.length}</span> staff members
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Source Bank / Cash Drawer
                </label>
                <select
                  value={batchAccountId}
                  onChange={(e) => setBatchAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="">Select Funding Account...</option>
                  {accounts.map((acc) => {
                    const hasFunds = acc.currentBalance >= totalBatchRequired
                    return (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}) — Available: ₹{acc.currentBalance.toLocaleString("en-IN")}
                        {!hasFunds ? " [INSUFFICIENT]" : ""}
                      </option>
                    )
                  })}
                </select>
                {batchAccountId && (
                  <div className="mt-1 text-[11px] text-slate-500">
                    Available in account: ₹
                    {accounts.find((a) => a.id === batchAccountId)?.currentBalance.toLocaleString("en-IN") || 0}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={batchPaymentMethod}
                  onChange={(e) => setBatchPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                  <option value="UPI">UPI Direct</option>
                  <option value="CASH">Cash Drawer</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-semibold text-slate-700">Audit Trail:</span> This operation will generate individual
                audited Payment Vouchers (<span className="font-mono text-indigo-600">PV-XXXXX</span>) for each staff
                member, decrement the selected financial account, and post the journal to the General Ledger.
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setBatchModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchSubmit}
                disabled={actionLoading || eligibleUnpaidEmployees.length === 0}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executing Batch...
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    Disburse All ({eligibleUnpaidEmployees.length} Staff)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: FORMAL HOSPITAL PAYSLIP & PAYMENT VOUCHER DIALOG         */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {payslipModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            {/* Header Bar */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="font-bold text-sm">Official Salary Payslip & Payment Voucher</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  onClick={() => setPayslipModalData(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Payslip Sheet */}
            <div className="p-6 md:p-8 space-y-6 text-slate-800 print:p-0">
              {/* Hospital Banner */}
              <div className="border-b border-slate-200 pb-4 text-center space-y-1">
                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  SHREE KAMAL HOSPITAL & RESEARCH CENTRE
                </h2>
                <p className="text-xs text-slate-500">
                  Master Finance Division • Department of Accounts & Human Capital
                </p>
                <div className="inline-block mt-1 px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700">
                  SALARY DISBURSEMENT SLIP — {MONTH_NAMES[parseInt(month) - 1]?.toUpperCase()} {year}
                </div>
              </div>

              {/* Employee & Voucher Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Staff Details</div>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{payslipModalData.employee.name}</div>
                  <div className="text-slate-600">{payslipModalData.employee.role}</div>
                  <div className="text-slate-500 text-[11px]">{payslipModalData.employee.department}</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-[10px] uppercase font-semibold">Audit Reference</div>
                  <div className="font-mono font-bold text-sm text-indigo-700 mt-0.5">
                    {payslipModalData.record.voucherNumber || "PV-POSTED"}
                  </div>
                  <div className="text-slate-600 font-mono text-[11px]">
                    Date:{" "}
                    {new Date(payslipModalData.record.paymentDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Channel: {payslipModalData.record.paymentMethod || "Bank Transfer"}
                  </div>
                </div>
              </div>

              {/* Itemized Financial Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 text-[11px]">
                      <th className="py-2.5 px-4">Earnings / Allowances</th>
                      <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-4">Deductions</th>
                      <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr>
                      <td className="py-2 px-4 text-slate-700 font-sans">Basic Salary</td>
                      <td className="py-2 px-4 text-right text-slate-900">
                        ₹{payslipModalData.employee.basicSalary.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-4 text-slate-700 font-sans">Statutory / Advance</td>
                      <td className="py-2 px-4 text-right text-rose-600">
                        ₹{payslipModalData.record.deductions.toLocaleString("en-IN")}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-slate-700 font-sans">Duty Bonus & Incentives</td>
                      <td className="py-2 px-4 text-right text-emerald-600">
                        ₹{payslipModalData.record.bonus.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 px-4 text-slate-700 font-sans">—</td>
                      <td className="py-2 px-4 text-right text-slate-400">—</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold border-t border-slate-200">
                      <td className="py-2.5 px-4 text-slate-900 font-sans">Gross Earnings</td>
                      <td className="py-2.5 px-4 text-right text-slate-900">
                        ₹{(payslipModalData.employee.basicSalary + payslipModalData.record.bonus).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-4 text-slate-900 font-sans">Total Deductions</td>
                      <td className="py-2.5 px-4 text-right text-rose-600">
                        ₹{payslipModalData.record.deductions.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Net Disbursed Highlight */}
              <div className="bg-slate-900 text-white rounded-xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    NET SALARY DISBURSED
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    ₹{payslipModalData.record.amountPaid.toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 font-mono">
                  Account: {payslipModalData.record.accountName || "Hospital Main"}
                </div>
              </div>

              {/* Sign-off Stamps */}
              <div className="pt-6 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                <div>
                  <div className="h-8" />
                  <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">
                    Employee Signature
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-8" />
                  <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">
                    Authorized Signatory (Master Finance)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: QUICK EDIT BASE SALARY DIALOG                           */}
      {/* ═════════════════════════════════════════════════════════════════ */}
      {editSalaryModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold">Update Recurring Base Salary</h4>
                <p className="text-xs text-slate-400">{editSalaryModalEmp.name}</p>
              </div>
              <button
                onClick={() => setEditSalaryModalEmp(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Monthly Base Salary (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={editSalaryAmount}
                  onChange={(e) => setEditSalaryAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                This updates the permanent base payroll rate for {editSalaryModalEmp.name} across Master Finance and HR.
              </p>
            </div>
            <div className="bg-slate-50 p-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditSalaryModalEmp(null)}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSalarySubmit}
                disabled={actionLoading || editSalaryAmount < 0}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Save Base Pay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
