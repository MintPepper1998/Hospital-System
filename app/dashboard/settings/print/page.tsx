import { getPrintSettings } from "@/app/actions/print-settings"
import { getHospitalSettings } from "@/app/actions/settings"
import { getAllTemplateSettings } from "@/app/actions/print-template-settings"
import { PrintSettingsClient } from "./components/print-settings-client"
import { requireAuth } from "@/lib/auth-guard"

export const metadata = {
  title: "Print Settings | Admin",
}

export default async function PrintSettingsPage() {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT"])
  
  const [settings, hospitalSettings, templateSettings, doctors] = await Promise.all([
    getPrintSettings(),
    getHospitalSettings(),
    getAllTemplateSettings(),
    import("@/lib/prisma").then(m => m.prisma.staff.findMany({
      where: { user: { role: "DOCTOR" } },
      include: { user: true }
    }))
  ])

  return (
    <div className="h-[calc(100vh-4rem)] w-full">
      <PrintSettingsClient 
        initialData={settings} 
        hospitalSettings={hospitalSettings} 
        templateSettings={templateSettings}
        doctors={doctors}
      />
    </div>
  )
}
