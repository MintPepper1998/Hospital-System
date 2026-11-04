"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Ambulance as AmbulanceIcon,
  Truck,
  MapPin,
  Users,
  Receipt,
  Activity,
  CheckCircle2,
  XCircle,
  Wrench,
  IndianRupee,
  Clock,
  ArrowRight,
  Phone,
  AlertTriangle,
  Siren,
} from "lucide-react"

interface AmbulanceData {
  id: string
  vehicleNumber: string
  type: string
  status: string
  model: string | null
  contactNumber: string | null
  equipment: Array<{ id: string; equipmentName: string; category: string; condition: string }>
  staffAssignments: Array<{
    id: string
    role: string
    staff: { user: { name: string | null } }
    shift: { name: string; startTime: string; endTime: string }
  }>
  _count: { equipment: number; trips: number }
}

interface TripData {
  id: string
  tripNumber: string
  patientName: string
  patientPhone: string | null
  pickupLocation: string
  dropLocation: string
  distanceKm: number | null
  status: string
  requestedAt: string
  dispatchedAt: string | null
  completedAt: string | null
  ambulance: { vehicleNumber: string; type: string; contactNumber?: string | null }
  billing: { totalAmount: number; paymentStatus: string } | null
}

interface DashboardStats {
  totalAmbulances: number
  availableCount: number
  onTripCount: number
  maintenanceCount: number
  outOfServiceCount: number
  todayTotalTrips: number
  todayCompletedTrips: number
  todayCancelledTrips: number
  todayRevenue: number
  todayPaidRevenue: number
  allTimeTrips: number
}

interface AmbulanceDashboardClientProps {
  ambulances: AmbulanceData[]
  todayTrips: TripData[]
  activeTrips: TripData[]
  stats: DashboardStats
}

function getStatusColor(status: string) {
  switch (status) {
    case "AVAILABLE": return "bg-emerald-100 text-emerald-700 border-emerald-200"
    case "ON_TRIP": return "bg-red-100 text-red-700 border-red-200"
    case "MAINTENANCE": return "bg-amber-100 text-amber-700 border-amber-200"
    case "OUT_OF_SERVICE": return "bg-gray-100 text-gray-700 border-gray-200"
    default: return "bg-gray-100 text-gray-700"
  }
}

function getStatusDot(status: string) {
  switch (status) {
    case "AVAILABLE": return "bg-emerald-500"
    case "ON_TRIP": return "bg-red-500 animate-pulse"
    case "MAINTENANCE": return "bg-amber-500"
    case "OUT_OF_SERVICE": return "bg-gray-500"
    default: return "bg-gray-400"
  }
}

function getTripStatusBadge(status: string) {
  switch (status) {
    case "DISPATCHED": return "bg-blue-100 text-blue-700"
    case "EN_ROUTE": return "bg-indigo-100 text-indigo-700"
    case "ARRIVED": return "bg-purple-100 text-purple-700"
    case "PATIENT_LOADED": return "bg-orange-100 text-orange-700"
    case "RETURNING": return "bg-amber-100 text-amber-700"
    case "COMPLETED": return "bg-emerald-100 text-emerald-700"
    case "CANCELLED": return "bg-red-100 text-red-700"
    default: return "bg-gray-100 text-gray-700"
  }
}

