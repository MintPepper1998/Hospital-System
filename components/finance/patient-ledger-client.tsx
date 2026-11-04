"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft, User, CreditCard, Receipt, FileText, Stethoscope,
  BedDouble, Scissors, Package, Shield, Clock, IndianRupee,
  ChevronDown, ChevronRight, Printer,
} from "lucide-react"

// ─── helpers ───
const fmt = (n: number) => `₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (d: string) => { try { return format(new Date(d), "dd MMM yyyy") } catch { return d } }
const fmtDateTime = (d: string) => { try { return format(new Date(d), "dd MMM yyyy, h:mm a") } catch { return d } }

const TYPE_COLOR: Record<string, string> = {
  OPD: "bg-blue-100 text-blue-700 border-blue-200",
  IPD: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PHARMACY: "bg-purple-100 text-purple-700 border-purple-200",
  LABORATORY: "bg-amber-100 text-amber-700 border-amber-200",
  OT: "bg-red-100 text-red-700 border-red-200",
}

const STATUS_COLOR: Record<string, string> = {
  PAID: "bg-green-600",
  PENDING: "bg-orange-500",
  PARTIAL: "bg-amber-500",
  CANCELLED: "bg-gray-500",
}

// ─── types ───
interface Payment { id: string; paymentDate: string; amount: number; method: string; paymentMethod: string | null; transactionId: string | null; notes: string | null }
interface BillingItem { id: string; description: string; quantity: number; unitPrice: number; amount: number; gstAmount: number; totalAmount: number; serviceCategory: string | null; serviceDate: string | null; performedBy: string | null }
interface BillingRecord { id: string; billNumber: string; type: string; billDate: string; totalAmount: number; discountAmount: number; taxAmount: number; netAmount: number; paidAmount: number; balanceAmount: number; status: string; paymentMethod: string | null; notes: string | null; items: BillingItem[]; payments: Payment[]; appointment: any }
interface IPDAdmission { id: string; admissionDate: string; dischargeDate: string | null; status: string; initialDeposit: number; totalBillAmount: number; amountPaid: number; balanceDue: number; totalBedCharges: number; totalLabCharges: number; totalPharmacyCharges: number; totalOtherCharges: number; reason: string | null; diagnosis: string | null; bed: { bedNumber: string; pricePerDay: number; ward: { name: string } }; primaryDoctor: { user: { name: string | null } }; equipmentUsages: any[] }
interface Surgery { id: string; scheduledDate: string; status: string; procedureName: string; procedureCode: string | null; surgeryCharge: number; leadSurgeon: { user: { name: string | null } } }

interface PatientData {
  id: string; patientId: string
  user: { name: string | null; email: string }
  phone: string | null; gender: string | null; dateOfBirth: string | null
  billings: BillingRecord[]
  ipdAdmissions: IPDAdmission[]
  surgeries: Surgery[]
  insurancePolicies: any[]
  appointments: any[]
}

// ─── main ───
export function PatientLedgerClient({ patient }: { patient: PatientData }) {
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<string>("ALL")

  const toggleBill = (id: string) => setExpandedBills(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })

  // ─── Aggregate stats ───
  const stats = useMemo(() => {
    const bills = patient.billings
    const totalBilled = bills.reduce((s, b) => s + b.netAmount, 0)
    const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0)
    const totalPending = bills.reduce((s, b) => s + b.balanceAmount, 0)
    const ipdDeposits = patient.ipdAdmissions.reduce((s, a) => s + a.initialDeposit, 0)
    const equipmentCharges = patient.ipdAdmissions.reduce((s, a) =>
      s + a.equipmentUsages.filter((u: any) => u.status === "RETURNED").reduce((es: number, u: any) => es + u.computedCharge, 0), 0)

    const byType: Record<string, number> = {}
    bills.forEach(b => { byType[b.type] = (byType[b.type] || 0) + b.netAmount })

    return { totalBilled, totalPaid, totalPending, ipdDeposits, equipmentCharges, byType, billCount: bills.length }
  }, [patient])

  const filteredBills = useMemo(() => {
    if (filter === "ALL") return patient.billings
    return patient.billings.filter(b => b.type === filter)
  }, [patient.billings, filter])

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/finance/billing">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight text-blue-700">Patient Financial Ledger</h2>
          <p className="text-muted-foreground text-sm">Complete billing breakdown for {patient.user.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1.5" /> Print
        </Button>
      </div>

      {/* Patient Info Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
                {(patient.user.name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <div>
                <h3 className="text-lg font-bold">{patient.user.name}</h3>
                <p className="text-sm text-muted-foreground">{patient.patientId} • {patient.phone || "—"} • {patient.gender || ""}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {patient.insurancePolicies.length > 0 && (
                <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                  <Shield className="h-3 w-3 mr-1" /> Insured
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">{patient.billings.length} Bills</Badge>
              <Badge variant="secondary" className="text-xs">{patient.ipdAdmissions.length} IPD Stays</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard label="Total Billed" value={stats.totalBilled} color="text-blue-600" icon={Receipt} borderColor="border-blue-200" />
        <SummaryCard label="Total Paid" value={stats.totalPaid} color="text-green-600" icon={CreditCard} borderColor="border-green-200" />
        <SummaryCard label="Balance Due" value={stats.totalPending} color="text-red-600" icon={IndianRupee} borderColor="border-red-200" />
        <SummaryCard label="IPD Deposits" value={stats.ipdDeposits} color="text-purple-600" icon={BedDouble} borderColor="border-purple-200" />
        <SummaryCard label="Equipment Charges" value={stats.equipmentCharges} color="text-amber-600" icon={Package} borderColor="border-amber-200" />
      </div>

      {/* Revenue by Type Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Revenue by Department</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {["OPD", "IPD", "PHARMACY", "LABORATORY", "OT"].map(t => (
              <div key={t} className={`rounded-lg border p-3 ${TYPE_COLOR[t] || ""}`}>
                <p className="text-xs font-medium opacity-70">{t}</p>
                <p className="text-lg font-bold">{fmt(stats.byType[t] || 0)}</p>
                <p className="text-xs opacity-60">{patient.billings.filter(b => b.type === t).length} bill(s)</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* IPD Admissions Summary */}
      {patient.ipdAdmissions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BedDouble className="h-4 w-4 text-emerald-500" /> IPD Admissions ({patient.ipdAdmissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patient.ipdAdmissions.map(adm => {
                const equipActive = adm.equipmentUsages.filter((u: any) => u.status === "ACTIVE")
                const equipReturned = adm.equipmentUsages.filter((u: any) => u.status === "RETURNED")
                const equipCharges = equipReturned.reduce((s: number, u: any) => s + u.computedCharge, 0)
                return (
                  <div key={adm.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">{adm.bed.ward.name} — Bed {adm.bed.bedNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(adm.admissionDate)} {adm.dischargeDate ? `→ ${fmtDate(adm.dischargeDate)}` : "(Still admitted)"}
                          {" • "} Dr. {adm.primaryDoctor.user.name}
                        </p>
                        {adm.diagnosis && <p className="text-xs mt-1">{adm.diagnosis}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={adm.status === "ADMITTED" ? "default" : "secondary"} className={adm.status === "ADMITTED" ? "bg-green-600" : ""}>{adm.status}</Badge>
                      </div>
                    </div>
                    {/* IPD charges breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
                      <div className="bg-muted rounded p-2"><p className="text-xs text-muted-foreground">Bed Charges</p><p className="font-semibold">{fmt(adm.totalBedCharges)}</p></div>
                      <div className="bg-muted rounded p-2"><p className="text-xs text-muted-foreground">Lab Charges</p><p className="font-semibold">{fmt(adm.totalLabCharges)}</p></div>
                      <div className="bg-muted rounded p-2"><p className="text-xs text-muted-foreground">Pharmacy</p><p className="font-semibold">{fmt(adm.totalPharmacyCharges)}</p></div>
                      <div className="bg-muted rounded p-2"><p className="text-xs text-muted-foreground">Equipment</p><p className="font-semibold">{fmt(equipCharges)}</p></div>
                      <div className="bg-muted rounded p-2"><p className="text-xs text-muted-foreground">Other</p><p className="font-semibold">{fmt(adm.totalOtherCharges)}</p></div>
                      <div className="bg-blue-50 rounded p-2 border border-blue-200"><p className="text-xs text-blue-600">Total Bill</p><p className="font-bold text-blue-700">{fmt(adm.totalBillAmount)}</p></div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span>Deposit: <strong className="text-green-600">{fmt(adm.initialDeposit)}</strong></span>
                      <span>Paid: <strong className="text-green-600">{fmt(adm.amountPaid)}</strong></span>
                      <span>Balance: <strong className={adm.balanceDue > 0 ? "text-red-600" : "text-green-600"}>{fmt(adm.balanceDue)}</strong></span>
                    </div>
                    {/* Equipment details */}
                    {adm.equipmentUsages.length > 0 && (
                      <div className="border-t pt-2">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Equipment Used</p>
                        <div className="space-y-1">
                          {adm.equipmentUsages.map((u: any) => (
                            <div key={u.id} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                              <span>{u.equipment.name} ×{u.quantity}</span>
                              <span className="text-muted-foreground">
                                {fmtDateTime(u.startTime)} {u.endTime ? `→ ${fmtDateTime(u.endTime)}` : "(active)"}
                              </span>
                              <Badge variant={u.status === "ACTIVE" ? "default" : u.status === "RETURNED" ? "secondary" : "destructive"} className="text-[10px]">{u.status}</Badge>
                              <span className="font-mono font-semibold">{u.status === "CANCELLED" ? "—" : fmt(u.computedCharge)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Surgeries */}
      {patient.surgeries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Scissors className="h-4 w-4 text-red-500" /> Surgeries ({patient.surgeries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2">Procedure</th><th className="text-left py-2">Date</th>
                <th className="text-left py-2">Surgeon</th><th className="text-right py-2">Charge</th><th className="text-center py-2">Status</th>
              </tr></thead>
              <tbody>
                {patient.surgeries.map(s => (
                  <tr key={s.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 font-medium">{s.procedureName}{s.procedureCode && <span className="text-xs text-muted-foreground ml-1">({s.procedureCode})</span>}</td>
                    <td className="py-2">{fmtDate(s.scheduledDate)}</td>
                    <td className="py-2">Dr. {s.leadSurgeon.user.name}</td>
                    <td className="py-2 text-center">{fmt(s.surgeryCharge)}</td>
                    <td className="py-2 text-center"><Badge variant="secondary" className="text-xs">{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* All Bills — Expandable */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-500" /> All Invoices & Receipts ({filteredBills.length})
            </CardTitle>
            <div className="flex gap-1">
              {["ALL", "OPD", "IPD", "PHARMACY", "LABORATORY", "OT"].map(t => (
                <Button key={t} variant={filter === t ? "default" : "outline"} size="sm" className="h-7 text-xs"
                  onClick={() => setFilter(t)}>{t === "ALL" ? "All" : t}</Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredBills.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No bills found</p>
          ) : (
            <div className="divide-y">
              {filteredBills.map(bill => {
                const expanded = expandedBills.has(bill.id)
                return (
                  <div key={bill.id}>
                    {/* Bill Row */}
                    <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors text-left"
                      onClick={() => toggleBill(bill.id)}>
                      {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                      <Badge variant="outline" className={`text-[10px] ${TYPE_COLOR[bill.type] || ""}`}>{bill.type}</Badge>
                      <span className="font-mono text-xs text-muted-foreground w-28">{bill.billNumber}</span>
                      <span className="text-xs text-muted-foreground w-24">{fmtDate(bill.billDate)}</span>
                      <span className="flex-1 text-sm truncate">{bill.notes || bill.items.map(i => i.description).join(", ").slice(0, 60) || "—"}</span>
                      <span className="text-sm font-semibold w-24 text-right">{fmt(bill.netAmount)}</span>
                      <span className="text-sm font-semibold w-24 text-right text-green-600">{fmt(bill.paidAmount)}</span>
                      <Badge className={`text-[10px] ${STATUS_COLOR[bill.status] || "bg-gray-400"}`}>{bill.status}</Badge>
                    </button>

                    {/* Expanded Detail */}
                    {expanded && (
                      <div className="px-4 pb-4 bg-muted/20 border-t">
                        {/* Line Items */}
                        <div className="mt-3">
                          <p className="text-xs font-medium text-muted-foreground mb-2">LINE ITEMS</p>
                          <table className="w-full text-xs">
                            <thead><tr className="border-b text-muted-foreground">
                              <th className="text-left py-1.5 font-medium">#</th>
                              <th className="text-left py-1.5 font-medium">Description</th>
                              <th className="text-left py-1.5 font-medium">Category</th>
                              <th className="text-center py-1.5 font-medium">Qty</th>
                              <th className="text-right py-1.5 font-medium">Unit Price</th>
                              <th className="text-right py-1.5 font-medium">GST</th>
                              <th className="text-right py-1.5 font-medium">Total</th>
                            </tr></thead>
                            <tbody>
                              {bill.items.map((item, idx) => (
                                <tr key={item.id} className="border-b">
                                  <td className="py-1.5">{idx + 1}</td>
                                  <td className="py-1.5 font-medium">{item.description}{item.performedBy && <span className="text-muted-foreground ml-1">({item.performedBy})</span>}</td>
                                  <td className="py-1.5">{item.serviceCategory || "—"}</td>
                                  <td className="py-1.5 text-center">{item.quantity}</td>
                                  <td className="py-1.5 text-right font-mono">{fmt(item.unitPrice)}</td>
                                  <td className="py-1.5 text-right font-mono">{item.gstAmount > 0 ? fmt(item.gstAmount) : "—"}</td>
                                  <td className="py-1.5 text-right font-mono font-semibold">{fmt(item.totalAmount)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t font-semibold">
                                <td colSpan={5}></td>
                                <td className="py-1.5 text-right text-xs text-muted-foreground">Subtotal</td>
                                <td className="py-1.5 text-right font-mono">{fmt(bill.totalAmount)}</td>
                              </tr>
                              {bill.discountAmount > 0 && (
                                <tr className="text-green-600"><td colSpan={5}></td>
                                  <td className="py-1 text-right text-xs">Discount</td>
                                  <td className="py-1 text-right font-mono">-{fmt(bill.discountAmount)}</td>
                                </tr>
                              )}
                              {bill.taxAmount > 0 && (
                                <tr><td colSpan={5}></td>
                                  <td className="py-1 text-right text-xs text-muted-foreground">Tax</td>
                                  <td className="py-1 text-right font-mono">{fmt(bill.taxAmount)}</td>
                                </tr>
                              )}
                              <tr className="border-t-2 text-blue-700 font-bold"><td colSpan={5}></td>
                                <td className="py-2 text-right text-xs">Net Amount</td>
                                <td className="py-2 text-right font-mono">{fmt(bill.netAmount)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Payments */}
                        {bill.payments.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">PAYMENTS RECEIVED</p>
                            <div className="space-y-1">
                              {bill.payments.map(p => (
                                <div key={p.id} className="flex items-center justify-between text-xs bg-green-50 rounded px-3 py-1.5 border border-green-100">
                                  <span>{fmtDateTime(p.paymentDate)}</span>
                                  <Badge variant="outline" className="text-[10px]">{p.method || p.paymentMethod || "CASH"}</Badge>
                                  {p.transactionId && <span className="text-muted-foreground">Ref: {p.transactionId}</span>}
                                  <span className="font-mono font-bold text-green-700">{fmt(p.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Balance */}
                        <div className="mt-3 flex justify-end gap-6 text-sm font-medium border-t pt-2">
                          <span>Paid: <strong className="text-green-600">{fmt(bill.paidAmount)}</strong></span>
                          <span>Balance: <strong className={bill.balanceAmount > 0 ? "text-red-600" : "text-green-600"}>{fmt(bill.balanceAmount)}</strong></span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grand Total Footer */}
      <Card className="border-2 border-blue-300 bg-blue-50/50">
        <CardContent className="pt-5 pb-5">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div><p className="text-xs text-muted-foreground">TOTAL BILLED</p><p className="text-2xl font-bold text-blue-700">{fmt(stats.totalBilled)}</p></div>
            <div><p className="text-xs text-muted-foreground">TOTAL RECEIVED</p><p className="text-2xl font-bold text-green-600">{fmt(stats.totalPaid + stats.ipdDeposits)}</p></div>
            <div><p className="text-xs text-muted-foreground">OUTSTANDING</p><p className="text-2xl font-bold text-red-600">{fmt(stats.totalPending)}</p></div>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

// ─── Reusable summary card ───
function SummaryCard({ label, value, color, icon: Icon, borderColor }: {
  label: string; value: number; color: string; icon: any; borderColor: string
}) {
  return (
    <Card className={`border-2 ${borderColor}`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between">
          <div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-xl font-bold ${color}`}>{fmt(value)}</p></div>
          <Icon className={`h-7 w-7 opacity-30 ${color}`} />
        </div>
      </CardContent>
    </Card>
  )
}
