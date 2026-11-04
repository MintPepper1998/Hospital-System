import { Suspense } from "react"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { format } from "date-fns"

import { AdminStatsSection } from "@/components/dashboard/sections/admin-stats-section"
import { RevenueSection } from "@/components/dashboard/sections/revenue-section"
import { AvailabilitySection } from "@/components/dashboard/sections/availability-section"
import { SpecializationSection } from "@/components/dashboard/sections/specialization-section"
import { VisitsSection } from "@/components/dashboard/sections/visits-section"
import { SidebarSection } from "@/components/dashboard/sections/sidebar-section"
import { DoctorSection } from "@/components/dashboard/sections/doctor-section"
import { NurseSection } from "@/components/dashboard/sections/nurse-section"
import { OnlineBookingsDashboardSection } from "@/components/dashboard/sections/online-bookings-dashboard-section"
import {
  StatsCardsSkeleton,
  RevenueChartSkeleton,
  AvailabilitySkeleton,
  SpecializationChartSkeleton,
  VisitsCardSkeleton,
  TableCardSkeleton,
  CalendarSkeleton,
  NurseDashboardSkeleton,
  OnlineBookingsSkeleton,
} from "@/components/dashboard/dashboard-skeletons"

export default async function DashboardPage() {
  const session = await auth()
  
  if (!session?.user?.email) {
    redirect("/login")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { staff: true },
  })

  if (!user) {
    redirect("/login")
  }

  switch (user.role) {
    case "PHARMACIST":
      redirect("/dashboard/pharmacy")
    case "RECEPTIONIST":
      redirect("/dashboard/reception")
    case "PATIENT":
      redirect("/dashboard/patient-portal")
    case "ACCOUNTANT":
      redirect("/dashboard/finance/billing")
    case "LAB_TECHNICIAN":
      redirect("/dashboard/lab/queue")
    case "CANTEEN_STAFF":
      redirect("/dashboard/canteen")
    case "AMBULANCE_DRIVER":
      redirect("/dashboard/ambulance")
  }

  if (user.role === "DOCTOR" && user.staff) {
    redirect("/dashboard/doctor")
  }

  if (user.role === "NURSE") {
    return (
      <Suspense fallback={<NurseDashboardSkeleton />}>
        <NurseSection userName={user.name || "Nurse"} />
      </Suspense>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base md:text-lg font-semibold text-gray-900">Dashboard</h2>
        <p className="text-xs text-gray-500">{format(new Date(), "EEEE, MMM d, yyyy")}</p>
      </div>

      {/* Top Row: Financial Stats */}
      <Suspense fallback={<StatsCardsSkeleton />}>
        <AdminStatsSection />
      </Suspense>

      {/* Online Booking Requests */}
      <Suspense fallback={<OnlineBookingsSkeleton />}>
        <OnlineBookingsDashboardSection />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Column (Span 8) */}
        <div className="col-span-1 xl:col-span-8 space-y-4">
          <Suspense fallback={<RevenueChartSkeleton />}>
            <RevenueSection />
          </Suspense>

          <Suspense fallback={
            <div className="flex flex-col space-y-4 pt-4">
              <VisitsCardSkeleton />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TableCardSkeleton rows={3} />
                <TableCardSkeleton rows={4} />
              </div>
            </div>
          }>
            <VisitsSection />
          </Suspense>
        </div>

        {/* Right Column (Span 4) */}
        <div className="col-span-1 xl:col-span-4 space-y-4">
          <Suspense fallback={<AvailabilitySkeleton />}>
            <AvailabilitySection />
          </Suspense>

          <Suspense fallback={<SpecializationChartSkeleton />}>
            <SpecializationSection />
          </Suspense>

          <Suspense fallback={
            <div className="flex flex-col space-y-4 pt-4">
              <TableCardSkeleton rows={3} />
              <CalendarSkeleton />
            </div>
          }>
            <SidebarSection />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
