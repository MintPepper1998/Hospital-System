import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { MobileSidebar } from "@/components/layout/mobile-sidebar"
import { getSecureUrl } from "@/lib/s3-server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) {
    redirect("/login")
  }

  // ── ON-LEAVE GUARD ──
  // Check if this staff member is currently on leave.
  // SUPER_ADMIN and PATIENT roles are excluded from this restriction.
  if (user.role !== "PATIENT" && user.role !== "SUPER_ADMIN") {
    const staffRecord = await prisma.staff.findFirst({
      where: { userId: user.id },
      select: { isOnLeave: true },
    })
    if (staffRecord?.isOnLeave) {
      redirect("/on-leave")
    }
  }

  if (user.role === "PATIENT") {
    return <>{children}</>
  }

  // Fetch hospital logo from settings
  const hospitalSettings = await prisma.hospitalSettings.findUnique({
    where: { id: 1 },
    select: { logoUrl: true, name: true },
  })

  const hospitalLogoUrl = hospitalSettings?.logoUrl
    ? await getSecureUrl(hospitalSettings.logoUrl)
    : null
  const userImageUrl = user.image ? await getSecureUrl(user.image) : null
  const hospitalName = hospitalSettings?.name || "Hospital"

  return (
    <div className="min-h-screen bg-[#e0e5ec] text-zinc-800 print:bg-white print:min-h-0 print:block">
      {/* Desktop Sidebar - Hidden on mobile/tablet */}
      <div className="hidden xl:block print:hidden">
        <DashboardSidebar 
          userRole={user.role} 
          userName={user.name || "User"}
          userEmail={user.email}
          hospitalLogoUrl={hospitalLogoUrl}
          hospitalName={hospitalName}
          userPermissions={user.permissions}
        />
      </div>
      
      {/* Mobile Sidebar Sheet */}
      <MobileSidebar
        userRole={user.role}
        userName={user.name || "User"}
        userEmail={user.email}
        hospitalLogoUrl={hospitalLogoUrl}
        hospitalName={hospitalName}
        userPermissions={user.permissions}
      />
      
      {/* Main Content Area - Full width on mobile, offset on desktop */}
      <div className="xl:ml-64 print:ml-0 print:w-full print:p-0 print:block">
        {/* Header */}
        <div className="print:hidden">
          <DashboardHeader 
            userName={user.name || "Admin"} 
            userEmail={user.email}
            userRole={user.role}
            userImage={userImageUrl}
          />
        </div>
        
        {/* Page Content - Responsive padding */}
        <main className="p-4 md:p-6 print:p-0 print:m-0 print:block">
          {children}
        </main>
      </div>
    </div>
  )
}
