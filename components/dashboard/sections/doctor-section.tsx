import { getCachedDoctorDashboardData } from "@/lib/data/dashboard-cache"
import { LazyDoctorView } from "@/components/dashboard/lazy-role-views"

interface DoctorSectionProps {
  staffId: string
  doctorName: string
  specialization: string | null
}

export async function DoctorSection({ staffId, doctorName, specialization }: DoctorSectionProps) {
  const docData = await getCachedDoctorDashboardData(staffId)

  return (
    <LazyDoctorView
      doctorName={doctorName}
      specialization={specialization}
      stats={docData.stats}
      todayOPD={docData.todayOPD}
      myIPD={docData.myIPD}
    />
  )
}
