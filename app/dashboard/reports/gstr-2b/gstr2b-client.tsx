"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Printer, FileSpreadsheet } from "lucide-react"
import { Button } from "@/components/ui/button"

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

interface Gstr2bClientProps {
    initialMonth: number
    initialYear: number
}

export function Gstr2bClient({ initialMonth, initialYear }: Gstr2bClientProps) {
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

    const handleExport = () => {
        window.open(`/api/reports/gstr-2b?month=${month}&year=${year}&format=excel`, "_blank")
    }

    return (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 print:hidden">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">GSTR-2B — Input Tax Credit Statement</h1>
                <p className="text-sm text-slate-500 mt-1">Auto-drafted ITC available based on supplier purchase invoices</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                <select
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-[150px]"
                >
                    {MONTHS.map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                    ))}
                </select>

                <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 w-full sm:w-[100px]"
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
                <Button className="bg-violet-600 hover:bg-violet-700 text-white" onClick={handleExport}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export
                </Button>
            </div>
        </div>
    )
}
