"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { OTSchedulingWizard } from "./ot-scheduling-wizard"
import { OTProfileView } from "./ot-profile-view"
import { ArrowLeft } from "lucide-react"

export function OTScheduleClient({
  initialPatient,
  initialSurgery,
  schedulingData
}: {
  initialPatient: any
  initialSurgery: any
  schedulingData: any
}) {
  const router = useRouter()
  const [surgery, setSurgery] = useState(initialSurgery)
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-700 pb-20">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-black hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            {surgery ? "Operation Profile" : "Schedule Operation"}
          </h1>
          <p className="text-sm font-medium text-gray-500 mt-1">
            {initialPatient ? `For Patient: ${initialPatient.user.name}` : "Select a patient to continue"}
          </p>
        </div>
      </div>

      {!surgery || isEditing ? (
        <OTSchedulingWizard 
          patient={initialPatient}
          schedulingData={schedulingData}
          initialSurgery={isEditing ? surgery : undefined}
          onScheduled={(newSurgeryId) => {
            if (isEditing) {
              setIsEditing(false)
              // We could fetch the updated surgery here, but for now we'll just reload the page to get fresh data
              router.refresh()
            } else if (initialPatient?.ipdAdmissions?.[0]?.id) {
              router.push(`/dashboard/ipd/patient/${initialPatient.ipdAdmissions[0].id}`)
            } else {
              router.back()
            }
          }}
        />
      ) : (
        <OTProfileView 
          surgery={surgery}
          schedulingData={schedulingData}
          onUpdate={(updatedSurgery) => setSurgery(updatedSurgery)}
          onEdit={() => setIsEditing(true)}
        />
      )}

    </div>
  )
}
