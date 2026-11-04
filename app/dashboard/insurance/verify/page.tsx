import { InsuranceVerifyClient } from "@/components/insurance/insurance-verify-client"
import { getActiveInsurers, getActiveTpas } from "@/app/actions/insurance-providers"

export default async function InsuranceVerifyPage() {
  const [insurers, tpas] = await Promise.all([
    getActiveInsurers(),
    getActiveTpas(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-[#0066CC]">Insurance Verification & Registration</h2>
        <p className="text-muted-foreground mt-1">Verify insurance before patient registration</p>
      </div>
      <InsuranceVerifyClient
        insurers={JSON.parse(JSON.stringify(insurers))}
        tpas={JSON.parse(JSON.stringify(tpas))}
      />
    </div>
  )
}
