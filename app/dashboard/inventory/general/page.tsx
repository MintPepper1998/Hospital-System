import { getGeneralItems, getDepartments, getInventoryStats } from "@/app/actions/general-inventory"
import { GeneralInventoryClient } from "@/components/inventory/general-inventory-client"

export default async function GeneralInventoryPage() {
  const [itemsResult, departments, stats] = await Promise.all([
    getGeneralItems(),
    getDepartments(),
    getInventoryStats(),
  ])

  return (
    <div className="space-y-6">
      <GeneralInventoryClient items={itemsResult.data} departments={departments} stats={stats} />
    </div>
  )
}
