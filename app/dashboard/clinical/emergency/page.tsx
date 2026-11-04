import { requireAuthSafe } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { getSecureUrl } from "@/lib/s3-server"
import { EmergencyClient } from "./emergency-client"

export const metadata = {
  title: "Emergency (ER) Dashboard - Shree Kamal Hospital",
}

export default async function EmergencyPage() {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST"])
  if (!authResult.ok) {
    redirect("/login")
  }

  // Fetch active emergency visits
  const rawVisits = await prisma.emergencyVisit.findMany({
    where: {
      status: {
        in: ["TRIAGING", "OBSERVATION", "TREATING"]
      }
    },
    include: {
      patient: {
        include: {
          user: true
        }
      },
      assignedDoctor: {
        include: {
          user: true
        }
      },
      bed: {
        include: {
          ward: true
        }
      }
    },
    orderBy: {
      arrivalTime: "desc"
    }
  })

  // Presign images for ER triage list
  const activeVisits = await Promise.all(
    rawVisits.map(async (visit) => {
      if (visit.patient?.user?.image) {
        return {
          ...visit,
          patient: {
            ...visit.patient,
            user: {
              ...visit.patient.user,
              image: (await getSecureUrl(visit.patient.user.image)) || visit.patient.user.image,
            },
          },
        }
      }
      return visit
    })
  )

  // Fetch doctors for assignment
  const doctors = await prisma.staff.findMany({
    where: {
      user: {
        role: "DOCTOR",
        isActive: true,
      }
    },
    include: {
      user: true
    }
  })

  // Fetch active ER doctor shifts
  const activeShifts = await prisma.eRDoctorShift.findMany({
    where: {
      status: "ON_DUTY"
    },
    include: {
      doctor: {
        include: {
          user: true
        }
      }
    }
  })

  // Fetch ER Wards and Beds
  const erWards = await prisma.ward.findMany({
    where: {
      type: "EMERGENCY",
      isActive: true,
    },
    include: {
      beds: {
        orderBy: {
          bedNumber: "asc"
        }
      }
    }
  })

  // Also fetch IPD Wards for "Admit to IPD"
  const ipdWards = await prisma.ward.findMany({
    where: {
      type: {
        not: "EMERGENCY"
      },
      isActive: true,
    },
    include: {
      beds: {
        where: {
          status: "AVAILABLE"
        },
        orderBy: {
          bedNumber: "asc"
        }
      }
    }
  })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-red-600">Emergency & Casualty</h2>
          <p className="text-muted-foreground text-sm font-semibold">
            Manage ER Triage, Quick Admissions, and Critical Care
          </p>
        </div>
      </div>
      
      <EmergencyClient 
        activeVisits={activeVisits} 
        doctors={doctors} 
        activeShifts={activeShifts}
        erWards={erWards}
        ipdWards={ipdWards}
      />
    </div>
  )
}
