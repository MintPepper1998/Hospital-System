"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, IndianRupee } from "lucide-react"

interface CoverageSummaryProps {
  data: {
    policyNumber?: string
    schemeType: string
    providerName?: string
    tpaName?: string
    coverageAmount: number
    balanceAvailable: number
    isActive?: boolean
    isExpired?: boolean
    copayPercentage?: number | null
    roomRentCap?: number | null
    deductibleAmount?: number | null
    startDate?: string | Date
    endDate?: string | Date
    verificationStatus?: string
  }
}

function formatCurrency(amount: number) {
  if (isNaN(amount) || amount === undefined || amount === null) amount = 0;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export function CoverageSummaryCard({ data }: CoverageSummaryProps) {
  const coverageAmt = data.coverageAmount || 0;
  const balanceAmt = data.balanceAvailable || 0;
  const utilizationPercent = coverageAmt > 0
    ? ((coverageAmt - balanceAmt) / coverageAmt) * 100
    : 0

  const schemeLabels: Record<string, string> = {
    PRIVATE: "Private Insurance",
    PMJAY: "Ayushman Bharat (PMJAY)",
    BSKY: "BSKY",
    CGHS: "CGHS",
    ECHS: "ECHS",
    SELF_PAY: "Self-Pay",
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            Coverage Summary
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant={data.isActive ? "default" : "destructive"}>
              {data.isActive ? "Active" : data.isExpired ? "Expired" : "Inactive"}
            </Badge>
            <Badge variant="outline">{schemeLabels[data.schemeType] || data.schemeType}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Sum Insured</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(coverageAmt)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Balance Available</p>
            <p className="text-xl font-bold text-green-700">{formatCurrency(balanceAmt)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Utilized</p>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(coverageAmt - balanceAmt)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Utilization</p>
            <p className="text-xl font-bold">{utilizationPercent.toFixed(1)}%</p>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all"
            style={{ width: `${Math.min(100, utilizationPercent)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t">
          {data.providerName && (
            <div>
              <p className="text-xs text-muted-foreground">Insurer</p>
              <p className="text-sm font-medium">{data.providerName}</p>
            </div>
          )}
          {data.tpaName && (
            <div>
              <p className="text-xs text-muted-foreground">TPA</p>
              <p className="text-sm font-medium">{data.tpaName}</p>
            </div>
          )}
          {data.policyNumber && (
            <div>
              <p className="text-xs text-muted-foreground">Policy No.</p>
              <p className="text-sm font-medium">{data.policyNumber}</p>
            </div>
          )}
          {data.endDate && (
            <div>
              <p className="text-xs text-muted-foreground">Valid Until</p>
              <p className="text-sm font-medium">
                {new Date(data.endDate).toLocaleDateString("en-IN")}
              </p>
            </div>
          )}
        </div>

        {((data.copayPercentage && data.copayPercentage > 0) ||
          (data.roomRentCap && data.roomRentCap > 0) ||
          (data.deductibleAmount && data.deductibleAmount > 0)) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {data.copayPercentage && data.copayPercentage > 0 && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Co-pay: {data.copayPercentage}%
              </Badge>
            )}
            {data.roomRentCap && data.roomRentCap > 0 && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Room Cap: {formatCurrency(data.roomRentCap)}/day
              </Badge>
            )}
            {data.deductibleAmount && data.deductibleAmount > 0 && (
              <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Deductible: {formatCurrency(data.deductibleAmount)}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
