import { getEquipmentItems, getEquipmentStats } from "@/app/actions/ipd-equipment"
import { IPDEquipmentClient } from "@/components/admin/ipd-equipment-client"

export default async function IPDEquipmentPage() {
  const [itemsResult, statsResult] = await Promise.all([
    getEquipmentItems(),
    getEquipmentStats(),
  ])

  const items = itemsResult.success ? itemsResult.data : []
  const stats = statsResult.success ? statsResult.data : { total: 0, active: 0, inactive: 0, categories: 0 }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-teal-700">IPD Equipment & Supplies</h2>
        <p className="text-muted-foreground">Manage rentable equipment items and their hourly/daily pricing</p>
      </div>
      <IPDEquipmentClient items={items as any[]} stats={stats as any} />
    </div>
  )
}
