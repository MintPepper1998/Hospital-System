import { requireAuth } from "@/lib/auth-guard"
import { getInsuranceProviders, getInsuranceProviderStats } from "@/app/actions/insurance-providers"
import { InsuranceProvidersClient } from "@/components/admin/insurance-providers-client"

export default async function InsuranceProvidersPage() {
  await requireAuth(["SUPER_ADMIN"])

  const [providers, stats] = await Promise.all([
    getInsuranceProviders(),
    getInsuranceProviderStats(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Insurance Providers</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage insurance companies, TPAs, and government schemes
        </p>
      </div>

      <InsuranceProvidersClient
        initialProviders={JSON.parse(JSON.stringify(providers))}
        initialStats={stats}
      />
    </div>
  )
}
