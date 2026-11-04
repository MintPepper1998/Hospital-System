import { ReactNode } from "react"
import { ReportsSidebar } from "./reports-sidebar"

export default function ReportsLayout({ children }: { children: ReactNode }) {
    // Using a full screen height flex container (assuming standard dashboard offsets)
    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-50/50">
            {/* Sidebar Navigation */}
            <ReportsSidebar />

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                <div className="max-w-7xl mx-auto h-full min-h-[500px]">
                    {children}
                </div>
            </div>
        </div>
    )
}