function formatAmbulanceType(type: string) {
  return type.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function AmbulanceDashboardClient({
  ambulances,
  todayTrips,
  activeTrips,
  stats,
}: AmbulanceDashboardClientProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg">
            <Siren className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ambulance Management</h1>
            <p className="text-sm text-gray-500" suppressHydrationWarning>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/ambulance/fleet">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Truck className="h-4 w-4" /> Fleet
            </Button>
          </Link>
          <Link href="/dashboard/ambulance/trips">
            <Button variant="outline" size="sm" className="gap-1.5">
              <MapPin className="h-4 w-4" /> Trips
            </Button>
          </Link>
          <Link href="/dashboard/ambulance/staff">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="h-4 w-4" /> Staff
            </Button>
          </Link>
          <Link href="/dashboard/ambulance/billing">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Receipt className="h-4 w-4" /> Billing
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Fleet */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50" />
          <CardContent className="relative pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Total Fleet</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalAmbulances}</p>
                <div className="flex gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {stats.availableCount} Ready
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {stats.onTripCount} Active
                  </span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <AmbulanceIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Trips */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-purple-50" />
          <CardContent className="relative pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-violet-600 uppercase tracking-wider">Today&apos;s Trips</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stats.todayTotalTrips}</p>
                <div className="flex gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" /> {stats.todayCompletedTrips} Done
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600">
                    <XCircle className="h-3 w-3" /> {stats.todayCancelledTrips} Cancelled
                  </span>
                </div>
              </div>
              <div className="p-3 bg-violet-100 rounded-xl">
                <MapPin className="h-6 w-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50" />
          <CardContent className="relative pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Today&apos;s Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{stats.todayRevenue.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-gray-500 mt-1.5">
                  ₹{stats.todayPaidRevenue.toLocaleString("en-IN")} collected
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <IndianRupee className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className={`absolute inset-0 ${stats.maintenanceCount + stats.outOfServiceCount > 0 ? "bg-gradient-to-br from-amber-50 to-orange-50" : "bg-gradient-to-br from-green-50 to-emerald-50"}`} />
          <CardContent className="relative pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wider ${stats.maintenanceCount + stats.outOfServiceCount > 0 ? "text-amber-600" : "text-green-600"}`}>
                  Fleet Health
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.maintenanceCount + stats.outOfServiceCount > 0
                    ? `${stats.maintenanceCount + stats.outOfServiceCount} Issues`
                    : "All Good"}
                </p>
                <div className="flex gap-2 mt-1.5">
                  {stats.maintenanceCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600">
                      <Wrench className="h-3 w-3" /> {stats.maintenanceCount} Maintenance
                    </span>
                  )}
                  {stats.outOfServiceCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-600">
                      <AlertTriangle className="h-3 w-3" /> {stats.outOfServiceCount} OOS
                    </span>
                  )}
                </div>
              </div>
              <div className={`p-3 rounded-xl ${stats.maintenanceCount + stats.outOfServiceCount > 0 ? "bg-amber-100" : "bg-green-100"}`}>
                <Wrench className={`h-6 w-6 ${stats.maintenanceCount + stats.outOfServiceCount > 0 ? "text-amber-600" : "text-green-600"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Trips (Live) */}
      {activeTrips.length > 0 && (
        <Card className="border-0 shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <CardTitle className="text-lg">Active Trips</CardTitle>
              <Badge className="bg-red-100 text-red-700 text-xs">{activeTrips.length} Live</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {activeTrips.map((trip) => (
                <div key={trip.id} className="p-3 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-gray-500">{trip.tripNumber}</span>
                    <Badge className={`text-[10px] ${getTripStatusBadge(trip.status)}`}>
                      {trip.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <AmbulanceIcon className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-semibold">{trip.ambulance.vehicleNumber}</span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <span className="truncate">{trip.pickupLocation}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                      <span className="truncate">{trip.dropLocation}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                    <span className="text-xs text-gray-500">{trip.patientName}</span>
                    <span className="text-[10px] text-gray-400">
                      <Clock className="h-3 w-3 inline mr-0.5" />
                      {timeAgo(trip.requestedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fleet Status Board */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="h-5 w-5 text-gray-600" />
              Fleet Status
            </CardTitle>
            <Link href="/dashboard/ambulance/fleet">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {ambulances.length === 0 ? (
            <div className="text-center py-12">
              <AmbulanceIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No ambulances registered</p>
              <p className="text-sm text-gray-400 mt-1">Go to Fleet Management to add ambulances</p>
              <Link href="/dashboard/ambulance/fleet">
                <Button className="mt-4" size="sm">Register Ambulance</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {ambulances.map((amb) => (
                <div
                  key={amb.id}
                  className="relative p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group"
                >
                  {/* Status dot */}
                  <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${getStatusDot(amb.status)}`} />

                  {/* Vehicle info */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-gray-100 group-hover:bg-red-50 transition-colors">
                      <AmbulanceIcon className="h-4 w-4 text-gray-600 group-hover:text-red-600 transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{amb.vehicleNumber}</p>
                      <p className="text-[10px] text-gray-500">{formatAmbulanceType(amb.type)}</p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <Badge className={`text-[10px] mb-2 ${getStatusColor(amb.status)}`}>
                    {amb.status.replace(/_/g, " ")}
                  </Badge>

                  {/* Quick stats */}
                  <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-1">
                    <span className="flex items-center gap-0.5">
                      <Activity className="h-3 w-3" /> {amb._count.equipment} equip
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" /> {amb._count.trips} trips
                    </span>
                  </div>

                  {/* Today's staff */}
                  {amb.staffAssignments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-50">
                      <p className="text-[10px] text-gray-400 mb-1">Today&apos;s Staff</p>
                      {amb.staffAssignments.slice(0, 2).map((sa) => (
                        <div key={sa.id} className="text-[10px] text-gray-600 flex items-center gap-1">
                          <Users className="h-2.5 w-2.5" />
                          {sa.staff.user.name} ({sa.role})
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Contact */}
                  {amb.contactNumber && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400">
                      <Phone className="h-2.5 w-2.5" /> {amb.contactNumber}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Today's Trip Log */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-gray-600" />
              Today&apos;s Trips
            </CardTitle>
            <Link href="/dashboard/ambulance/trips">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                View All <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {todayTrips.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No trips today</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Trip #</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Vehicle</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Patient</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Route</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Distance</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {todayTrips.slice(0, 10).map((trip) => (
                    <tr key={trip.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 text-xs font-mono text-gray-600">{trip.tripNumber}</td>
                      <td className="py-2.5 px-3 text-xs font-medium">{trip.ambulance.vehicleNumber}</td>
                      <td className="py-2.5 px-3 text-xs">{trip.patientName}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500 max-w-[200px] truncate">
                        {trip.pickupLocation} → {trip.dropLocation}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">
                        {trip.distanceKm ? `${trip.distanceKm} km` : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge className={`text-[10px] ${getTripStatusBadge(trip.status)}`}>
                          {trip.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-medium">
                        {trip.billing ? `₹${trip.billing.totalAmount.toLocaleString("en-IN")}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
