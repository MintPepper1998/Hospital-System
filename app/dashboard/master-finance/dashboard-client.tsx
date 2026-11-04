"use client"

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Landmark,
  Clock,
} from "lucide-react"

interface DashboardData {
  cashPosition: {
    total: number
    accounts: Array<{ id: string; name: string; type: string; balance: number }>
  }
  today: { income: number; expense: number; net: number }
  month: { income: number; expense: number; net: number }
  ytd: { income: number; expense: number; net: number }
  receivables: { total: number; count: number }
  payables: { total: number; count: number }
  departmentRevenue: Array<{ department: string; amount: number }>
  recentTransactions: Array<{
    id: string; date: string; type: string; amount: number
    category: string; accountName: string; description: string | null; paymentMethod: string
  }>
}

function formatCurrency(amount: number): string {
  if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(2)} L`
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toFixed(0)}`
}

function formatFullCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const DEPT_COLORS: Record<string, string> = {
  OPD: "#3b82f6",
  IPD: "#8b5cf6",
  LAB: "#f59e0b",
  OT: "#ef4444",
  RADIOLOGY: "#06b6d4",
  CANTEEN: "#f97316",
  OTHER: "#94a3b8",
}

export function MasterFinanceDashboardClient({ data }: { data: DashboardData }) {
  const totalDeptRevenue = data.departmentRevenue.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Financial Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Real-time financial overview • FY {new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1}-{(new Date().getMonth() >= 3 ? new Date().getFullYear() + 1 : new Date().getFullYear()).toString().slice(-2)}
        </p>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cash Position */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-3">
            <Wallet className="w-3.5 h-3.5" />
            CASH POSITION
          </div>
          <div className="text-2xl font-bold text-slate-800">{formatCurrency(data.cashPosition.total)}</div>
          <div className="mt-3 space-y-1.5">
            {data.cashPosition.accounts.slice(0, 3).map((acc) => (
              <div key={acc.id} className="flex justify-between text-xs">
                <span className="text-slate-500 truncate max-w-[120px]">{acc.name}</span>
                <span className="text-slate-700 font-medium">{formatFullCurrency(acc.balance)}</span>
              </div>
            ))}
            {data.cashPosition.accounts.length > 3 && (
              <div className="text-xs text-blue-600">+{data.cashPosition.accounts.length - 3} more accounts</div>
            )}
          </div>
        </div>

        {/* Today */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-3">
            <Clock className="w-3.5 h-3.5" />
            TODAY
          </div>
          <div className={`text-2xl font-bold ${data.today.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {data.today.net >= 0 ? "+" : ""}{formatCurrency(data.today.net)}
          </div>
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-emerald-600 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />Income</span>
              <span className="font-medium text-slate-700">{formatFullCurrency(data.today.income)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-red-500 flex items-center gap-1"><ArrowDownRight className="w-3 h-3" />Expense</span>
              <span className="font-medium text-slate-700">{formatFullCurrency(data.today.expense)}</span>
            </div>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-3">
            <CreditCard className="w-3.5 h-3.5" />
            RECEIVABLES
          </div>
          <div className="text-2xl font-bold text-amber-600">{formatCurrency(data.receivables.total)}</div>
          <div className="mt-3">
            <div className="text-xs text-slate-500">{data.receivables.count} pending entries</div>
            <div className="mt-2 w-full bg-amber-100 rounded-full h-1.5">
              <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (data.receivables.count / Math.max(1, data.receivables.count + 10)) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* Outstanding Payables */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mb-3">
            <FileText className="w-3.5 h-3.5" />
            PAYABLES
          </div>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(data.payables.total)}</div>
          <div className="mt-3">
            <div className="text-xs text-slate-500">{data.payables.count} unpaid invoices</div>
            <div className="mt-2 w-full bg-red-100 rounded-full h-1.5">
              <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (data.payables.count / Math.max(1, data.payables.count + 10)) * 100)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Second Row: Month + YTD + Department Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Month Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-slate-400" />
            This Month
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Revenue</span>
                <span className="font-medium text-emerald-600">{formatFullCurrency(data.month.income)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, (data.month.income / Math.max(1, data.month.income + data.month.expense)) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Expenses</span>
                <span className="font-medium text-red-500">{formatFullCurrency(data.month.expense)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-red-400 h-2 rounded-full" style={{ width: `${Math.min(100, (data.month.expense / Math.max(1, data.month.income + data.month.expense)) * 100)}%` }} />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Net Surplus</span>
                <span className={`text-lg font-bold ${data.month.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatFullCurrency(data.month.net)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* YTD Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            Year to Date
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Revenue</span>
                <span className="font-medium text-emerald-600">{formatCurrency(data.ytd.income)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min(100, (data.ytd.income / Math.max(1, data.ytd.income + data.ytd.expense)) * 100)}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Expenses</span>
                <span className="font-medium text-red-500">{formatCurrency(data.ytd.expense)}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-red-400 h-2 rounded-full" style={{ width: `${Math.min(100, (data.ytd.expense / Math.max(1, data.ytd.income + data.ytd.expense)) * 100)}%` }} />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Net Surplus (YTD)</span>
                <span className={`text-lg font-bold ${data.ytd.net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(data.ytd.net)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Department Revenue (MTD) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-slate-400" />
            Revenue by Department (MTD)
          </h3>
          {data.departmentRevenue.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No revenue data this month</p>
          ) : (
            <div className="space-y-3">
              {data.departmentRevenue
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 6)
                .map((dept) => (
                  <div key={dept.department}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">{dept.department}</span>
                      <span className="text-slate-700">{formatCurrency(dept.amount)}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full transition-all"
                        style={{
                          width: `${(dept.amount / Math.max(1, totalDeptRevenue)) * 100}%`,
                          backgroundColor: DEPT_COLORS[dept.department] || DEPT_COLORS.OTHER,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-100">
                <th className="text-left p-3 font-medium">Date</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">Account</th>
                <th className="text-left p-3 font-medium">Method</th>
                <th className="text-left p-3 font-medium">Description</th>
                <th className="text-right p-3 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">No recent transactions</td>
                </tr>
              ) : (
                data.recentTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 text-xs text-slate-600">{new Date(tx.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${tx.type === "INCOME" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {tx.category}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-600">{tx.accountName}</td>
                    <td className="p-3 text-xs text-slate-500">{tx.paymentMethod}</td>
                    <td className="p-3 text-xs text-slate-500 max-w-[200px] truncate">{tx.description || "—"}</td>
                    <td className={`p-3 text-right text-xs font-semibold ${tx.type === "INCOME" ? "text-emerald-600" : "text-red-600"}`}>
                      {tx.type === "INCOME" ? "+" : "−"}₹{tx.amount.toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
