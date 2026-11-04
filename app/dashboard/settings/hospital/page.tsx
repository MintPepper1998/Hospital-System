import { getHospitalSettings } from "@/app/actions/settings"
import { HospitalSettingsForm } from "@/components/settings/hospital-settings-form"

export default async function HospitalSettingsPage() {
  const settings = await getHospitalSettings()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Hospital Settings & Branding
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure hospital details, logo, and print letterhead images
        </p>
      </div>
      <HospitalSettingsForm initialData={settings} />
    </div>
  )
}
