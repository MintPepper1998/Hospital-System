import React from "react"
import { OTScheduleClient } from "@/components/ot/ot-schedule-client"
import { getPatientForOT, getSurgeryDetails, fetchSchedulingData } from "@/app/actions/ot-schedule"
import { redirect } from "next/navigation"

export default async function OTSchedulePage(props: {
  searchParams: Promise<{ patientId?: string; surgeryId?: string }>
}) {
  const searchParams = await props.searchParams;
  let initialPatient = null
  let initialSurgery = null
  const schedulingData = await fetchSchedulingData()

  if (searchParams.surgeryId) {
    const res = await getSurgeryDetails(searchParams.surgeryId)
    if (res.success && res.surgery) {
      initialSurgery = res.surgery
      initialPatient = res.surgery.patient
    }
  } else if (searchParams.patientId) {
    const res = await getPatientForOT(searchParams.patientId)
    if (res.success && res.patient) {
      initialPatient = res.patient
    }
  } else {
    // If neither is provided, ideally redirect to a patient search or OT list
    // but for now we render an empty state or allow searching within the client
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col p-4 md:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        <OTScheduleClient 
          initialPatient={initialPatient}
          initialSurgery={initialSurgery}
          schedulingData={schedulingData}
        />
      </div>
    </div>
  )
}
