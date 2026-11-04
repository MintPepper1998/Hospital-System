import { BarChart3 } from "lucide-react"

export default function ReportsIndexPage() {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center bg-white rounded-xl border border-slate-200 shadow-sm p-12 min-h-[60vh]">
            <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <BarChart3 className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-3 tracking-tight">Hospital Analytics & Reports</h1>
            <p className="text-slate-500 max-w-md text-lg">
                Select a report from the sidebar to view data.
            </p>
        </div>
    )
}
