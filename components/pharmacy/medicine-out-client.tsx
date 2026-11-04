"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { Printer, CalendarDays, Search, TrendingUp, PackageOpen, CreditCard, Percent, Tag, IndianRupee, Pill } from "lucide-react"

export type MedicineOutRecord = {
  id: string
  medicineName: string
  unitsSold: number
  returnedUnits?: number
  customerName: string
  customerType: string
  paymentMethod: string
  mrpPerUnit: number
  mrpTotal: number
  gstRate: number
  gstAmount: number
  totalAmount: number
  discountAmount: number
  sellPriceAfterDiscount: number
  billDate: Date
  billNumber: string
}

export type MedicineOutSummary = {
  totalUnitsSold: number
  totalMRP: number
  totalGST: number
  totalGrossAmount: number
  totalDiscount: number
  totalSellPrice: number
  totalTransactions: number
  uniqueMedicines: number
}

export function MedicineOutClient({
  initialData,
  initialFromDate,
  initialToDate,
  initialSummary,
}: {
  initialData: MedicineOutRecord[]
  initialFromDate: string
  initialToDate: string
  initialSummary: MedicineOutSummary
}) {
  const router = useRouter()
  const [fromDate, setFromDate] = useState(initialFromDate)
  const [toDate, setToDate] = useState(initialToDate)
  const [searchTerm, setSearchTerm] = useState("")

  const handleApply = () => {
    router.push(`/dashboard/pharmacy/medicine-out?fromDate=${fromDate}&toDate=${toDate}`)
  }

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return initialData
    return initialData.filter((item) =>
      item.medicineName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [initialData, searchTerm])

  const groupedData = useMemo(() => {
    const grouped = new Map<string, {
      dateStr: string
      medicineName: string
      unitsSold: number
      mrpPerUnit: number
      mrpTotal: number
      gstAmount: number
      totalAmount: number
      discountAmount: number
      sellPriceAfterDiscount: number
    }>()

    filteredData.forEach(item => {
      const dateKey = format(new Date(item.billDate), "yyyy-MM-dd")
      const key = `${dateKey}_${item.medicineName}`
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          dateStr: dateKey,
          medicineName: item.medicineName,
          unitsSold: 0,
          mrpPerUnit: item.mrpPerUnit,
          mrpTotal: 0,
          gstAmount: 0,
          totalAmount: 0,
          discountAmount: 0,
          sellPriceAfterDiscount: 0,
        })
      }
      
      const existing = grouped.get(key)!
      existing.unitsSold += item.unitsSold
      existing.mrpTotal += item.mrpTotal
      existing.gstAmount += item.gstAmount
      existing.totalAmount += item.totalAmount
      existing.discountAmount += item.discountAmount
      existing.sellPriceAfterDiscount += item.sellPriceAfterDiscount
    })

    return Array.from(grouped.values()).sort((a, b) => 
      new Date(b.dateStr).getTime() - new Date(a.dateStr).getTime() || 
      a.medicineName.localeCompare(b.medicineName)
    )
  }, [filteredData])

  // Summary stats - use filtered data when searching, else initial summary
  const stats = useMemo(() => {
    if (!searchTerm.trim()) return initialSummary
    // Recompute for filtered data
    return {
      totalUnitsSold: filteredData.reduce((s, i) => s + i.unitsSold, 0),
      totalMRP: filteredData.reduce((s, i) => s + i.mrpTotal, 0),
      totalGST: filteredData.reduce((s, i) => s + i.gstAmount, 0),
      totalGrossAmount: filteredData.reduce((s, i) => s + i.totalAmount, 0),
      totalDiscount: filteredData.reduce((s, i) => s + i.discountAmount, 0),
      totalSellPrice: filteredData.reduce((s, i) => s + i.sellPriceAfterDiscount, 0),
      totalTransactions: new Set(filteredData.map(i => i.billNumber)).size,
      uniqueMedicines: new Set(filteredData.map(i => i.medicineName)).size,
    }
  }, [filteredData, searchTerm, initialSummary])

  const handlePrint = () => {
    window.print()
  }

  const fmtCurrency = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="medicine-out-wrapper space-y-6 print:space-y-0 print:block print:m-0 print:p-0">
      {/* Controls Section - Hidden in Print */}
      <div className="print:hidden flex flex-col md:flex-row gap-4 items-end bg-white/50 backdrop-blur-xl p-4 rounded-[2rem] border border-gray-200/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
        <div className="flex-1 space-y-1.5 w-full">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Search Medicine</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="e.g. Paracetamol..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-11 rounded-xl bg-white shadow-sm border-gray-200 focus-visible:ring-gray-200"
            />
          </div>
        </div>
        
        <div className="space-y-1.5 w-full md:w-auto">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">Date Range</label>
          <div className="flex items-center gap-2">
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="pl-9 h-11 rounded-xl bg-white shadow-sm border-gray-200 focus-visible:ring-gray-200 w-40"
              />
            </div>
            <span className="text-muted-foreground text-sm font-medium">to</span>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="pl-9 h-11 rounded-xl bg-white shadow-sm border-gray-200 focus-visible:ring-gray-200 w-40"
              />
            </div>
            <Button 
              onClick={handleApply}
              className="h-11 rounded-xl px-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm active:scale-[0.98] transition-all ml-1"
            >
              Apply
            </Button>
          </div>
        </div>

        <Button 
          onClick={handlePrint}
          variant="outline"
          className="h-11 rounded-xl px-6 gap-2 border-gray-200 shadow-sm bg-white hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          <Printer className="h-4 w-4 text-gray-600" />
          <span>Print Report</span>
        </Button>
      </div>

      {/* Summary Cards - Always visible */}
      <div className="print:hidden grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total Medicines Sold */}
        <div className="bg-white rounded-[1.25rem] p-5 border border-gray-200 shadow-sm flex flex-col gap-1.5 relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-blue-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out" />
          <div className="flex items-center gap-1.5 text-blue-600 relative z-10">
            <Pill className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Medicines Sold</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 relative z-10 tracking-tight">
            {stats.uniqueMedicines.toLocaleString()}
          </p>
        </div>

        {/* Total Units Sold */}
        <div className="bg-white rounded-[1.25rem] p-5 border border-gray-200 shadow-sm flex flex-col gap-1.5 relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-indigo-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out" />
          <div className="flex items-center gap-1.5 text-indigo-600 relative z-10">
            <PackageOpen className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Units Sold</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 relative z-10 tracking-tight">
            {stats.totalUnitsSold.toLocaleString()}
          </p>
        </div>

        {/* Total MRP */}
        <div className="bg-white rounded-[1.25rem] p-5 border border-gray-200 shadow-sm flex flex-col gap-1.5 relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-cyan-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out" />
          <div className="flex items-center gap-1.5 text-cyan-600 relative z-10">
            <Tag className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total MRP</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 relative z-10 tracking-tight">
            {fmtCurrency(stats.totalMRP)}
          </p>
        </div>

        {/* Total Discount */}
        <div className="bg-white rounded-[1.25rem] p-5 border border-gray-200 shadow-sm flex flex-col gap-1.5 relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-rose-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out" />
          <div className="flex items-center gap-1.5 text-rose-600 relative z-10">
            <Percent className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Discount</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 relative z-10 tracking-tight">
            {fmtCurrency(stats.totalDiscount)}
          </p>
        </div>

        {/* Total Sell Price */}
        <div className="bg-white rounded-[1.25rem] p-5 border border-gray-200 shadow-sm flex flex-col gap-1.5 relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-emerald-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out" />
          <div className="flex items-center gap-1.5 text-emerald-600 relative z-10">
            <IndianRupee className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Net Sell Price</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 relative z-10 tracking-tight">
            {fmtCurrency(stats.totalSellPrice)}
          </p>
        </div>

        {/* Total Transactions */}
        <div className="bg-white rounded-[1.25rem] p-5 border border-gray-200 shadow-sm flex flex-col gap-1.5 relative overflow-hidden group">
          <div className="absolute -right-3 -top-3 w-20 h-20 bg-purple-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700 ease-out" />
          <div className="flex items-center gap-1.5 text-purple-600 relative z-10">
            <CreditCard className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Transactions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 relative z-10 tracking-tight">
            {stats.totalTransactions.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Print-Only View — compact professional layout with multi-page support */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Screen: Hide the print template */
        .medicine-out-print-root {
          display: none !important;
        }

        /* Print: Make visible and enable smooth multi-page pagination */
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }

          html, body {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          /* Ensure all parent containers flow naturally without clipping */
          main,
          body > div,
          .medicine-out-wrapper {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            position: static !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            max-width: none !important;
          }

          /* Make print root visible and flow statically */
          .medicine-out-print-root {
            display: block !important;
            visibility: visible !important;
            position: static !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
          }

          /* Multi-page table pagination */
          .medicine-out-print-root table {
            page-break-inside: auto !important;
            break-inside: auto !important;
            border-collapse: collapse !important;
            width: 100% !important;
          }

          .medicine-out-print-root thead {
            display: table-header-group !important;
          }

          .medicine-out-print-root tbody {
            page-break-inside: auto !important;
            break-inside: auto !important;
          }

          .medicine-out-print-root tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .medicine-out-print-root th,
          .medicine-out-print-root td {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}} />
      <div className="medicine-out-print-root">
        {/* Header */}
        <div style={{ borderBottom: '2px solid #000', paddingBottom: '4px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h1 style={{ fontSize: '16px', fontWeight: 800, margin: 0, letterSpacing: '0.5px' }}>MEDICINE OUT REPORT</h1>
              <p style={{ fontSize: '10px', margin: '2px 0 0', color: '#444' }}>
                Period: {format(new Date(fromDate), "dd/MM/yyyy")} – {format(new Date(toDate), "dd/MM/yyyy")}
                {searchTerm && <> &nbsp;| Filter: <strong>{searchTerm}</strong></>}
              </p>
            </div>
            <p style={{ fontSize: '9px', color: '#666', margin: 0 }}>
              Generated: {format(new Date(), "dd/MM/yyyy HH:mm")}
            </p>
          </div>
        </div>

        {/* Summary strip */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '10px', marginBottom: '6px', padding: '3px 0', borderBottom: '1px solid #ccc' }}>
          <span><strong>Items:</strong> {stats.uniqueMedicines}</span>
          <span><strong>Units:</strong> {stats.totalUnitsSold}</span>
          <span><strong>MRP:</strong> {fmtCurrency(stats.totalMRP)}</span>
          <span><strong>Discount:</strong> {fmtCurrency(stats.totalDiscount)}</span>
          <span><strong>Net Sale:</strong> {fmtCurrency(stats.totalSellPrice)}</span>
          <span><strong>Bills:</strong> {stats.totalTransactions}</span>
        </div>
        
        {groupedData.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ border: '1px solid #999', padding: '2px 3px', fontWeight: 700, textAlign: 'center', width: '24px' }}>#</th>
                <th style={{ border: '1px solid #999', padding: '2px 3px', fontWeight: 700, width: '60px' }}>Date</th>
                <th style={{ border: '1px solid #999', padding: '2px 3px', fontWeight: 700 }}>Medicine Name</th>
                <th style={{ border: '1px solid #999', padding: '2px 3px', fontWeight: 700, textAlign: 'center', width: '32px' }}>Qty</th>
                <th style={{ border: '1px solid #999', padding: '2px 3px', fontWeight: 700, textAlign: 'right', width: '58px' }}>MRP/Unit</th>
                <th style={{ border: '1px solid #999', padding: '2px 3px', fontWeight: 700, textAlign: 'right', width: '65px' }}>MRP Total</th>
                <th style={{ border: '1px solid #999', padding: '2px 3px', fontWeight: 700, textAlign: 'right', width: '52px' }}>Disc.</th>
                <th style={{ border: '1px solid #999', padding: '2px 3px', fontWeight: 700, textAlign: 'right', width: '68px' }}>Sell Price</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.map((item, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ border: '1px solid #ccc', padding: '1px 3px', textAlign: 'center', color: '#888' }}>{index + 1}</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 3px', whiteSpace: 'nowrap' }}>{format(new Date(item.dateStr), "dd/MM/yy")}</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 3px' }}>{item.medicineName}</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 3px', textAlign: 'center' }}>{item.unitsSold}</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 3px', textAlign: 'right' }}>{fmtCurrency(item.mrpPerUnit)}</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 3px', textAlign: 'right' }}>{fmtCurrency(item.mrpTotal)}</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 3px', textAlign: 'right' }}>{item.discountAmount > 0 ? fmtCurrency(item.discountAmount) : '—'}</td>
                  <td style={{ border: '1px solid #ccc', padding: '1px 3px', textAlign: 'right', fontWeight: 600 }}>{fmtCurrency(item.sellPriceAfterDiscount)}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ backgroundColor: '#e5e7eb', fontWeight: 700 }}>
                <td colSpan={3} style={{ border: '1px solid #999', padding: '2px 3px' }}>TOTAL ({groupedData.length} items)</td>
                <td style={{ border: '1px solid #999', padding: '2px 3px', textAlign: 'center' }}>{groupedData.reduce((s, i) => s + i.unitsSold, 0)}</td>
                <td style={{ border: '1px solid #999', padding: '2px 3px', textAlign: 'right' }}>—</td>
                <td style={{ border: '1px solid #999', padding: '2px 3px', textAlign: 'right' }}>{fmtCurrency(groupedData.reduce((s, i) => s + i.mrpTotal, 0))}</td>
                <td style={{ border: '1px solid #999', padding: '2px 3px', textAlign: 'right' }}>{fmtCurrency(groupedData.reduce((s, i) => s + i.discountAmount, 0))}</td>
                <td style={{ border: '1px solid #999', padding: '2px 3px', textAlign: 'right' }}>{fmtCurrency(groupedData.reduce((s, i) => s + i.sellPriceAfterDiscount, 0))}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p>No records found.</p>
        )}
      </div>

      {/* Screen View (Hidden during print) */}
      <div className="print:hidden space-y-6">

      {/* Main Table Card (Screen Only) */}
      <Card className="rounded-[1.5rem] overflow-hidden border-gray-200 shadow-sm">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
          <CardTitle className="text-lg font-semibold text-gray-800">
            {searchTerm ? `Sales Records for "${searchTerm}"` : "All Sales Records"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {groupedData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
              <PackageOpen className="h-12 w-12 text-gray-200" />
              <p>No medicine sales found for this criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-semibold w-[140px]">Date</TableHead>
                    <TableHead className="font-semibold">Medicine Name</TableHead>
                    <TableHead className="font-semibold text-right">Units Sold</TableHead>
                    <TableHead className="font-semibold text-right">MRP/Unit</TableHead>
                    <TableHead className="font-semibold text-right">MRP Total</TableHead>
                    <TableHead className="font-semibold text-right">Discount</TableHead>
                    <TableHead className="font-semibold text-right">Sell Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedData.map((item, i) => (
                    <TableRow key={`${item.dateStr}-${item.medicineName}-${i}`} className="group hover:bg-gray-50/50 transition-colors">
                      <TableCell className="text-muted-foreground whitespace-nowrap font-medium">
                        {format(new Date(item.dateStr), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium text-gray-900">
                        {item.medicineName}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-700">
                        {item.unitsSold}
                      </TableCell>
                      <TableCell className="text-right text-gray-600 font-medium">
                        {fmtCurrency(item.mrpPerUnit)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-gray-800">
                        {fmtCurrency(item.mrpTotal)}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.discountAmount > 0 ? (
                          <span className="text-rose-600 font-semibold">-{fmtCurrency(item.discountAmount)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">
                        {fmtCurrency(item.sellPriceAfterDiscount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Footer Row */}
                  <TableRow className="bg-gray-50 border-t-2 border-gray-200 hover:bg-gray-50">
                    <TableCell colSpan={2} className="font-bold text-gray-900">
                      Total ({groupedData.length} items)
                    </TableCell>
                    <TableCell className="text-right font-bold text-gray-900">
                      {groupedData.reduce((s, i) => s + i.unitsSold, 0)}
                    </TableCell>
                    <TableCell className="text-right text-gray-400">—</TableCell>
                    <TableCell className="text-right font-bold text-gray-900">
                      {fmtCurrency(groupedData.reduce((s, i) => s + i.mrpTotal, 0))}
                    </TableCell>
                    <TableCell className="text-right font-bold text-rose-600">
                      {groupedData.reduce((s, i) => s + i.discountAmount, 0) > 0
                        ? `-${fmtCurrency(groupedData.reduce((s, i) => s + i.discountAmount, 0))}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-700">
                      {fmtCurrency(groupedData.reduce((s, i) => s + i.sellPriceAfterDiscount, 0))}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}
