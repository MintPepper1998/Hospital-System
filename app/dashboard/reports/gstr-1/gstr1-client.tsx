"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Printer, FileSpreadsheet, FileJson, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Gstr1ClientProps {
    initialMonth: number
    initialYear: number
}

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

export function Gstr1Client({ initialMonth, initialYear }: Gstr1ClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [month, setMonth] = useState(initialMonth)
    const [year, setYear] = useState(initialYear)

    // Download toggle states
    const [excelOn, setExcelOn] = useState(false)
    const [jsonOn, setJsonOn] = useState(false)
    const [hsnOn, setHsnOn] = useState(false)

    const handleApply = () => {
        const params = new URLSearchParams(searchParams)
        params.set("month", String(month))
        params.set("year", String(year))
        router.push(`?${params.toString()}`)
    }

    const handlePrint = () => window.print()

    const buildUrl = (fmt: string) =>
        `/api/reports/gstr-1?month=${month}&year=${year}&format=${fmt}`

    const handleDownload = () => {
        if (excelOn) window.open(buildUrl("excel"), "_blank")
        if (jsonOn) window.open(buildUrl("json"), "_blank")
        if (hsnOn) window.open(buildUrl("hsn"), "_blank")
    }

    const anyToggled = excelOn || jsonOn || hsnOn

    return (
        <div className="print:hidden space-y-5">
            {/* Header + Period Selector */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">GSTR-1 — Outward Supplies</h1>
                    <p className="text-sm text-slate-500 mt-1">Pharmacy sales return for GST portal filing</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                    {/* Month selector */}
                    <select
                        value={month}
                        onChange={(e) => setMonth(Number(e.target.value))}
                        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-[150px]"
                    >
                        {MONTHS.map((m, i) => (
                            <option key={i} value={i + 1}>{m}</option>
                        ))}
                    </select>

                    {/* Year selector */}
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-[100px]"
                    >
                        {Array.from({ length: 5 }, (_, i) => initialYear - 2 + i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <Button onClick={handleApply} className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white">
                        Apply
                    </Button>

                    <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />

                    <Button variant="outline" className="bg-white" onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                    </Button>
                </div>
            </div>

            {/* ── Download Switches ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-800">Export Options</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Toggle the formats you need, then click Download</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-6">
                        {/* Excel Switch */}
                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={excelOn}
                                    onChange={(e) => setExcelOn(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-emerald-500 transition-colors" />
                                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                                <span className="text-sm font-medium text-slate-700">Excel (.xlsx)</span>
                            </div>
                        </label>

                        {/* JSON Switch */}
                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={jsonOn}
                                    onChange={(e) => setJsonOn(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-blue-500 transition-colors" />
                                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <FileJson className="w-4 h-4 text-blue-600" />
                                <span className="text-sm font-medium text-slate-700">GST Portal JSON</span>
                            </div>
                        </label>

                        {/* HSN Switch */}
                        <label className="flex items-center gap-3 cursor-pointer select-none group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={hsnOn}
                                    onChange={(e) => setHsnOn(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-10 h-5 bg-slate-200 rounded-full peer-checked:bg-amber-500 transition-colors" />
                                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-medium text-slate-700">HSN Summary (.xlsx)</span>
                            </div>
                        </label>

                        {/* Download Button */}
                        <Button
                            onClick={handleDownload}
                            disabled={!anyToggled}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Download Selected
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
