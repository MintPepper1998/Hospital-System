"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Printer, FileSpreadsheet, FileJson } from "lucide-react"
import { Button } from "@/components/ui/button"

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

interface Gstr1aClientProps {
    initialMonth: number
    initialYear: number
}

export function Gstr1aClient({ initialMonth, initialYear }: Gstr1aClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [month, setMonth] = useState(initialMonth)
    const [year, setYear] = useState(initialYear)

    const handleApply = () => {
        const params = new URLSearchParams(searchParams)
        params.set("month", String(month))
        params.set("year", String(year))
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 print:hidden">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">GSTR-1A — Amendment Statement</h1>
                <p className="text-sm text-slate-500 mt-1">Amend, add, or correct GSTR-1 entries before filing GSTR-3B</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-[150px]"
                >
                    {MONTHS.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                    ))}
                </select>

                <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-[100px]"
                >
                    {Array.from({ length: 5 }, (_, i) => initialYear - 2 + i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                <Button onClick={handleApply} className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white">
                    Apply
                </Button>

                <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1" />

                <Button variant="outline" className="bg-white" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-2" />
                    Print
                </Button>

                <Button
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                    onClick={() => window.open(`/api/reports/gstr-1a?month=${month}&year=${year}&format=excel`, "_blank")}
                >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Excel
                </Button>

                <Button
                    variant="outline"
                    className="bg-white border-orange-200 text-orange-700 hover:bg-orange-50"
                    onClick={() => window.open(`/api/reports/gstr-1a?month=${month}&year=${year}&format=json`, "_blank")}
                >
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON
                </Button>
            </div>
        </div>
    )
}
