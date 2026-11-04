"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  FlaskConical, CheckCircle, Clock, AlertTriangle, FileText, Microscope,
  Radiation
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export interface LabResultItem {
  id: string
  testName: string
  resultValue: string
  unit: string | null
  normalRange: string | null
  remarks: string | null
}

export interface LabRequestWithResults {
  id: string
  testName: string
  testType: "PATHOLOGY" | "RADIOLOGY"
  status: string
  priority: string
  reportContent: string | null
  impression: string | null
  parameterResults: Record<string, string> | null
  completedAt: string | null
  createdAt: string
  results: LabResultItem[]
}

interface LabResultsViewerProps {
  labResults: LabRequestWithResults[]
}

export function LabResultsViewer({ labResults }: LabResultsViewerProps) {
  if (!labResults || labResults.length === 0) return null

  const completedResults = labResults.filter(r => r.status === "COMPLETED")
  const pendingResults = labResults.filter(r => r.status !== "COMPLETED")

  return (
    <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-emerald-800">
            <FlaskConical className="h-5 w-5 text-emerald-600" />
            Lab Test Results
            {completedResults.length > 0 && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px] font-bold ml-2">
                {completedResults.length} READY
              </Badge>
            )}
          </CardTitle>
          {pendingResults.length > 0 && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-[10px]">
              <Clock className="h-3 w-3 mr-1" />
              {pendingResults.length} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Completed Results */}
        {completedResults.map((req) => (
          <div
            key={req.id}
            className="rounded-xl border border-emerald-200 bg-white overflow-hidden"
          >
            {/* Test Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50/60 border-b border-emerald-100">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                  req.testType === "PATHOLOGY"
                    ? "bg-blue-100 text-blue-600"
                    : "bg-purple-100 text-purple-600"
                }`}>
                  {req.testType === "PATHOLOGY" 
                    ? <Microscope className="h-4 w-4" /> 
                    : <Radiation className="h-4 w-4" />
                  }
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{req.testName}</h4>
                  <p className="text-[11px] text-slate-500">
                    {req.testType} • Completed {req.completedAt ? new Date(req.completedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            </div>

            {/* Parameter Results Table */}
            {req.results.length > 0 && (
              <div className="px-4 py-3">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Parameter</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Result</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unit</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Normal Range</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {req.results.map((result) => {
                      // Simple abnormal check
                      const isAbnormal = result.remarks?.toLowerCase().includes("abnormal") ||
                        result.remarks?.toLowerCase().includes("high") ||
                        result.remarks?.toLowerCase().includes("low") ||
                        result.remarks?.toLowerCase().includes("critical")
                      return (
                        <TableRow key={result.id} className={isAbnormal ? "bg-red-50/50" : ""}>
                          <TableCell className="text-sm font-medium text-slate-700">
                            {result.testName}
                          </TableCell>
                          <TableCell className={`text-sm font-bold ${isAbnormal ? "text-red-600" : "text-slate-900"}`}>
                            {result.resultValue}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {result.unit || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {result.normalRange || "—"}
                          </TableCell>
                          <TableCell>
                            {result.remarks ? (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                isAbnormal
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}>
                                {result.remarks}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Structured parameter results (JSON) */}
            {req.parameterResults && Object.keys(req.parameterResults).length > 0 && req.results.length === 0 && (
              <div className="px-4 py-3">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Parameter</TableHead>
                      <TableHead className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(req.parameterResults).map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="text-sm font-medium text-slate-700">{key}</TableCell>
                        <TableCell className="text-sm font-bold text-slate-900">{value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Report Content / Impression */}
            {(req.reportContent || req.impression) && (
              <div className="px-4 py-3 border-t border-emerald-100 space-y-2">
                {req.reportContent && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Findings</p>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">
                      {req.reportContent}
                    </p>
                  </div>
                )}
                {req.impression && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Impression</p>
                    <p className="text-sm font-medium text-slate-800 bg-amber-50 rounded-lg p-3 border border-amber-100 whitespace-pre-wrap">
                      {req.impression}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Pending Tests */}
        {pendingResults.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-amber-600" />
              <h4 className="text-sm font-bold text-amber-800">Pending Results</h4>
            </div>
            <div className="space-y-2">
              {pendingResults.map((req) => (
                <div key={req.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-amber-100">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      req.testType === "PATHOLOGY"
                        ? "bg-blue-50 text-blue-500"
                        : "bg-purple-50 text-purple-500"
                    }`}>
                      {req.testType === "PATHOLOGY"
                        ? <Microscope className="h-3.5 w-3.5" />
                        : <Radiation className="h-3.5 w-3.5" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">{req.testName}</p>
                      <p className="text-[11px] text-slate-400">{req.testType} • {req.priority}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px]">
                    {req.status === "PENDING_PAYMENT" ? "Pending Payment" 
                      : req.status === "PAID_PENDING_SAMPLE" ? "Awaiting Sample" 
                      : req.status === "SAMPLE_COLLECTED" ? "Processing" 
                      : req.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
