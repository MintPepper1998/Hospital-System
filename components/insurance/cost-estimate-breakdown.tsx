"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, IndianRupee, TrendingDown } from "lucide-react"

interface CostEstimateBreakdownProps {
  data: {
    sumInsured: number
    balanceAvailable: number
    estimatedTotalCost: number
    estimatedInsuranceCoverage: number
    estimatedOutOfPocket: number
    lineItems: Array<{
      service: string
      category: string
      hospitalRate: number
      quantity: number
      totalCost: number
      amountCovered: number
      patientPays: number
      subLimitApplied: string | null
    }>
    deductions: {
      copayAmount: number
      copayPercentage: number
      deductibleAmount: number
      roomRentExcess: number
      roomRentProportionalImpact: number
      nonAdmissibleEstimate: number
      totalDeductions: number
    }
    warnings: string[]
  }
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount)
}

export function CostEstimateBreakdown({ data }: CostEstimateBreakdownProps) {
  const coveragePercent = data.estimatedTotalCost > 0
    ? (data.estimatedInsuranceCoverage / data.estimatedTotalCost) * 100
    : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-blue-600 font-medium">Estimated Total Cost</p>
            <p className="text-2xl font-bold text-blue-800 mt-1">{formatCurrency(data.estimatedTotalCost)}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-green-600 font-medium flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3" /> Insurance Covers
            </p>
            <p className="text-2xl font-bold text-green-800 mt-1">{formatCurrency(data.estimatedInsuranceCoverage)}</p>
            <p className="text-xs text-green-600">({coveragePercent.toFixed(1)}% of total)</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-red-600 font-medium flex items-center justify-center gap-1">
              <IndianRupee className="h-3 w-3" /> You Pay (Estimated)
            </p>
            <p className="text-2xl font-bold text-red-800 mt-1">{formatCurrency(data.estimatedOutOfPocket)}</p>
          </CardContent>
        </Card>
      </div>

      {data.warnings.length > 0 && (
        <div className="space-y-2">
          {data.warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {data.lineItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Detailed Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Service</th>
                    <th className="pb-2 font-medium text-right">Rate</th>
                    <th className="pb-2 font-medium text-right">Qty</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium text-right">Covered</th>
                    <th className="pb-2 font-medium text-right">You Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lineItems.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2">
                        <p>{item.service}</p>
                        {item.subLimitApplied && (
                          <p className="text-xs text-amber-600">{item.subLimitApplied}</p>
                        )}
                      </td>
                      <td className="py-2 text-right">{formatCurrency(item.hospitalRate)}</td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{formatCurrency(item.totalCost)}</td>
                      <td className="py-2 text-right text-green-700">{formatCurrency(item.amountCovered)}</td>
                      <td className="py-2 text-right text-red-700">{formatCurrency(item.patientPays)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {data.deductions.totalDeductions > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-amber-600" />
              Deductions Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {data.deductions.copayAmount > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs">Co-pay ({data.deductions.copayPercentage}%)</p>
                  <p className="font-medium text-amber-700">{formatCurrency(data.deductions.copayAmount)}</p>
                </div>
              )}
              {data.deductions.deductibleAmount > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs">Deductible</p>
                  <p className="font-medium text-amber-700">{formatCurrency(data.deductions.deductibleAmount)}</p>
                </div>
              )}
              {data.deductions.roomRentProportionalImpact > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs">Room Rent Proportional Deduction</p>
                  <p className="font-medium text-amber-700">{formatCurrency(data.deductions.roomRentProportionalImpact)}</p>
                </div>
              )}
              <div className="col-span-full border-t pt-2">
                <div className="flex justify-between">
                  <p className="font-semibold">Total Deductions</p>
                  <p className="font-bold text-amber-700">{formatCurrency(data.deductions.totalDeductions)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
