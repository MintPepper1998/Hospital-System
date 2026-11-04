import { Skeleton } from "@/components/ui/skeleton"

export default function PatientPortalLoading() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
      
      {/* Left Column (Anatomy Viewer) — hidden on mobile */}
      <div className="hidden xl:block xl:col-span-4">
        <div className="bg-white rounded-3xl border border-gray-100 p-6 h-full min-h-[520px] flex flex-col items-center justify-center">
          <Skeleton className="w-48 h-48 rounded-full" />
          <Skeleton className="h-4 w-32 mt-6" />
          <Skeleton className="h-3 w-24 mt-2" />
        </div>
      </div>

      {/* Right Content Area */}
      <div className="col-span-1 xl:col-span-8 flex flex-col gap-4 sm:gap-6">
        
        {/* Top Row: Health Chart & Upcoming Appointment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Health Chart Skeleton */}
          <div className="min-h-[240px] sm:min-h-[260px]">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-5 w-32" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-4 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-[140px] w-full rounded-2xl" />
            </div>
          </div>
          
          {/* Upcoming Appointment Skeleton */}
          <div className="min-h-[240px] sm:min-h-[260px]">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 h-full flex flex-col items-center justify-center text-center">
              <Skeleton className="w-16 h-16 rounded-full mb-4" />
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-3 w-56 mb-6" />
              <Skeleton className="h-11 w-full rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Middle Row: Recent Tests */}
        <div className="min-h-[120px] sm:min-h-[140px]">
          <div className="bg-white rounded-3xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>

        {/* Bottom Row: Fitness Rate & Doctors List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Fitness Rate Skeleton */}
          <div className="min-h-[220px]">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 h-full">
              <Skeleton className="h-5 w-28 mb-4" />
              <div className="flex items-center justify-center py-8">
                <Skeleton className="w-24 h-24 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48 mx-auto" />
            </div>
          </div>
          
          {/* Doctors List Skeleton */}
          <div className="min-h-[280px]">
            <div className="bg-white rounded-3xl border border-gray-100 p-6 h-full">
              <Skeleton className="h-5 w-24 mb-4" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-28 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
