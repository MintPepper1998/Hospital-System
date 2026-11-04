"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import {
  Receipt, IndianRupee, CreditCard, Settings, Ambulance as AmbulanceIcon,
  CheckCircle2, Clock, Ban, MapPin,
} from "lucide-react"

interface BillingData {
  id: string
  tripId: string
  bookingFee: number
  perKmRate: number
  distanceKm: number
  distanceCharge: number
  equipmentCharge: number
  waitingCharge: number
  nightSurcharge: number
  totalAmount: number
  paymentStatus: string
  paymentMethod: string | null
  isWaived: boolean
  waiverReason: string | null
  createdAt: string
  trip: {
    tripNumber: string
    patientName: string
    patientPhone: string | null
    pickupLocation: string
    dropLocation: string
    distanceKm: number | null
    status: string
    requestedAt: string
    completedAt: string | null
    ambulance: { vehicleNumber: string; type: string }
  }
}

interface BillingConfig {
  defaultBookingFee: number
  defaultPerKmRate: number
  nightSurchargeRate: number
  nightStartHour: number
  nightEndHour: number
  waitingChargePerHr: number
  alsExtraCharge: number
  neonatalExtraCharge: number
  oxygenChargePerHr: number
}

interface BillingSummary {
  totalRevenue: number
  paidRevenue: number
  pendingRevenue: number
  waivedAmount: number
  totalTrips: number
}

