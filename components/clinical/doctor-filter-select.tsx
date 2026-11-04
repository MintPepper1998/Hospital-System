"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Users } from "lucide-react"

interface DoctorOption {
  id: string
  name: string
  department: string | null
  specialization: string | null
}

interface DoctorFilterSelectProps {
  doctors: DoctorOption[]
  currentDoctorId: string
  label?: string
}

export function DoctorFilterSelect({ doctors, currentDoctorId, label }: DoctorFilterSelectProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    const value = e.target.value
    if (value) {
      params.set("doctor", value)
    } else {
      params.delete("doctor")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-[#0066CC] flex-shrink-0" />
      <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        {label || "Doctor:"}
      </label>
      <select
        value={currentDoctorId}
        onChange={handleChange}
        className="h-9 rounded-md border bg-background px-3 text-sm font-medium focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all min-w-[200px]"
      >
        <option value="">All Doctors</option>
        {doctors.map((doc) => (
          <option key={doc.id} value={doc.id}>
            Dr. {doc.name} — {doc.department || "General"}
            {doc.specialization ? ` (${doc.specialization})` : ""}
          </option>
        ))}
      </select>
    </div>
  )
}
