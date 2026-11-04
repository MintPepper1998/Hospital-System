"use client"

import { usePathname } from "next/navigation"
import {
  StatsCardsSkeleton,
  RevenueChartSkeleton,
  AvailabilitySkeleton,
  SpecializationChartSkeleton,
  VisitsCardSkeleton,
  TableCardSkeleton,
  CalendarSkeleton,
  OnlineBookingsSkeleton,
} from "@/components/dashboard/dashboard-skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  const pathname = usePathname()

  // Prevent admin dashboard skeleton from showing on patient portal pages
  // because patient portal has its own layout and loading skeleton
  if (pathname?.includes("/patient-portal")) {
    return null
  }

  return (
    <div className="space-y-4">
      <div>
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-3 w-40 mt-1" />
      </div>

      {/* Top Row: Financial Stats (4 colorful cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {/* Indigo card */}
        <Skeleton className="h-[88px] rounded-2xl bg-indigo-200/40" />
        {/* Orange card */}
        <Skeleton className="h-[88px] rounded-2xl bg-amber-200/40" />
        {/* Green card */}
        <Skeleton className="h-[88px] rounded-2xl bg-emerald-200/40" />
        {/* White card */}
        <Skeleton className="h-[88px] rounded-2xl" />
      </div>

      {/* Online Booking Requests */}
      <OnlineBookingsSkeleton />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left Column (Span 8) */}
        <div className="col-span-1 xl:col-span-8 space-y-4">
          <RevenueChartSkeleton />
          <VisitsCardSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TableCardSkeleton rows={3} />
            <TableCardSkeleton rows={4} />
          </div>
        </div>

        {/* Right Column (Span 4) */}
        <div className="col-span-1 xl:col-span-4 space-y-4">
          <AvailabilitySkeleton />
          <SpecializationChartSkeleton />
          <TableCardSkeleton rows={3} />
          <CalendarSkeleton />
        </div>
      </div>
    </div>
  )
}
