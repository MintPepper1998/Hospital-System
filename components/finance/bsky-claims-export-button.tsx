"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface ExportClaimRow {
  billDate: string
  patientName: string
  billNumber: string
  id: string
  claimStatusLabel: string
  pendingAmount: number
  totalBilledAmount: number
  status: "PENDING" | "PAID"
}

interface BskyClaimsExportButtonProps {
  claims: ExportClaimRow[]
}

function formatDateDDMMYYYY(dateInput: string): string {
  const d = new Date(dateInput)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}-${month}-${year}`
}

function escapeCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, "\"\"")}"`
  }
  return value
}

export function BskyClaimsExportButton({ claims }: BskyClaimsExportButtonProps) {
  const handleExportCSV = () => {
    const headers = ["Date", "Patient Name", "Bill ID / IPD No.", "Claim Status", "Amount (INR)"]

    const rows = claims.map((claim) => {
      const amount = claim.status === "PENDING" ? claim.pendingAmount : claim.totalBilledAmount
      return [
        formatDateDDMMYYYY(claim.billDate),
        claim.patientName,
        `${claim.billNumber} (${claim.id.slice(-8)})`,
        claim.claimStatusLabel,
        amount.toFixed(2),
      ]
    })

    const csvString = [
      headers.map(escapeCsvValue).join(","),
      ...rows.map((row) => row.map((cell) => escapeCsvValue(String(cell))).join(",")),
    ].join("\n")

    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, "0")
    const d = String(today.getDate()).padStart(2, "0")
    link.href = url
    link.setAttribute("download", `BSKY_Claims_Report_${y}-${m}-${d}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={claims.length === 0}>
      <Download className="h-4 w-4 mr-1.5" />
      Export to CSV
    </Button>
  )
}
