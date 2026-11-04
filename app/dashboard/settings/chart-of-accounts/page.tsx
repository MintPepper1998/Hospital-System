import { requireAuth } from "@/lib/auth-guard"
import { getAccountGroups } from "@/app/actions/account-groups"
import { AccountGroupsClient } from "./account-groups-client"

export default async function ChartOfAccountsPage() {
    await requireAuth(["SUPER_ADMIN"])

    const result = await getAccountGroups()
    const groups = result.success ? result.data : []

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6 min-h-screen bg-gray-50">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
                <p className="text-gray-500 text-sm mt-1">
                    Manage account groups used for P&L and Balance Sheet classification
                </p>
            </div>

            <AccountGroupsClient groups={groups} />
        </div>
    )
}
