"use client"

import { useState, useEffect, useMemo } from "react"
import {
  getPayrollData,
  processMasterFinanceSalary,
  batchProcessMasterFinanceSalaries,
  updateMasterFinanceEmployeeSalary,
  updateMasterFinanceSalaryDate,
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
  Calendar,
  Plus,
  Trash2,
  Split,
} from "lucide-react"
import { toast } from "sonner"
import { numberToWordsRupees } from "@/lib/number-to-words"

interface SalarySplitItem {
  accountName: string
  amount: number
  paymentMethod: string
}

interface SplitAllocationItem {
  id: string
  accountId: string
  paymentMethod: string
  amount: number
}

interface HospitalSettingsInfo {
  name: string
  address: string
  phone: string
  email: string
  website: string
  gstNo: string | null
  logoUrl: string | null
}

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
  splits?: SalarySplitItem[]
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

function getTodayDateString(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

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
  const [hospitalSettings, setHospitalSettings] = useState<HospitalSettingsInfo | null>(null)

  // Modals state
  const [disburseModalEmp, setDisburseModalEmp] = useState<EmployeePayroll | null>(null)
  const [disburseForm, setDisburseForm] = useState({
    basicSalary: 0,
    bonus: 0,
    deductions: 0,
    accountId: "",
    paymentMethod: "BANK_TRANSFER",
    paymentDate: getTodayDateString(),
    notes: "",
    splitAllocations: [] as SplitAllocationItem[],
  })

  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchAccountId, setBatchAccountId] = useState("")
  const [batchPaymentMethod, setBatchPaymentMethod] = useState("BANK_TRANSFER")
  const [batchPaymentDate, setBatchPaymentDate] = useState(getTodayDateString())

  const [payslipModalData, setPayslipModalData] = useState<{
    employee: EmployeePayroll
    record: SalaryRecordInfo
  } | null>(null)
  const [editingDisburseDate, setEditingDisburseDate] = useState(false)
  const [editPaymentDateValue, setEditPaymentDateValue] = useState(getTodayDateString())

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
      if (data.hospitalSettings) {
        setHospitalSettings(data.hospitalSettings)
      }

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
    const bankAcc = accounts.find((a) => a.type === "BANK") || accounts[0]
    const cashAcc = accounts.find((a) => a.type === "CASH") || accounts[1] || accounts[0]

    setDisburseModalEmp(emp)
    setDisburseForm({
      basicSalary: emp.basicSalary,
      bonus: 0,
      deductions: 0,
      accountId: defaultAcc?.id || "",
      paymentMethod: "BANK_TRANSFER",
      paymentDate: getTodayDateString(),
      notes: "",
      splitAllocations: [
        {
          id: "split-1",
          accountId: bankAcc?.id || "",
          paymentMethod: "BANK_TRANSFER",
          amount: Math.max(0, emp.basicSalary),
        },
        {
          id: "split-2",
          accountId: cashAcc?.id || "",
          paymentMethod: "CASH",
          amount: 0,
        },
      ],
    })
  }

  // Calculate live net payable in disburse modal
  const liveNetPayable = useMemo(() => {
    const base = Number(disburseForm.basicSalary) || 0
    const b = Number(disburseForm.bonus) || 0
    const d = Number(disburseForm.deductions) || 0
    return Math.max(0, Math.round((base + b - d) * 100) / 100)
  }, [disburseForm.basicSalary, disburseForm.bonus, disburseForm.deductions])

  const isSplitPayment = disburseForm.paymentMethod === "SPLIT"

  const totalSplitAllocated = useMemo(() => {
    if (!isSplitPayment) return liveNetPayable
    return disburseForm.splitAllocations.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
  }, [isSplitPayment, disburseForm.splitAllocations, liveNetPayable])

  const splitDifference = useMemo(() => {
    return Math.round((liveNetPayable - totalSplitAllocated) * 100) / 100
  }, [liveNetPayable, totalSplitAllocated])

  function addSplitRow() {
    const usedIds = new Set(disburseForm.splitAllocations.map((s) => s.accountId))
    const unusedAcc = accounts.find((a) => !usedIds.has(a.id)) || accounts[0]
    const newRow: SplitAllocationItem = {
      id: `split-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      accountId: unusedAcc?.id || "",
      paymentMethod: unusedAcc?.type === "CASH" ? "CASH" : "BANK_TRANSFER",
      amount: splitDifference > 0 ? splitDifference : 0,
    }
    setDisburseForm((prev) => ({
      ...prev,
      splitAllocations: [...prev.splitAllocations, newRow],
    }))
  }

  function removeSplitRow(index: number) {
    if (disburseForm.splitAllocations.length <= 1) return
    setDisburseForm((prev) => ({
      ...prev,
      splitAllocations: prev.splitAllocations.filter((_, i) => i !== index),
    }))
  }

  function updateSplitRow(index: number, field: keyof SplitAllocationItem, val: any) {
    setDisburseForm((prev) => {
      const updated = [...prev.splitAllocations]
      updated[index] = { ...updated[index], [field]: val }
      return { ...prev, splitAllocations: updated }
    })
  }

  function autoBalanceRemaining() {
    if (splitDifference === 0) return
    setDisburseForm((prev) => {
      const updated = [...prev.splitAllocations]
      const lastIdx = updated.length - 1
      if (lastIdx >= 0) {
        const curAmt = Number(updated[lastIdx].amount) || 0
        const newAmt = Math.max(0, Math.round((curAmt + splitDifference) * 100) / 100)
        updated[lastIdx] = { ...updated[lastIdx], amount: newAmt }
      }
      return { ...prev, splitAllocations: updated }
    })
  }

  // Submit single salary disburse
  async function handleDisburseSubmit() {
    if (!disburseModalEmp) return
    if (liveNetPayable <= 0) {
      toast.error("Net payable salary must be greater than ₹0.")
      return
    }

    if (isSplitPayment) {
      if (disburseForm.splitAllocations.length < 2) {
        toast.error("Split payment requires at least 2 payment channels.")
        return
      }

      if (Math.abs(splitDifference) > 0.01) {
        if (splitDifference > 0) {
          toast.error(`Split allocation incomplete. ₹${splitDifference.toLocaleString("en-IN")} remains unallocated.`)
        } else {
          toast.error(`Split allocation exceeds net salary by ₹${Math.abs(splitDifference).toLocaleString("en-IN")}.`)
        }
        return
      }

      for (const [idx, item] of disburseForm.splitAllocations.entries()) {
        if (!item.accountId) {
          toast.error(`Please select an account for split channel #${idx + 1}.`)
          return
        }
        if (Number(item.amount) <= 0) {
          toast.error(`Amount for split channel #${idx + 1} must be greater than ₹0.`)
          return
        }
      }

      // Aggregate balance requirements per account
      const requiredSums: Record<string, number> = {}
      for (const item of disburseForm.splitAllocations) {
        requiredSums[item.accountId] = (requiredSums[item.accountId] || 0) + Number(item.amount)
      }
      for (const [accId, amt] of Object.entries(requiredSums)) {
        const acc = accounts.find((a) => a.id === accId)
        if (acc && acc.currentBalance < amt) {
          toast.error(
            `Insufficient balance in ${acc.name}. Required: ₹${amt.toLocaleString("en-IN")}, Available: ₹${acc.currentBalance.toLocaleString("en-IN")}`
          )
          return
        }
      }
    } else {
      if (!disburseForm.accountId) {
        toast.error("Please select a disbursement account.")
        return
      }

      const selectedAcc = accounts.find((a) => a.id === disburseForm.accountId)
      if (selectedAcc && selectedAcc.currentBalance < liveNetPayable) {
        toast.error(
          `Insufficient balance in ${selectedAcc.name}. Available: ₹${selectedAcc.currentBalance.toLocaleString("en-IN")}`
        )
        return
      }
    }

    setActionLoading(true)
    try {
      const res = await processMasterFinanceSalary({
        employeeId: disburseModalEmp.id,
        month,
        year,
        accountId: isSplitPayment ? undefined : disburseForm.accountId,
        basicSalary: disburseForm.basicSalary,
        bonus: disburseForm.bonus,
        deductions: disburseForm.deductions,
        paymentMethod: disburseForm.paymentMethod,
        paymentDate: disburseForm.paymentDate,
        notes: disburseForm.notes,
        splitPayments: isSplitPayment
          ? disburseForm.splitAllocations.map((s) => ({
              accountId: s.accountId,
              paymentMethod: s.paymentMethod,
              amount: Number(s.amount) || 0,
            }))
          : undefined,
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

  // Print Executive Hospital Payslip
  function handlePrintPayslip(emp: EmployeePayroll, rec: SalaryRecordInfo) {
    const hospitalName = hospitalSettings?.name || "SHREE KAMAL HOSPITAL & RESEARCH CENTRE"
    const hospitalAddress = hospitalSettings?.address || "At/PO: Bargarh, Odisha - 768028"
    const phone = hospitalSettings?.phone || ""
    const email = hospitalSettings?.email || ""
    const website = hospitalSettings?.website || ""
    const gstNo = hospitalSettings?.gstNo || ""
    const logoUrl = hospitalSettings?.logoUrl || ""

    const periodStr = `${MONTH_NAMES[parseInt(month) - 1]} ${year}`
    const disburseDateFormatted = rec.paymentDate
      ? new Date(rec.paymentDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
    const amountWords = numberToWordsRupees(rec.amountPaid)
    const isSplit = rec.paymentMethod === "SPLIT" || (rec.splits && rec.splits.length > 0)

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "none"
    iframe.setAttribute("aria-hidden", "true")
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) {
      toast.error("Failed to initialize print frame")
      return
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Payslip - ${emp.name} - ${periodStr}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11.5px;
      line-height: 1.45;
    }
    .sheet {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 22px 26px;
      max-width: 760px;
      margin: 0 auto;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .hospital-logo {
      height: 60px;
      max-width: 190px;
      object-fit: contain;
      vertical-align: middle;
    }
    .hospital-name {
      font-size: 18px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: -0.2px;
      color: #0f172a;
      margin: 0 0 2px 0;
    }
    .hospital-info {
      font-size: 10.5px;
      color: #475569;
      line-height: 1.35;
      margin: 0;
    }
    .hospital-contact {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
    }
    .voucher-pill {
      display: inline-block;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 4px 10px;
      border-radius: 5px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 4px;
    }
    .title-banner {
      background: #0f172a;
      color: #ffffff;
      text-align: center;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 14px;
    }
    .title-banner h2 {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin: 0;
    }
    .title-banner p {
      font-size: 10px;
      color: #cbd5e1;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      margin: 2px 0 0 0;
    }
    .grid-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    .grid-table td {
      padding: 6px 12px;
      font-size: 11px;
      border-bottom: 1px solid #e2e8f0;
    }
    .lbl {
      color: #64748b;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 600;
      width: 18%;
    }
    .val {
      color: #0f172a;
      font-weight: 600;
      width: 32%;
    }
    .finance-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    .finance-table th {
      background: #f1f5f9;
      padding: 8px 12px;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #334155;
      font-weight: 700;
      border-bottom: 1px solid #cbd5e1;
    }
    .finance-table td {
      padding: 7px 12px;
      font-size: 11px;
      border-bottom: 1px solid #f1f5f9;
    }
    .num {
      text-align: right;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-weight: 600;
    }
    .total-row td {
      background: #f8fafc;
      font-weight: 700;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
    }
    .net-box {
      background: #f8fafc;
      border: 1.5px solid #0f172a;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .net-label {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .net-amount {
      font-size: 22px;
      font-weight: 800;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #0f172a;
    }
    .net-words {
      font-size: 11px;
      color: #334155;
      font-style: italic;
      margin-top: 3px;
    }
    .split-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      background: #fafafa;
    }
    .split-table th {
      text-align: left;
      font-size: 10px;
      color: #475569;
      text-transform: uppercase;
      padding: 6px 10px;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
    }
    .split-table td {
      padding: 6px 10px;
      font-size: 11px;
      border-bottom: 1px dotted #e2e8f0;
    }
    .sigs-container {
      display: flex;
      justify-content: space-between;
      margin-top: 42px;
      padding-top: 8px;
    }
    .sig-cell {
      text-align: center;
      width: 29%;
    }
    .sig-line {
      border-top: 1px solid #0f172a;
      padding-top: 6px;
      font-weight: 600;
      font-size: 10.5px;
      color: #1e293b;
    }
    .sig-sub {
      font-size: 9.5px;
      color: #64748b;
      margin-top: 1px;
    }
    .footer-note {
      margin-top: 20px;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <table class="header-table">
      <tr>
        <td style="vertical-align: middle; width: ${logoUrl ? '70px' : '0'};">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="hospital-logo" />` : ''}
        </td>
        <td style="vertical-align: middle; padding-left: ${logoUrl ? '14px' : '0'};">
          <h1 class="hospital-name">${hospitalName}</h1>
          <p class="hospital-info">${hospitalAddress}</p>
          <div class="hospital-contact">
            ${phone ? `<span>Phone: ${phone}</span> &bull; ` : ''}
            ${email ? `<span>Email: ${email}</span>` : ''}
            ${website ? ` &bull; <span>Website: ${website}</span>` : ''}
          </div>
        </td>
        <td style="vertical-align: middle; text-align: right; width: 180px;">
          ${gstNo ? `<div style="font-size: 10px; color: #475569;"><strong>GSTIN:</strong> ${gstNo}</div>` : ''}
          <div style="font-size: 9.5px; color: #64748b; text-transform: uppercase; margin-top: 2px;">AUDIT PAYMENT VOUCHER</div>
          <div class="voucher-pill">${rec.voucherNumber || "PV-SALARY"}</div>
        </td>
      </tr>
    </table>

    <div class="title-banner">
      <h2>SALARY PAYSLIP & PAYMENT VOUCHER</h2>
      <p>PERIOD: ${periodStr.toUpperCase()} &bull; PAYMENT DATE: ${disburseDateFormatted}</p>
    </div>

    <table class="grid-table">
      <tr>
        <td class="lbl">Staff Name</td>
        <td class="val">${emp.name}</td>
        <td class="lbl">Voucher No</td>
        <td class="val" style="font-family: monospace;">${rec.voucherNumber || "PV-SALARY"}</td>
      </tr>
      <tr>
        <td class="lbl">Designation</td>
        <td class="val">${emp.role}</td>
        <td class="lbl">Payment Date</td>
        <td class="val">${disburseDateFormatted}</td>
      </tr>
      <tr>
        <td class="lbl">Department</td>
        <td class="val">${emp.department}</td>
        <td class="lbl">Payment Channel</td>
        <td class="val">${isSplit ? "SPLIT (Multi-Channel)" : (rec.paymentMethod || "Bank Transfer")}</td>
      </tr>
      <tr>
        <td class="lbl">Staff Code</td>
        <td class="val" style="font-family: monospace;">${emp.id.slice(-8).toUpperCase()}</td>
        <td class="lbl">Account / Debit</td>
        <td class="val">${isSplit ? "Multi-Account Split" : (rec.accountName || "Hospital Bank Account")}</td>
      </tr>
    </table>

    <table class="finance-table">
      <thead>
        <tr>
          <th style="width: 35%; text-align: left;">Earnings & Allowances</th>
          <th style="width: 15%; text-align: right;">Amount (₹)</th>
          <th style="width: 35%; text-align: left;">Deductions & Advances</th>
          <th style="width: 15%; text-align: right;">Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Basic Salary</td>
          <td class="num">₹${emp.basicSalary.toLocaleString("en-IN")}</td>
          <td>Statutory / Advance Deductions</td>
          <td class="num" style="color: #b91c1c;">₹${rec.deductions.toLocaleString("en-IN")}</td>
        </tr>
        <tr>
          <td>Duty Bonus / Performance Allowance</td>
          <td class="num" style="color: #15803d;">₹${rec.bonus.toLocaleString("en-IN")}</td>
          <td>Tax Deducted at Source (TDS) / Other</td>
          <td class="num" style="color: #64748b;">₹0</td>
        </tr>
        <tr class="total-row">
          <td>Total Gross Earnings</td>
          <td class="num">₹${(emp.basicSalary + rec.bonus).toLocaleString("en-IN")}</td>
          <td>Total Deductions</td>
          <td class="num" style="color: #b91c1c;">₹${rec.deductions.toLocaleString("en-IN")}</td>
        </tr>
      </tbody>
    </table>

    <div class="net-box">
      <div>
        <div class="net-label">NET SALARY DISBURSED</div>
        <div class="net-words"><strong>In Words:</strong> ${amountWords}</div>
      </div>
      <div style="text-align: right;">
        <div class="net-amount">₹${rec.amountPaid.toLocaleString("en-IN")}</div>
        <div style="font-size: 9.5px; color: #64748b; font-family: monospace;">AUDIT VERIFIED & POSTED</div>
      </div>
    </div>

    ${isSplit && rec.splits && rec.splits.length > 0 ? `
      <table class="split-table">
        <thead>
          <tr>
            <th colspan="4" style="background: #e2e8f0; font-weight: 700; color: #1e293b;">
              Split Payment Allocation Breakdown
            </th>
          </tr>
          <tr>
            <th style="width: 30px;">#</th>
            <th>Payment Channel</th>
            <th>Debit Account</th>
            <th style="text-align: right;">Disbursed Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rec.splits.map((s, idx) => `
            <tr>
              <td style="font-family: monospace;">${idx + 1}</td>
              <td><strong>${s.paymentMethod}</strong></td>
              <td>${s.accountName}</td>
              <td class="num">₹${s.amount.toLocaleString("en-IN")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    ` : ''}

    <div class="sigs-container">
      <div class="sig-cell">
        <div style="height: 38px;"></div>
        <div class="sig-line">Employee Signature</div>
        <div class="sig-sub">Acknowledged Receipt</div>
      </div>
      <div class="sig-cell">
        <div style="height: 38px;"></div>
        <div class="sig-line">Prepared & Verified By</div>
        <div class="sig-sub">Finance & Accounts Officer</div>
      </div>
      <div class="sig-cell">
        <div style="height: 38px;"></div>
        <div class="sig-line">Authorized Signatory</div>
        <div class="sig-sub">Medical Superintendent / Director</div>
      </div>
    </div>

    <div class="footer-note">
      This is an official system-generated salary voucher & payment advice &bull; ${hospitalName} &bull; Confidential
    </div>
  </div>
</body>
</html>
`

    doc.open()
    doc.write(html)
    doc.close()

    iframe.contentWindow?.focus()
    setTimeout(() => {
      iframe.contentWindow?.print()
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 1500)
    }, 400)
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
        paymentDate: batchPaymentDate,
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

  // Submit update date on an already disbursed payslip
  async function handleUpdateDateSubmit() {
    if (!payslipModalData || !editPaymentDateValue) return
    setActionLoading(true)
    try {
      const res = await updateMasterFinanceSalaryDate({
        salaryRecordId: payslipModalData.record.id,
        paymentDate: editPaymentDateValue,
      })
      if (res.success) {
        toast.success(res.message)
        setPayslipModalData({
          ...payslipModalData,
          record: {
            ...payslipModalData.record,
            paymentDate: res.paymentDate || new Date(editPaymentDateValue + "T12:00:00").toISOString(),
          },
        })
        setEditingDisburseDate(false)
        await fetchData()
      } else {
        toast.error(res.message || "Failed to update disbursement date")
      }
    } catch (e: any) {
      toast.error(e.message || "Error updating date")
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
              className={`px-3 py-1.5 rounded-lg font-mono transition cursor-pointer ${parseInt(month) === currentMonthNum && year === now.getFullYear()
                ? "bg-indigo-600 text-white font-bold"
                : "bg-slate-800/60 hover:bg-slate-800 text-slate-300"
                }`}
            >
              This Month ({MONTH_NAMES[currentMonthNum - 1]?.slice(0, 3)} {now.getFullYear()})
            </button>
            <button
              onClick={() => applyPreset(prevMonthNum, prevMonthYear)}
              className={`px-3 py-1.5 rounded-lg font-mono transition cursor-pointer ${parseInt(month) === prevMonthNum && year === prevMonthYear
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
                  className={`p-3 rounded-lg border transition cursor-pointer ${selectedDept === dept.name
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
                      className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-indigo-500" : "bg-slate-300"
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
            className={`px-3 py-1.5 rounded-md transition cursor-pointer ${statusFilter === "ALL" ? "bg-white text-slate-900 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
          >
            All Staff ({employees.length})
          </button>
          <button
            onClick={() => setStatusFilter("UNPAID")}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${statusFilter === "UNPAID" ? "bg-white text-amber-700 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Unpaid ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter("PAID")}
            className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1 ${statusFilter === "PAID" ? "bg-white text-emerald-700 shadow-sm font-semibold" : "text-slate-600 hover:text-slate-900"
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
                      className={`hover:bg-slate-50/80 transition-colors ${isPaid ? "bg-white" : "bg-amber-50/20"
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
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span className="font-semibold text-slate-700">
                                {emp.record?.paymentDate
                                  ? new Date(emp.record.paymentDate).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                  : "—"}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-400 truncate max-w-[90px]">{emp.record?.accountName || "Bank"}</span>
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

              {/* Disbursement Date & Payment Channel */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Disbursement Date
                  </label>
                  <input
                    type="date"
                    value={disburseForm.paymentDate}
                    onChange={(e) => setDisburseForm({ ...disburseForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono font-medium border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-indigo-50/20 text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Channel</label>
                  <select
                    value={disburseForm.paymentMethod}
                    onChange={(e) => {
                      const newMethod = e.target.value
                      setDisburseForm((prev) => {
                        let updatedSplits = prev.splitAllocations
                        if (newMethod === "SPLIT" && (!updatedSplits || updatedSplits.length === 0)) {
                          const bankAcc = accounts.find((a) => a.type === "BANK") || accounts[0]
                          const cashAcc = accounts.find((a) => a.type === "CASH") || accounts[1] || accounts[0]
                          updatedSplits = [
                            { id: "split-1", accountId: bankAcc?.id || "", paymentMethod: "BANK_TRANSFER", amount: liveNetPayable },
                            { id: "split-2", accountId: cashAcc?.id || "", paymentMethod: "CASH", amount: 0 },
                          ]
                        }
                        return { ...prev, paymentMethod: newMethod, splitAllocations: updatedSplits }
                      })
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-medium"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="CASH">Cash Drawer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="SPLIT">Split Payment (Multi-Channel / Multi-Account)</option>
                  </select>
                </div>
              </div>

              {/* Conditional Account Selector: Split Allocator vs Single Account */}
              {isSplitPayment ? (
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-indigo-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Split className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">Split Channels & Debit Accounts</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                        {disburseForm.splitAllocations.length} Channels
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={addSplitRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-2xs transition cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Channel
                    </button>
                  </div>

                  <div className="space-y-2">
                    {disburseForm.splitAllocations.map((item, index) => {
                      const selectedAcc = accounts.find((a) => a.id === item.accountId)
                      const hasInsufficient = selectedAcc && selectedAcc.currentBalance < item.amount
                      return (
                        <div
                          key={item.id}
                          className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                              Channel #{index + 1}
                            </span>
                            {disburseForm.splitAllocations.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeSplitRow(index)}
                                className="text-slate-400 hover:text-rose-600 p-0.5 rounded transition cursor-pointer"
                                title="Remove channel"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                            <div className="md:col-span-4">
                              <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Method</label>
                              <select
                                value={item.paymentMethod}
                                onChange={(e) => updateSplitRow(index, "paymentMethod", e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-medium"
                              >
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="UPI">UPI Transfer</option>
                                <option value="CASH">Cash Drawer</option>
                                <option value="CHEQUE">Cheque</option>
                              </select>
                            </div>

                            <div className="md:col-span-5">
                              <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Debit Account</label>
                              <select
                                value={item.accountId}
                                onChange={(e) => updateSplitRow(index, "accountId", e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:ring-1 focus:ring-indigo-500 outline-none truncate font-medium"
                              >
                                <option value="">Select Account...</option>
                                {accounts.map((acc) => (
                                  <option key={acc.id} value={acc.id}>
                                    {acc.name} (₹{acc.currentBalance.toLocaleString("en-IN")})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="md:col-span-3">
                              <label className="block text-[10px] font-medium text-slate-600 mb-0.5">Amount (₹)</label>
                              <input
                                type="number"
                                min={0}
                                value={item.amount}
                                onChange={(e) => updateSplitRow(index, "amount", Number(e.target.value))}
                                className={`w-full px-2 py-1.5 text-xs font-mono font-bold border rounded-md outline-none text-right ${
                                  hasInsufficient
                                    ? "border-rose-400 bg-rose-50 text-rose-700"
                                    : "border-slate-300 focus:ring-1 focus:ring-indigo-500"
                                }`}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5 border-t border-slate-100">
                            <span>
                              Available: ₹{selectedAcc ? selectedAcc.currentBalance.toLocaleString("en-IN") : "0"}
                            </span>
                            {hasInsufficient && (
                              <span className="text-rose-600 font-semibold flex items-center gap-0.5">
                                <AlertCircle className="w-3 h-3" /> Insufficient balance
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Split Allocation Balance Bar */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-mono">
                    <div className="text-slate-600">
                      Allocated: <span className="font-bold text-slate-900">₹{totalSplitAllocated.toLocaleString("en-IN")}</span> / ₹{liveNetPayable.toLocaleString("en-IN")}
                    </div>
                    {splitDifference === 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Balanced
                      </span>
                    ) : splitDifference > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-amber-700 font-bold text-[11px]">
                          ₹{splitDifference.toLocaleString("en-IN")} unallocated
                        </span>
                        <button
                          type="button"
                          onClick={() => autoBalanceRemaining()}
                          className="px-2 py-0.5 text-[10px] bg-indigo-600 text-white rounded font-sans font-medium hover:bg-indigo-700 transition cursor-pointer"
                        >
                          Auto Balance
                        </button>
                      </div>
                    ) : (
                      <span className="text-rose-600 font-bold text-[11px]">
                        Overallocated by ₹{Math.abs(splitDifference).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* Single Disbursement Source Account Selector */
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Disbursement Account (Debit Source)
                  </label>
                  <select
                    value={disburseForm.accountId}
                    onChange={(e) => setDisburseForm({ ...disburseForm, accountId: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium"
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
              )}

              {/* Remarks / Reference */}
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

              {/* Double Entry Audit Preview */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] font-mono space-y-1">
                <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <span>Double-Entry Ledger Impact:</span>
                  <span className="text-indigo-600 font-semibold lowercase first-letter:uppercase">
                    Posting: {disburseForm.paymentDate ? new Date(disburseForm.paymentDate + "T12:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Today"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>DR: 5000 Salaries & Wages Expense</span>
                  <span className="font-bold text-slate-900">₹{liveNetPayable.toLocaleString("en-IN")}</span>
                </div>
                {isSplitPayment ? (
                  disburseForm.splitAllocations.map((item, idx) => {
                    const acc = accounts.find((a) => a.id === item.accountId)
                    return (
                      <div key={item.id || idx} className="flex justify-between text-slate-600 pl-2 border-l-2 border-indigo-200">
                        <span>CR: {acc?.name || `Channel #${idx + 1}`} ({item.paymentMethod})</span>
                        <span className="font-bold text-slate-800">₹{(Number(item.amount) || 0).toLocaleString("en-IN")}</span>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex justify-between text-slate-700">
                    <span>
                      CR: {accounts.find((a) => a.id === disburseForm.accountId)?.name || "Selected Account"}
                    </span>
                    <span className="font-bold text-slate-900">₹{liveNetPayable.toLocaleString("en-IN")}</span>
                  </div>
                )}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    Disbursement Date
                  </label>
                  <input
                    type="date"
                    value={batchPaymentDate}
                    onChange={(e) => setBatchPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-medium border border-emerald-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-emerald-50/20 text-slate-800"
                  />
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
                  onClick={() => handlePrintPayslip(payslipModalData.employee, payslipModalData.record)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Payslip (A4)
                </button>
                <button
                  onClick={() => setPayslipModalData(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Payslip Sheet Preview */}
            <div className="p-6 md:p-8 space-y-5 text-slate-800 max-h-[80vh] overflow-y-auto">
              {/* Hospital Banner */}
              <div className="border-b border-slate-200 pb-4 text-center space-y-1">
                {hospitalSettings?.logoUrl ? (
                  <img
                    src={hospitalSettings.logoUrl}
                    alt={hospitalSettings.name || "Hospital Logo"}
                    className="h-14 max-w-[200px] object-contain mx-auto mb-2"
                  />
                ) : null}
                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  {hospitalSettings?.name || "SHREE KAMAL HOSPITAL & RESEARCH CENTRE"}
                </h2>
                <p className="text-xs text-slate-600">
                  {hospitalSettings?.address || "Master Finance Division • Department of Accounts & Human Capital"}
                </p>
                {(hospitalSettings?.phone || hospitalSettings?.email || hospitalSettings?.gstNo) && (
                  <p className="text-[11px] text-slate-500">
                    {[
                      hospitalSettings.phone && `Tel: ${hospitalSettings.phone}`,
                      hospitalSettings.email && `Email: ${hospitalSettings.email}`,
                      hospitalSettings.gstNo && `GSTIN: ${hospitalSettings.gstNo}`,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                )}
                <div className="inline-block mt-2 px-3 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  SALARY DISBURSEMENT SLIP — {MONTH_NAMES[parseInt(month) - 1]?.toUpperCase()} {year}
                </div>
              </div>

              {/* Employee & Voucher Metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
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
                  <div className="text-slate-600 font-mono text-[11px] flex items-center justify-end gap-1.5">
                    <span>
                      Disbursement Date:{" "}
                      <span className="font-bold text-slate-800">
                        {new Date(payslipModalData.record.paymentDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = payslipModalData.record.paymentDate
                          ? new Date(payslipModalData.record.paymentDate).toISOString().split("T")[0]
                          : getTodayDateString()
                        setEditPaymentDateValue(cur)
                        setEditingDisburseDate(!editingDisburseDate)
                      }}
                      className="p-1 rounded-md text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 transition cursor-pointer"
                      title="Adjust Disbursement Date"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                  {editingDisburseDate && (
                    <div className="mt-2 p-2.5 bg-indigo-50/90 rounded-lg border border-indigo-200 text-right space-y-1.5 animate-in fade-in duration-100">
                      <div className="text-[10px] text-indigo-900 font-semibold uppercase tracking-wider">
                        Update Disbursed Date
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="date"
                          value={editPaymentDateValue}
                          onChange={(e) => setEditPaymentDateValue(e.target.value)}
                          className="px-2 py-1 text-xs border border-indigo-300 rounded-md bg-white font-mono text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleUpdateDateSubmit}
                          disabled={actionLoading || !editPaymentDateValue}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md text-[11px] shadow-xs transition disabled:opacity-50 cursor-pointer"
                        >
                          {actionLoading ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDisburseDate(false)}
                          className="px-2 py-1 text-slate-600 hover:text-slate-800 text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    Channel: {payslipModalData.record.splits && payslipModalData.record.splits.length > 0 ? "SPLIT (Multi-Channel)" : (payslipModalData.record.paymentMethod || "Bank Transfer")}
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
              <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                    NET SALARY DISBURSED
                  </span>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    ₹{payslipModalData.record.amountPaid.toLocaleString("en-IN")}
                  </div>
                  <div className="text-xs text-slate-300 italic mt-0.5 font-serif">
                    In Words: {numberToWordsRupees(payslipModalData.record.amountPaid)}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-400 font-mono">
                  <div>Channel: {payslipModalData.record.splits && payslipModalData.record.splits.length > 0 ? "SPLIT (Multi-Channel)" : (payslipModalData.record.paymentMethod || "Bank Transfer")}</div>
                  <div className="mt-0.5">Account: {payslipModalData.record.accountName || "Hospital Main"}</div>
                </div>
              </div>

              {/* Split Details Breakdown (if paid via SPLIT) */}
              {payslipModalData.record.splits && payslipModalData.record.splits.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Split className="w-4 h-4 text-indigo-600" />
                    <span>Split Payment Breakdown</span>
                  </div>
                  <div className="divide-y divide-slate-200 text-xs font-mono">
                    {payslipModalData.record.splits.map((split, i) => (
                      <div key={i} className="py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-sans">
                          <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-mono font-bold text-[10px] flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-800">{split.paymentMethod}</span>
                            <span className="text-slate-500 text-[11px] ml-1.5">via {split.accountName}</span>
                          </div>
                        </div>
                        <span className="font-bold text-slate-900">
                          ₹{split.amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sign-off Stamps */}
              <div className="pt-6 border-t border-slate-200 flex justify-between text-[11px] text-slate-500">
                <div>
                  <div className="h-8" />
                  <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">
                    Employee Signature
                  </div>
                  <div className="text-[10px] text-slate-400">Acknowledged Receipt</div>
                </div>
                <div className="text-center">
                  <div className="h-8" />
                  <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">
                    Accounts & Finance
                  </div>
                  <div className="text-[10px] text-slate-400">Verified & Posted</div>
                </div>
                <div className="text-right">
                  <div className="h-8" />
                  <div className="border-t border-slate-300 pt-1 font-semibold text-slate-700">
                    Authorized Signatory
                  </div>
                  <div className="text-[10px] text-slate-400">Master Finance Division</div>
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
