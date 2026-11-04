import { getDischargeTypeConfigs } from "@/app/actions/discharge-types"
import { requireAuth } from "@/lib/auth-guard"
import { DischargeTypesClient } from "@/components/admin/discharge-types-client"

export default async function DischargeTypesAdminPage() {
  await requireAuth(["SUPER_ADMIN"])

  const dischargeTypes = await getDischargeTypeConfigs()

  return (
    <div className="space-y-6">
      <DischargeTypesClient
        dischargeTypes={JSON.parse(JSON.stringify(dischargeTypes))}
      />
    </div>
  )
}
