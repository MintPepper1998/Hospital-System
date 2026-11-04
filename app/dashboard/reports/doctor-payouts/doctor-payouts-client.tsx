"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarIcon, Printer, Download } from "lucide-react"
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DoctorPayoutsClientProps {
    initialFrom: Date
    initialTo: Date
    doctors: Array<{ id: string; name: string }>
    selectedDoctorId?: string
}

export function DoctorPayoutsClient({ initialFrom, initialTo, doctors, selectedDoctorId }: DoctorPayoutsClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const [fromDate, setFromDate] = useState<Date>(initialFrom)
    const [toDate, setToDate] = useState<Date>(initialTo)
    const [doctorId, setDoctorId] = useState<string>(selectedDoctorId || "")

    const handleUpdateRange = () => {
        if (!fromDate || !toDate) return

        const params = new URLSearchParams(searchParams)
        params.set("from", format(fromDate, "yyyy-MM-dd"))
        params.set("to", format(toDate, "yyyy-MM-dd"))
        if (doctorId) {
            params.set("doctor", doctorId)
        } else {
            params.delete("doctor")
        }
        router.push(`?${params.toString()}`)
    }

    const handlePrint = () => {
        window.print()
    }

    const handleExport = () => {
        const params = new URLSearchParams(searchParams)
        params.set("from", format(fromDate, "yyyy-MM-dd"))
        params.set("to", format(toDate, "yyyy-MM-dd"))
        if (doctorId) params.set("doctor", doctorId)
        params.set("export", "csv")
        window.open(`/api/reports/doctor-payouts?${params.toString()}`, "_blank")
    }

    return (
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 print:hidden">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Doctor Payouts</h1>
                <p className="text-sm text-slate-500 mt-1">Consultation & Surgical Revenue per Doctor</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                {/* Doctor Filter */}
                <select
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-[180px]"
                >
                    <option value="">All Doctors</option>
                    {doctors.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                            Dr. {doc.name}
                        </option>
                    ))}
                </select>

                {/* From Date */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500">From</span>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[140px] justify-start text-left font-medium bg-white border-slate-200",
                                    !fromDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                                {fromDate ? format(fromDate, "MMM d, yyyy") : <span>Pick date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={fromDate}
                                onSelect={(d) => d && setFromDate(d)}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* To Date */}
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-500">To</span>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[140px] justify-start text-left font-medium bg-white border-slate-200",
                                    !toDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-slate-500" />
                                {toDate ? format(toDate, "MMM d, yyyy") : <span>Pick date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="single"
                                selected={toDate}
                                onSelect={(d) => d && setToDate(d)}
                                initialFocus
                                disabled={(date) => date < fromDate}
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <Button onClick={handleUpdateRange} className="w-full sm:w-auto bg-slate-800 hover:bg-slate-900 text-white">
                    Apply Filter
                </Button>

                <div className="h-6 w-px bg-slate-200 hidden sm:block mx-1"></div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button variant="outline" className="bg-white flex-1 sm:flex-none" onClick={handlePrint}>
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex-1 sm:flex-none" onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>
        </div>
    )
}
