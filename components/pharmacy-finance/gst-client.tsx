"use client"

import * as React from "react"
import { PageHeader } from "./page-header"
import { DateRangeFilter } from "./date-range-filter"
import { Money } from "./money"
import { ExportButton } from "./export-button"
import { DateRange, fmtIST } from "@/lib/pharmacy-finance/dates"
import { GstSummaryData, getGstExportRows } from "@/app/actions/pharmacy-fin/gst"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  TrendingDown,
  TrendingUp,
  Receipt,
  Building2,
  AlertCircle,
  CheckCircle2,
  Coins,
  ShieldCheck,
  Percent,
} from "lucide-react"

export function GstClient({
  data,
  range,
}: {
  data: GstSummaryData
  range: DateRange
}) {
  const { settings, kpis, outwardRateSummary, inwardRateSummary, reconciliation, hsnSummary, outwardInvoices, inwardInvoices } = data

  const exportFilename = `pharmacy-gst-summary-${range.fromStr || "from"}-to-${range.toStr || "to"}`

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="GST Summary & Tax Computation"
        subtitle="GSTR-3B tax liability, Input Tax Credit (ITC) reconciliation, rate slabs, and HSN compliance."
        action={
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border-amber-200 text-xs">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-600" />
              CA Audit View
            </Badge>
            <ExportButton
              fetchRows={() => getGstExportRows(range)}
              filename={exportFilename}
            />
          </div>
        }
      />

      {/* ── Pharmacy Entity Identity Strip ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-base">{settings.pharmacyName}</span>
              {settings.gstNo ? (
                <Badge variant="secondary" className="font-mono text-xs font-semibold bg-slate-100 text-slate-800">
                  GSTIN: {settings.gstNo}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-amber-700 border-amber-200 bg-amber-50">
                  GSTIN Not Set
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {settings.drugLicense && <>D.L. No: <span className="font-medium text-slate-700 mr-3">{settings.drugLicense}</span></>}
              {settings.address && <span>{settings.address}</span>}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tax Return Period</div>
          <div className="text-sm font-bold text-slate-800">
            {fmtIST(range.from, "dd MMM yyyy")} &mdash; {fmtIST(new Date(range.to.getTime() - 1), "dd MMM yyyy")}
          </div>
        </div>
      </div>

      {/* ── Statutory Disclaimer Alert ── */}
      <div className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-200 bg-amber-50/70 text-amber-900 text-xs">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-semibold text-amber-950">Statutory Tax Filing Notice</p>
          <p className="text-amber-800 leading-relaxed">
            This report generates indicative tax computation from pharmacy sales, credit notes, purchase bills, and debit notes.
            All intra-state supplies are computed at 50% CGST + 50% SGST. Please reconcile with your official GSTR-2B statement and consult your Chartered Accountant before filing returns on the GST portal.
          </p>
        </div>
      </div>

      {/* ── Date Range Controls ── */}
      <DateRangeFilter />

      {/* ── Executive Metric KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Gross Outward Turnover */}
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Taxable Turnover</span>
              <Receipt className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900">
              <Money value={kpis.taxableTurnover} />
            </div>
            <div className="text-xs text-slate-500 mt-1 flex justify-between">
              <span>Gross Tax: <Money value={kpis.grossSalesTax} /></span>
              <span>Reversals: -<Money value={kpis.salesReturnTax} /></span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Net Output Tax */}
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Output Tax (Sales)</span>
              <TrendingUp className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-extrabold text-rose-600">
              <Money value={kpis.netOutputTax} />
            </div>
            <div className="text-xs text-slate-500 mt-1 flex gap-3">
              <span>CGST: <Money value={kpis.netOutputCgst} /></span>
              <span>SGST: <Money value={kpis.netOutputSgst} /></span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Net Eligible ITC */}
        <Card className="border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Eligible ITC (Purchases)</span>
              <TrendingDown className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600">
              <Money value={kpis.netEligibleItc} />
            </div>
            <div className="text-xs text-slate-500 mt-1 flex gap-3">
              <span>CGST: <Money value={kpis.netInputCgst} /></span>
              <span>SGST: <Money value={kpis.netInputSgst} /></span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 4: Net Balance (Payable / ITC Carried Forward) */}
        <Card className={`border shadow-sm ${kpis.isPayable ? "bg-rose-50/40 border-rose-200" : "bg-emerald-50/40 border-emerald-200"}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                {kpis.isPayable ? "Net GST Payable" : "ITC Carried Forward"}
              </span>
              <Coins className={`h-4 w-4 ${kpis.isPayable ? "text-rose-600" : "text-emerald-600"}`} />
            </div>
            <div className={`text-2xl font-black ${kpis.isPayable ? "text-rose-700" : "text-emerald-700"}`}>
              <Money value={Math.abs(kpis.netTaxPayable)} />
            </div>
            <p className="text-xs mt-1 font-medium text-slate-600">
              {kpis.isPayable ? (
                <span className="text-rose-600 font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 inline" /> Cash/Challan Payment Required
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 inline" /> Credit Available for Next Month
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Comprehensive Tabs ── */}
      <Tabs defaultValue="3b-summary" className="space-y-4">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="3b-summary" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            GSTR-3B Tax Slabs & Reconciliation
          </TabsTrigger>
          <TabsTrigger value="outward" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Outward Supplies (Sales)
          </TabsTrigger>
          <TabsTrigger value="inward" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Inward Supplies (ITC Purchases)
          </TabsTrigger>
          <TabsTrigger value="hsn" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            HSN Summary (GSTR-1 Table 12)
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 1: GSTR-3B Tax Slabs & Reconciliation                      */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="3b-summary" className="space-y-6">
          {/* Rate-by-Rate Net Tax Position */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">
                    GSTR-3B Rate-Wise Tax Liability & ITC Offset
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Net liability computed after adjusting sales returns and eligible purchase credits per tax slab.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {reconciliation.length} Tax Slabs
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-slate-400 font-semibold uppercase tracking-wider text-left bg-slate-50/70">
                      <th className="py-2.5 px-3">Tax Slab</th>
                      <th className="py-2.5 px-3 text-right">Gross Output Tax</th>
                      <th className="py-2.5 px-3 text-right">Less Returns</th>
                      <th className="py-2.5 px-3 text-right">Net Output Tax</th>
                      <th className="py-2.5 px-3 text-right">Eligible ITC</th>
                      <th className="py-2.5 px-3 text-right">Net Tax Balance</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reconciliation.map((r) => (
                      <tr key={r.rate} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 font-bold text-slate-800 flex items-center gap-1.5">
                          <Percent className="h-3.5 w-3.5 text-indigo-500" />
                          {r.rate}% GST Slab
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          <Money value={r.outputTax} />
                        </td>
                        <td className="py-3 px-3 text-right text-rose-500">
                          {r.returnTax > 0 ? <>-<Money value={r.returnTax} /></> : "-"}
                        </td>
                        <td className="py-3 px-3 text-right font-semibold text-slate-900">
                          <Money value={r.netOutput} />
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-600 font-medium">
                          <Money value={r.eligibleItc} />
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold">
                          <span className={r.netBalance > 0 ? "text-rose-600" : r.netBalance < 0 ? "text-emerald-600" : "text-slate-500"}>
                            <Money value={r.netBalance} />
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {r.netBalance > 0 ? (
                            <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 text-[10px] px-2 py-0.5">Payable</Badge>
                          ) : r.netBalance < 0 ? (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[10px] px-2 py-0.5">ITC Credit</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 text-[10px] px-2 py-0.5">Balanced</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 font-extrabold bg-slate-50 text-slate-900">
                      <td className="py-3 px-3">Total (GSTR-3B Net)</td>
                      <td className="py-3 px-3 text-right"><Money value={kpis.grossSalesTax} /></td>
                      <td className="py-3 px-3 text-right text-rose-600">
                        {kpis.salesReturnTax > 0 ? <>-<Money value={kpis.salesReturnTax} /></> : "-"}
                      </td>
                      <td className="py-3 px-3 text-right"><Money value={kpis.netOutputTax} /></td>
                      <td className="py-3 px-3 text-right text-emerald-700"><Money value={kpis.netEligibleItc} /></td>
                      <td className="py-3 px-3 text-right text-base">
                        <span className={kpis.isPayable ? "text-rose-700" : "text-emerald-700"}>
                          <Money value={kpis.netTaxPayable} />
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={kpis.isPayable ? "destructive" : "default"} className="text-xs">
                          {kpis.isPayable ? "Net Payable" : "Carry Forward"}
                        </Badge>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Side-by-Side Slabs Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Outward Slabs Card */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-rose-500" />
                  Outward Tax Slabs (Sales)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-slate-400 text-left font-semibold">
                      <th className="py-2">Rate</th>
                      <th className="py-2 text-right">Taxable</th>
                      <th className="py-2 text-right">CGST</th>
                      <th className="py-2 text-right">SGST</th>
                      <th className="py-2 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {outwardRateSummary.map((r) => (
                      <tr key={r.rate}>
                        <td className="py-2 font-bold text-slate-700">{r.rate}%</td>
                        <td className="py-2 text-right text-slate-600"><Money value={r.taxableValue} /></td>
                        <td className="py-2 text-right text-slate-600"><Money value={r.cgst} /></td>
                        <td className="py-2 text-right text-slate-600"><Money value={r.sgst} /></td>
                        <td className="py-2 text-right font-bold text-rose-600"><Money value={r.totalTax} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Inward Slabs Card */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 border-b bg-slate-50/50">
                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-emerald-500" />
                  Inward Tax Slabs (Purchases / ITC)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-slate-400 text-left font-semibold">
                      <th className="py-2">Rate</th>
                      <th className="py-2 text-right">Taxable</th>
                      <th className="py-2 text-right">Input CGST</th>
                      <th className="py-2 text-right">Input SGST</th>
                      <th className="py-2 text-right">Total ITC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inwardRateSummary.map((r) => (
                      <tr key={r.rate}>
                        <td className="py-2 font-bold text-slate-700">{r.rate}%</td>
                        <td className="py-2 text-right text-slate-600"><Money value={r.taxableValue} /></td>
                        <td className="py-2 text-right text-slate-600"><Money value={r.cgst} /></td>
                        <td className="py-2 text-right text-slate-600"><Money value={r.sgst} /></td>
                        <td className="py-2 text-right font-bold text-emerald-600"><Money value={r.totalTax} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 2: Outward Supplies (Sales)                                */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="outward" className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-800">
                Outward Supplies Tax Register (Sales Bills)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Itemized tax collected on retail patient sales and billing counter transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {outwardInvoices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No sales recorded in the selected period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 text-left uppercase tracking-wider font-semibold bg-slate-50/70">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Bill #</th>
                        <th className="py-2.5 px-3">Customer / Patient</th>
                        <th className="py-2.5 px-3">Channel</th>
                        <th className="py-2.5 px-3 text-right">Taxable Base</th>
                        <th className="py-2.5 px-3 text-right">CGST</th>
                        <th className="py-2.5 px-3 text-right">SGST</th>
                        <th className="py-2.5 px-3 text-right">Total GST</th>
                        <th className="py-2.5 px-3 text-right">Net Bill</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {outwardInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-slate-600">{fmtIST(inv.date, "dd MMM yyyy")}</td>
                          <td className="py-2.5 px-3 font-semibold text-indigo-600 font-mono">{inv.billNumber}</td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">{inv.customerName}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                              {inv.channel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700"><Money value={inv.taxableValue} /></td>
                          <td className="py-2.5 px-3 text-right text-slate-600"><Money value={inv.cgst} /></td>
                          <td className="py-2.5 px-3 text-right text-slate-600"><Money value={inv.sgst} /></td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600"><Money value={inv.totalTax} /></td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900"><Money value={inv.netAmount} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 3: Inward Supplies (Purchases / ITC)                       */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="inward" className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-slate-800">
                Inward Supplies Tax Register (Purchases & ITC Claims)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Eligible Input Tax Credit (ITC) paid on medicine purchases from registered suppliers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inwardInvoices.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No purchases recorded in the selected period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 text-left uppercase tracking-wider font-semibold bg-slate-50/70">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Supplier Name</th>
                        <th className="py-2.5 px-3">Supplier GSTIN</th>
                        <th className="py-2.5 px-3 text-right">Taxable Value</th>
                        <th className="py-2.5 px-3 text-right">Input CGST</th>
                        <th className="py-2.5 px-3 text-right">Input SGST</th>
                        <th className="py-2.5 px-3 text-right">Total ITC</th>
                        <th className="py-2.5 px-3 text-right">Invoice Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inwardInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-slate-600">{fmtIST(inv.date, "dd MMM yyyy")}</td>
                          <td className="py-2.5 px-3 font-semibold text-indigo-600 font-mono">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-3 text-slate-800 font-medium">{inv.supplierName}</td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{inv.gstNumber || "Unregistered"}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700"><Money value={inv.taxableValue} /></td>
                          <td className="py-2.5 px-3 text-right text-slate-600"><Money value={inv.inputCgst} /></td>
                          <td className="py-2.5 px-3 text-right text-slate-600"><Money value={inv.inputSgst} /></td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600"><Money value={inv.totalItc} /></td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900"><Money value={inv.grandTotal} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TAB 4: HSN Summary (GSTR-1 Table 12)                           */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <TabsContent value="hsn" className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-800">
                    HSN-Wise Outward Supplies Summary (GSTR-1 Table 12)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Harmonized System of Nomenclature (HSN) compliance breakdown for pharmaceutical goods sold.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {hsnSummary.length} HSN Codes
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {hsnSummary.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No HSN data available for the selected period.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-slate-400 text-left uppercase tracking-wider font-semibold bg-slate-50/70">
                        <th className="py-2.5 px-3">HSN Code</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">UQC</th>
                        <th className="py-2.5 px-3 text-right">Total Qty</th>
                        <th className="py-2.5 px-3 text-right">Taxable Value</th>
                        <th className="py-2.5 px-3 text-right">Central Tax (CGST)</th>
                        <th className="py-2.5 px-3 text-right">State Tax (SGST)</th>
                        <th className="py-2.5 px-3 text-right">Total Tax</th>
                        <th className="py-2.5 px-3 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {hsnSummary.map((h) => (
                        <tr key={h.hsnCode} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">{h.hsnCode}</td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{h.description}</td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono">NOS</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-700">{h.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-800"><Money value={h.taxableValue} /></td>
                          <td className="py-2.5 px-3 text-right text-slate-600"><Money value={h.cgst} /></td>
                          <td className="py-2.5 px-3 text-right text-slate-600"><Money value={h.sgst} /></td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600"><Money value={h.totalTax} /></td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-slate-900"><Money value={h.totalValue} /></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 font-extrabold bg-slate-50 text-slate-900">
                        <td className="py-3 px-3" colSpan={3}>Total HSN Outward</td>
                        <td className="py-3 px-3 text-right">{hsnSummary.reduce((s, h) => s + h.quantity, 0)}</td>
                        <td className="py-3 px-3 text-right"><Money value={hsnSummary.reduce((s, h) => s + h.taxableValue, 0)} /></td>
                        <td className="py-3 px-3 text-right"><Money value={hsnSummary.reduce((s, h) => s + h.cgst, 0)} /></td>
                        <td className="py-3 px-3 text-right"><Money value={hsnSummary.reduce((s, h) => s + h.sgst, 0)} /></td>
                        <td className="py-3 px-3 text-right text-rose-600"><Money value={hsnSummary.reduce((s, h) => s + h.totalTax, 0)} /></td>
                        <td className="py-3 px-3 text-right"><Money value={hsnSummary.reduce((s, h) => s + h.totalValue, 0)} /></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
