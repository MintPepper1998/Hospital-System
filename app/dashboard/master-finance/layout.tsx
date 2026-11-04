import { MasterFinanceSidebar } from "./master-finance-sidebar"

export default function MasterFinanceLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
            <MasterFinanceSidebar />
            <div className="flex-1 overflow-y-auto bg-gray-50">
                {children}
            </div>
        </div>
    )
}
