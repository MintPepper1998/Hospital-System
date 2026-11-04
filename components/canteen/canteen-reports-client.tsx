"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  BarChart3, IndianRupee, UtensilsCrossed, Ticket, TrendingUp, TrendingDown,
  Package, AlertTriangle, Users, Clock, Salad,
} from "lucide-react"

interface TopItem {
  itemName: string
  _sum: { quantity: number | null; totalPrice: number | null }
  _count: number
}

interface Props {
  todayIpdRevenue: number
  todayWalkinRevenue: number
  weekIpdRevenue: number
  weekWalkinRevenue: number
  monthIpdRevenue: number
  monthWalkinRevenue: number
  todayIpdOrders: number
  todayWalkinTokens: number
  weekIpdOrders: number
  weekWalkinTokens: number
  monthIpdOrders: number
  monthWalkinTokens: number
  topMenuItems: TopItem[]
  dailyRevenue: { date: string; ipd: number; walkin: number }[]
  slotBreakdown: { name: string; code: string; ipdCount: number; walkinCount: number; ipdRevenue: number; walkinRevenue: number }[]
  activeDietCount: number
  lowStockCount: number
  lowStockItems: { name: string; current: number; min: number; unit: string }[]
}

export function CanteenReportsClient({
  todayIpdRevenue, todayWalkinRevenue,
  weekIpdRevenue, weekWalkinRevenue,
  monthIpdRevenue, monthWalkinRevenue,
  todayIpdOrders, todayWalkinTokens,
  weekIpdOrders, weekWalkinTokens,
  monthIpdOrders, monthWalkinTokens,
  topMenuItems, dailyRevenue, slotBreakdown,
  activeDietCount, lowStockCount, lowStockItems,
}: Props) {
  const todayTotal = todayIpdRevenue + todayWalkinRevenue
  const weekTotal = weekIpdRevenue + weekWalkinRevenue
  const monthTotal = monthIpdRevenue + monthWalkinRevenue
  const maxDailyRevenue = Math.max(...dailyRevenue.map((d) => d.ipd + d.walkin), 1)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Canteen Reports</h1>
          <p className="text-sm text-gray-500">Revenue analytics, top items, and operational insights</p>
        </div>
      </div>

      {/* Revenue Overview — Today / This Week / This Month */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Today", total: todayTotal, ipd: todayIpdRevenue, walkin: todayWalkinRevenue, orders: todayIpdOrders, tokens: todayWalkinTokens },
          { label: "This Week", total: weekTotal, ipd: weekIpdRevenue, walkin: weekWalkinRevenue, orders: weekIpdOrders, tokens: weekWalkinTokens },
          { label: "This Month", total: monthTotal, ipd: monthIpdRevenue, walkin: monthWalkinRevenue, orders: monthIpdOrders, tokens: monthWalkinTokens },
        ].map((period) => (
          <Card key={period.label} className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs uppercase tracking-wider font-semibold">
                {period.label}
              </CardDescription>
              <CardTitle className="text-2xl flex items-center gap-1">
                <IndianRupee className="h-5 w-5 text-emerald-600" />
                {period.total.toLocaleString("en-IN")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-blue-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1 text-blue-700 text-xs font-medium mb-1">
                    <UtensilsCrossed className="h-3 w-3" /> IPD Meals
                  </div>
                  <p className="font-bold text-blue-900">₹{period.ipd.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-blue-500">{period.orders} orders</p>
                </div>
                <div className="bg-violet-50 rounded-lg p-2.5">
                  <div className="flex items-center gap-1 text-violet-700 text-xs font-medium mb-1">
                    <Ticket className="h-3 w-3" /> Walk-in
                  </div>
                  <p className="font-bold text-violet-900">₹{period.walkin.toLocaleString("en-IN")}</p>
                  <p className="text-[10px] text-violet-500">{period.tokens} tokens</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Revenue Chart + Slot Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* 7-Day Revenue Chart (CSS bar chart) */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                7-Day Revenue Trend
              </CardTitle>
              <div className="flex gap-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-sm inline-block" /> IPD</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-violet-500 rounded-sm inline-block" /> Walk-in</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dailyRevenue.map((day) => {
                  const total = day.ipd + day.walkin
                  const ipdPct = maxDailyRevenue > 0 ? (day.ipd / maxDailyRevenue) * 100 : 0
                  const walkinPct = maxDailyRevenue > 0 ? (day.walkin / maxDailyRevenue) * 100 : 0
                  return (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-14 shrink-0">{day.date}</span>
                      <div className="flex-1 flex gap-0.5 h-7">
                        {ipdPct > 0 && (
                          <div
                            className="bg-blue-500 rounded-l-md h-full flex items-center justify-end px-1.5 min-w-[2px]"
                            style={{ width: `${ipdPct}%` }}
                          >
                            {ipdPct > 15 && <span className="text-[9px] text-white font-medium">₹{day.ipd}</span>}
                          </div>
                        )}
                        {walkinPct > 0 && (
                          <div
                            className={`bg-violet-500 h-full flex items-center px-1.5 min-w-[2px] ${ipdPct === 0 ? "rounded-l-md" : ""} rounded-r-md`}
                            style={{ width: `${walkinPct}%` }}
                          >
                            {walkinPct > 15 && <span className="text-[9px] text-white font-medium">₹{day.walkin}</span>}
                          </div>
                        )}
                        {total === 0 && (
                          <div className="bg-gray-100 rounded-md h-full flex items-center px-2">
                            <span className="text-[10px] text-gray-400">No revenue</span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-16 text-right">₹{total}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Per-Slot Breakdown */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-600" />
                Today&apos;s Slot-wise Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slotBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No meal slots configured</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-gray-500">
                        <th className="text-left py-2 px-3 font-medium">Slot</th>
                        <th className="text-center py-2 px-3 font-medium">IPD Orders</th>
                        <th className="text-center py-2 px-3 font-medium">Walk-in Tokens</th>
                        <th className="text-right py-2 px-3 font-medium">IPD Revenue</th>
                        <th className="text-right py-2 px-3 font-medium">Walk-in Revenue</th>
                        <th className="text-right py-2 px-3 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slotBreakdown.map((slot) => (
                        <tr key={slot.code} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2.5 px-3 font-semibold">{slot.name}</td>
                          <td className="py-2.5 px-3 text-center">{slot.ipdCount}</td>
                          <td className="py-2.5 px-3 text-center">{slot.walkinCount}</td>
                          <td className="py-2.5 px-3 text-right text-blue-600">₹{slot.ipdRevenue.toLocaleString("en-IN")}</td>
                          <td className="py-2.5 px-3 text-right text-violet-600">₹{slot.walkinRevenue.toLocaleString("en-IN")}</td>
                          <td className="py-2.5 px-3 text-right font-bold">₹{(slot.ipdRevenue + slot.walkinRevenue).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td className="py-2.5 px-3">Total</td>
                        <td className="py-2.5 px-3 text-center">{slotBreakdown.reduce((s, sl) => s + sl.ipdCount, 0)}</td>
                        <td className="py-2.5 px-3 text-center">{slotBreakdown.reduce((s, sl) => s + sl.walkinCount, 0)}</td>
                        <td className="py-2.5 px-3 text-right text-blue-600">₹{slotBreakdown.reduce((s, sl) => s + sl.ipdRevenue, 0).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3 text-right text-violet-600">₹{slotBreakdown.reduce((s, sl) => s + sl.walkinRevenue, 0).toLocaleString("en-IN")}</td>
                        <td className="py-2.5 px-3 text-right text-lg">₹{slotBreakdown.reduce((s, sl) => s + sl.ipdRevenue + sl.walkinRevenue, 0).toLocaleString("en-IN")}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Top Items + Quick Stats + Inventory Alerts */}
        <div className="space-y-6">
          {/* Quick Stat Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="pt-4 pb-4 text-center">
                <Users className="h-5 w-5 mx-auto text-blue-600 mb-1" />
                <p className="text-2xl font-bold text-blue-900">{activeDietCount}</p>
                <p className="text-[10px] text-blue-500 font-medium">Active Diet Plans</p>
              </CardContent>
            </Card>
            <Card className={`border-0 shadow-md ${lowStockCount > 0 ? "bg-gradient-to-br from-red-50 to-red-100" : "bg-gradient-to-br from-green-50 to-green-100"}`}>
              <CardContent className="pt-4 pb-4 text-center">
                <Package className={`h-5 w-5 mx-auto mb-1 ${lowStockCount > 0 ? "text-red-600" : "text-green-600"}`} />
                <p className={`text-2xl font-bold ${lowStockCount > 0 ? "text-red-900" : "text-green-900"}`}>{lowStockCount}</p>
                <p className={`text-[10px] font-medium ${lowStockCount > 0 ? "text-red-500" : "text-green-500"}`}>Low Stock Items</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Selling Items */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Salad className="h-4 w-4 text-emerald-600" />
                Top Selling Items
              </CardTitle>
              <CardDescription className="text-xs">Last 30 days by quantity</CardDescription>
            </CardHeader>
            <CardContent>
              {topMenuItems.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No order data yet</p>
              ) : (
                <div className="space-y-2">
                  {topMenuItems.map((item, idx) => (
                    <div key={item.itemName} className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-5 text-center ${idx < 3 ? "text-amber-600" : "text-gray-400"}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.itemName}</p>
                        <p className="text-[10px] text-gray-400">{item._count} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-700">{item._sum.quantity || 0} qty</p>
                        <p className="text-[10px] text-emerald-600">₹{(item._sum.totalPrice || 0).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory Alerts */}
          {lowStockItems.length > 0 && (
            <Card className="border-0 shadow-md border-l-4 border-l-red-400">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-4 w-4" />
                  Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lowStockItems.map((item) => (
                    <div key={item.name} className="flex items-center justify-between bg-red-50 rounded-lg p-2.5 text-sm">
                      <span className="font-medium text-red-800">{item.name}</span>
                      <div className="text-right">
                        <span className="text-red-700 font-bold">{item.current}</span>
                        <span className="text-red-400 text-xs"> / {item.min} {item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
