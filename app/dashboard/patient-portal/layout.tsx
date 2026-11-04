import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import PatientSidebar from "@/components/dashboard/patient-ui/sidebar"
import PatientHeader from "@/components/dashboard/patient-ui/header"

export default async function PatientPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/patient-login")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })

  if (!user || user.role !== "PATIENT") {
    redirect("/dashboard")
  }

  // Fetch active receptionist for the sidebar contact card
  const activeReceptionist = await prisma.staff.findFirst({
    where: {
      user: { role: "RECEPTIONIST", isActive: true },
      isOnLeave: false,
    },
    include: { user: true }
  })

  const receptionistData = activeReceptionist ? {
    name: activeReceptionist.user?.name || "Hospital Reception",
    phone: activeReceptionist.phone || "+91 0000000000",
    image: activeReceptionist.user?.image || null
  } : null

  return (
    <div className="min-h-[100dvh] w-full bg-[#f4f5f7] lg:p-4 xl:p-6 font-sans">
      {/* Outer App Shell — full-screen on mobile, rounded on desktop */}
      <div className="flex w-full min-h-[100dvh] lg:min-h-0 lg:h-[calc(100dvh-2rem)] xl:h-[calc(100dvh-3rem)] bg-white lg:rounded-[40px] lg:shadow-2xl lg:border lg:border-gray-100 overflow-hidden">
        
        <PatientSidebar receptionist={receptionistData} />
        
        <div className="flex-1 flex flex-col min-h-0 bg-[#f5f6f8] lg:rounded-r-[40px] overflow-hidden relative lg:border-l lg:border-gray-100">
          <PatientHeader user={{ id: user.id, name: user.name || "", email: user.email, image: user.image }} />
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 pt-2 sm:pt-4 scrollbar-hide">
            {children}
          </main>
        </div>

      </div>
    </div>
  )
}
