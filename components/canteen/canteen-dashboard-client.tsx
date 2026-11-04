"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  UtensilsCrossed,
  Ticket,
  Bed,
  IndianRupee,
  Clock,
  TrendingUp,
  AlertTriangle,
  Salad,
  Coffee,
  Moon,
  Sun,
} from "lucide-react"

interface SlotStat {
  slotId: string
  slotName: string
  slotCode: string
  startTime: string
  endTime: string
  ipdCount: number
  walkinCount: number
  totalServed: number
  totalPending: number
}

interface CanteenDashboardClientProps {
  todayIpdOrders: number
  todayWalkinTokens: number
  activeIpdDiets: number
  ipdRevenue: number
  walkinRevenue: number
  totalRevenue: number
  perSlotStats: SlotStat[]
  todayMenuCount: number
  lowStockCount: number
}

function getSlotIcon(code: string) {
  switch (code) {
    case "BF": return <Coffee className="h-5 w-5" />
    case "LN": return <Sun className="h-5 w-5" />
    case "ES": return <Coffee className="h-5 w-5" />
    case "DN": return <Moon className="h-5 w-5" />
    default: return <UtensilsCrossed className="h-5 w-5" />
  }
}

function getSlotColor(code: string) {
  switch (code) {
    case "BF": return "from-amber-500 to-orange-500"
    case "LN": return "from-emerald-500 to-green-500"
    case "ES": return "from-purple-500 to-violet-500"
    case "DN": return "from-blue-500 to-indigo-500"
    default: return "from-gray-500 to-slate-500"
  }
}

function isCurrentSlot(startTime: string, endTime: string) {
  const now = new Date()
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  return currentMinutes >= sh * 60 + sm && currentMinutes <= eh * 60 + em
}

export function CanteenDashboardClient({
  todayIpdOrders,
  todayWalkinTokens,
  activeIpdDiets,
  ipdRevenue,
  walkinRevenue,
  totalRevenue,
  perSlotStats,
  todayMenuCount,
  lowStockCount,
}: CanteenDashboardClientProps) {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Canteen Dashboard</h1>
            <p className="text-sm text-gray-500" suppressHydrationWarning>
              {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50" />
          <CardContent className="relative pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Today&apos;s Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{totalRevenue.toLocaleString("en-IN")}
                </p>
                <div className="flex gap-3 mt-1 text-xs text-gray-500">
                  <span>IPD: ₹{ipdRevenue.toLocaleString("en-IN")}</span>
                  <span>Walk-in: ₹{walkinRevenue.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <IndianRupee className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IPD Meals */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50" />
          <CardContent className="relative pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">IPD Meals</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{todayIpdOrders}</p>
                <p className="text-xs text-gray-500 mt-1">{activeIpdDiets} active diet plans</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Bed className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Walk-in Tokens */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-violet-50" />
          <CardContent className="relative pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Walk-in Tokens</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{todayWalkinTokens}</p>
                <p className="text-xs text-gray-500 mt-1">{todayMenuCount} items on menu today</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Ticket className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className={`absolute inset-0 ${lowStockCount > 0 ? "bg-gradient-to-br from-red-50 to-orange-50" : "bg-gradient-to-br from-green-50 to-emerald-50"}`} />
          <CardContent className="relative pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium uppercase tracking-wider ${lowStockCount > 0 ? "text-red-600" : "text-green-600"}`}>Inventory Status</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {lowStockCount > 0 ? `${lowStockCount} Low` : "All Good"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {lowStockCount > 0 ? "Items below min stock" : "Stock levels healthy"}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${lowStockCount > 0 ? "bg-red-100" : "bg-green-100"}`}>
                {lowStockCount > 0 ? (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                ) : (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meal Slot Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-600" />
          Meal Slots — Today
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {perSlotStats.length === 0 ? (
            <Card className="col-span-full border-dashed border-2">
              <CardContent className="pt-6 pb-6 text-center">
                <Salad className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No meal slots configured yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Go to Admin → Canteen Settings to configure meal slots
                </p>
              </CardContent>
            </Card>
          ) : (
            perSlotStats.map((stat) => {
              const isCurrent = isCurrentSlot(stat.startTime, stat.endTime)
              return (
                <Card
                  key={stat.slotId}
                  className={`relative overflow-hidden border-0 shadow-md transition-all ${
                    isCurrent ? "ring-2 ring-orange-400 ring-offset-2" : ""
                  }`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${getSlotColor(stat.slotCode)}`} />
                  <CardHeader className="pb-2 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg bg-gradient-to-r ${getSlotColor(stat.slotCode)} text-white`}>
                          {getSlotIcon(stat.slotCode)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{stat.slotName}</CardTitle>
                          <CardDescription className="text-xs">
                            {stat.startTime} – {stat.endTime}
                          </CardDescription>
                        </div>
                      </div>
                      {isCurrent && (
                        <Badge className="bg-orange-500 text-white text-[10px] animate-pulse">LIVE</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-bold text-blue-700">{stat.ipdCount}</p>
                        <p className="text-[10px] text-blue-500 font-medium">IPD</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-bold text-purple-700">{stat.walkinCount}</p>
                        <p className="text-[10px] text-purple-500 font-medium">Walk-in</p>
                      </div>
                    </div>
                    <div className="flex justify-between mt-3 text-xs">
                      <span className="text-green-600 font-medium">✅ {stat.totalServed} Served</span>
                      <span className="text-amber-600 font-medium">⏳ {stat.totalPending} Pending</span>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
