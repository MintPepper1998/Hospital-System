"use client"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { format, isPast, addDays } from "date-fns"
import { AlertTriangle, PackageSearch, Search, X, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"


interface InventoryBatchesTableProps {
  batches: any[]
}

export function InventoryBatchesTable({ batches }: InventoryBatchesTableProps) {
  const [searchInput, setSearchInput] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounce search input (300ms)
  const handleSearch = useCallback((value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value.trim().toLowerCase())
    }, 300)
  }, [])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // Filter batches based on debounced query
  const filteredBatches = useMemo(() => {
    if (!debouncedQuery) return batches
    return batches.filter((b: any) =>
      b.medicine?.name?.toLowerCase().startsWith(debouncedQuery) ||
      b.medicine?.type?.toLowerCase().startsWith(debouncedQuery) ||
      b.medicine?.strength?.toLowerCase().startsWith(debouncedQuery) ||
      b.batchNumber?.toLowerCase().startsWith(debouncedQuery) ||
      b.supplier?.name?.toLowerCase().startsWith(debouncedQuery)
    )
  }, [batches, debouncedQuery])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const getExpiryStatus = (expiryDate: Date) => {
    if (isPast(new Date(expiryDate))) {
      return { label: "Expired", class: "bg-red-100 text-red-800 hover:bg-red-100" }
    }
    if (isPast(addDays(new Date(expiryDate), -90))) {
      return { label: "Expiring Soon", class: "bg-orange-100 text-orange-800 hover:bg-orange-100" }
    }
    return { label: "Valid", class: "bg-green-100 text-green-800 hover:bg-green-100" }
  }





  if (batches.length === 0) {
    return (
      <div className="text-center py-12">
        <PackageSearch className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
        <h3 className="mt-4 text-lg font-semibold">No stock batches found</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Click "Add Stock" to record incoming medicine batches
        </p>
      </div>
    )
  }

  // ── Print Stock Verification Sheet ──────────
  const printStockSheet = () => {
    const rows = filteredBatches.map((b: any, idx: number) => {
      const expiry = b.expiryDate ? format(new Date(b.expiryDate), "MMM yyyy") : "—"
      const mps = b.medicinesPerStrip || 1
      const mrp = b.sellingPrice ? `₹${(Number(b.sellingPrice) * mps).toFixed(2)}` : "—"
      
      const qtyStrips = Math.floor(b.quantity / mps)
      const qtyLoose = b.quantity % mps
      const qtyDisplay = mps > 1 
        ? `${qtyStrips} str${qtyLoose > 0 ? ` + ${qtyLoose}` : ''}` 
        : `${b.quantity}`

      const location = b.medicine?.storageLocation || "—"

      return `<tr>
        <td style="text-align:center">${idx + 1}</td>
        <td>${b.medicine?.name || "Unknown"}</td>
        <td>${b.medicine?.strength || "—"}</td>
        <td>${b.medicine?.type || "—"}</td>
        <td style="text-align:center">${mps}</td>
        <td>${b.batchNumber || "—"}</td>
        <td style="text-align:center">${expiry}</td>
        <td>${b.supplier?.name || "—"}</td>
        <td>${location}</td>
        <td style="text-align:right">${mrp}</td>
        <td style="text-align:center;font-weight:600">${qtyDisplay}</td>
        <td></td>
        <td></td>
      </tr>`
    }).join("")

    const html = `<!DOCTYPE html>
    <html><head><title>Stock Verification Sheet</title>
    <style>
      @page { size: landscape; margin: 10mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; }
      .header { text-align: center; margin-bottom: 12px; border-bottom: 2px solid #0066CC; padding-bottom: 8px; }
      .header h1 { font-size: 18px; font-weight: 700; color: #0066CC; }
      .header p { font-size: 10px; color: #666; margin-top: 2px; }
      table { width: 100%; border-collapse: collapse; }
      th { color: #000; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; padding: 6px; }
      th, td { border: 1px solid #aaa; padding: 4px 6px; }
      tr:nth-child(even) { background: #f8fafc; }
      td:nth-child(12), td:nth-child(13) { min-width: 70px; background: #fffbeb; }
      th:nth-child(12), th:nth-child(13) { background: #fef3c7; color: #000; }
      .footer { margin-top: 20px; font-size: 10px; color: #666; display: flex; justify-content: space-between; }
      .sig-line { margin-top: 40px; display: flex; justify-content: space-between; }
      .sig-line div { text-align: center; width: 200px; }
      .sig-line div span { display: block; border-top: 1px solid #333; margin-top: 40px; padding-top: 4px; font-size: 10px; }
    </style></head><body>
    <div class="header">
      <h1>📋 Stock Verification Sheet</h1>
      <p>Printed on: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} | Total Batches: ${filteredBatches.length}</p>
    </div>
    <table>
      <thead><tr>
        <th style="width:35px">S.No</th>
        <th>Medicine Name</th>
        <th>Strength</th>
        <th>Type</th>
        <th style="width:40px">Pack</th>
        <th>Batch No</th>
        <th>Expiry</th>
        <th>Supplier</th>
        <th>Location</th>
        <th>MRP</th>
        <th style="width:75px">System Qty</th>
        <th style="width:75px">Physical Count</th>
        <th style="width:75px">Missing</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="footer">
      <span>Total items: ${filteredBatches.length}</span>
      <span>Shree Kamal Hospital</span>
    </div>
    <div class="sig-line">
      <div><span>Checked By</span></div>
      <div><span>Verified By</span></div>
      <div><span>Manager Signature</span></div>
    </div>
    </body></html>`

    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.top = "-10000px"
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
      iframe.contentWindow?.focus()
      setTimeout(() => {
        iframe.contentWindow?.print()
        setTimeout(() => document.body.removeChild(iframe), 2000)
      }, 300)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar + Print Button */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search batches..."
            value={searchInput}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-9 h-9"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); setDebouncedQuery("") }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={printStockSheet} className="gap-1.5 h-9">
          <Printer className="h-4 w-4" />
          Print Stock Sheet
        </Button>
      </div>
      {debouncedQuery && (
        <p className="text-xs text-muted-foreground">
          Showing {filteredBatches.length} of {batches.length} batches
        </p>
      )}

      {filteredBatches.length === 0 ? (
        <div className="text-center py-8">
          <Search className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
          <p className="mt-3 text-sm text-muted-foreground">No batches match &quot;{searchInput}&quot;</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Medicine</TableHead>
                <TableHead>Batch / Expiry</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Purchase (₹)</TableHead>
                <TableHead className="text-right">Selling (₹)</TableHead>
                <TableHead>Status</TableHead>

              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.map((batch: any) => {
                const status = getExpiryStatus(batch.expiryDate)

                return (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <div className="font-medium">{batch.medicine?.name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground">
                        {batch.medicine?.type} • {batch.medicine?.strength}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{batch.batchNumber || "N/A"}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {format(new Date(batch.expiryDate), "MMM yyyy")}
                        {status.label === "Expired" && (
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {batch.supplier?.name || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {(() => {
                        const mps = batch.medicinesPerStrip || 1
                        if (mps <= 1) return batch.quantity
                        const strips = Math.floor(batch.quantity / mps)
                        const loose = batch.quantity % mps
                        return (
                          <span title={`${batch.quantity} units total`}>
                            {strips} str{loose > 0 ? <span className="text-muted-foreground font-normal"> + {loose}</span> : ""}
                          </span>
                        )
                      })()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(batch.purchasePrice)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(batch.sellingPrice)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className={status.class}>
                        {status.label}
                      </Badge>
                    </TableCell>

                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

    </div>
  )
}