export function BillingClient({
  billings, config: initialConfig, summary,
}: { billings: BillingData[]; config: BillingConfig; summary: BillingSummary }) {
  const router = useRouter()
  const [showConfig, setShowConfig] = useState(false)
  const [configForm, setConfigForm] = useState({ ...initialConfig })
  const [loading, setLoading] = useState(false)

  async function handleSaveConfig() {
    setLoading(true)
    try {
      const res = await fetch("/api/ambulance/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configForm),
      })
      if (!res.ok) throw new Error("Failed to save")
      toast.success("Billing rates updated!")
      setShowConfig(false)
      router.refresh()
    } catch {
      toast.error("Failed to save configuration")
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkPaid(tripId: string, paymentMethod: string) {
    try {
      const res = await fetch(`/api/ambulance/trips/${tripId}/billing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus: "PAID", paymentMethod }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast.success("Payment recorded & billing created in finance")
      router.refresh()
    } catch {
      toast.error("Failed to update payment")
    }
  }

  async function handleWaive(tripId: string) {
    const reason = prompt("Reason for waiving charges?")
    if (reason === null) return
    try {
      const res = await fetch(`/api/ambulance/trips/${tripId}/billing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isWaived: true, waiverReason: reason, waivedBy: "Admin" }),
      })
      if (!res.ok) throw new Error("Failed to update")
      toast.success("Charges waived")
      router.refresh()
    } catch {
      toast.error("Failed to waive charges")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing & Charges</h1>
            <p className="text-sm text-gray-500">Ambulance trip billing management</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowConfig(!showConfig)}>
          <Settings className="h-4 w-4" /> {showConfig ? "Hide" : "Configure"} Rates
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-green-50" />
          <CardContent className="relative pt-5 pb-4">
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹{summary.totalRevenue.toLocaleString("en-IN")}</p>
            <p className="text-[10px] text-gray-500 mt-1">{summary.totalTrips} trips</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50" />
          <CardContent className="relative pt-5 pb-4">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Collected</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹{summary.paidRevenue.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50" />
          <CardContent className="relative pt-5 pb-4">
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹{summary.pendingRevenue.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-0 shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-slate-50" />
          <CardContent className="relative pt-5 pb-4">
            <p className="text-xs font-medium text-gray-600 uppercase tracking-wider">Waived</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">₹{summary.waivedAmount.toLocaleString("en-IN")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <Card className="border-0 shadow-md border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-500" /> Billing Rate Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              <div><Label className="text-xs">Booking Fee (₹)</Label><Input type="number" value={configForm.defaultBookingFee} onChange={(e) => setConfigForm({ ...configForm, defaultBookingFee: parseFloat(e.target.value) })} /></div>
              <div><Label className="text-xs">Per Km Rate (₹)</Label><Input type="number" value={configForm.defaultPerKmRate} onChange={(e) => setConfigForm({ ...configForm, defaultPerKmRate: parseFloat(e.target.value) })} /></div>
              <div><Label className="text-xs">Night Surcharge (₹)</Label><Input type="number" value={configForm.nightSurchargeRate} onChange={(e) => setConfigForm({ ...configForm, nightSurchargeRate: parseFloat(e.target.value) })} /></div>
              <div><Label className="text-xs">Night Start Hour</Label><Input type="number" min={0} max={23} value={configForm.nightStartHour} onChange={(e) => setConfigForm({ ...configForm, nightStartHour: parseInt(e.target.value) })} /></div>
              <div><Label className="text-xs">Night End Hour</Label><Input type="number" min={0} max={23} value={configForm.nightEndHour} onChange={(e) => setConfigForm({ ...configForm, nightEndHour: parseInt(e.target.value) })} /></div>
              <div><Label className="text-xs">Waiting/Hr (₹)</Label><Input type="number" value={configForm.waitingChargePerHr} onChange={(e) => setConfigForm({ ...configForm, waitingChargePerHr: parseFloat(e.target.value) })} /></div>
              <div><Label className="text-xs">ALS Extra (₹)</Label><Input type="number" value={configForm.alsExtraCharge} onChange={(e) => setConfigForm({ ...configForm, alsExtraCharge: parseFloat(e.target.value) })} /></div>
              <div><Label className="text-xs">Neonatal Extra (₹)</Label><Input type="number" value={configForm.neonatalExtraCharge} onChange={(e) => setConfigForm({ ...configForm, neonatalExtraCharge: parseFloat(e.target.value) })} /></div>
            </div>
            <Button onClick={handleSaveConfig} disabled={loading} className="mt-3" size="sm">
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Billing Records */}
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Trip Billing Records</CardTitle>
        </CardHeader>
        <CardContent>
          {billings.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No billing records yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Trip</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Vehicle</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">Patient</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Booking</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Distance</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Extras</th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">Total</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Status</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {billings.map((b) => (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 text-xs font-mono">{b.trip.tripNumber}</td>
                      <td className="py-2.5 px-3 text-xs">
                        <div className="flex items-center gap-1">
                          <AmbulanceIcon className="h-3 w-3 text-red-500" />
                          {b.trip.ambulance.vehicleNumber}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs">{b.trip.patientName}</td>
                      <td className="py-2.5 px-3 text-xs text-right">₹{b.bookingFee}</td>
                      <td className="py-2.5 px-3 text-xs text-right text-gray-500">
                        ₹{b.distanceCharge} <span className="text-[9px]">({b.distanceKm}km)</span>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-right text-gray-500">
                        ₹{b.equipmentCharge + b.nightSurcharge + b.waitingCharge}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-right font-bold">₹{b.totalAmount.toLocaleString("en-IN")}</td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge className={`text-[9px] ${
                          b.paymentStatus === "PAID" ? "bg-emerald-100 text-emerald-700" :
                          b.paymentStatus === "WAIVED" ? "bg-gray-100 text-gray-600" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {b.paymentStatus === "PAID" && <CheckCircle2 className="h-2.5 w-2.5 mr-0.5 inline" />}
                          {b.paymentStatus === "WAIVED" && <Ban className="h-2.5 w-2.5 mr-0.5 inline" />}
                          {b.paymentStatus === "PENDING" && <Clock className="h-2.5 w-2.5 mr-0.5 inline" />}
                          {b.paymentStatus}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {b.paymentStatus === "PENDING" && (
                          <div className="flex items-center gap-1 justify-center">
                            <Select onValueChange={(method) => handleMarkPaid(b.tripId, method)}>
                              <SelectTrigger className="h-6 w-[80px] text-[10px]">
                                <CreditCard className="h-2.5 w-2.5 mr-0.5" /> Pay
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash</SelectItem>
                                <SelectItem value="UPI">UPI</SelectItem>
                                <SelectItem value="CARD">Card</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-gray-400" onClick={() => handleWaive(b.tripId)}>
                              Waive
                            </Button>
                          </div>
                        )}
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
