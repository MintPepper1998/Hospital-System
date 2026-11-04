"use client"

import { useState } from "react"
import { checkBookingStatus } from "@/app/actions/online-booking"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  Calendar,
  Stethoscope,
  User,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface BookingData {
  id: string
  patientName: string
  phone: string
  department: string
  preferredDate: string
  preferredTime: string
  status: string
  bookingToken: string
  reason?: string | null
  rejectionReason?: string | null
  confirmedAt?: string | null
  confirmedByName?: string | null
  createdAt: string
  preferredDoctor?: {
    user: { name: string | null }
  } | null
}

const statusConfig: Record<
  string,
  { label: string; icon: typeof Clock; color: string; bgColor: string }
> = {
  PENDING: {
    label: "Pending Review",
    icon: Clock,
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
  },
  CONFIRMED: {
    label: "Confirmed",
    icon: CheckCircle2,
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
  },
  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
  },
  CANCELLED: {
    label: "Cancelled",
    icon: AlertCircle,
    color: "text-gray-700",
    bgColor: "bg-gray-50 border-gray-200",
  },
  NO_SHOW: {
    label: "No Show",
    icon: AlertCircle,
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
  },
}

export function BookingStatusChecker() {
  const [token, setToken] = useState("")
  const [phone, setPhone] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [booking, setBooking] = useState<BookingData | null>(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!token || phone.length !== 10) {
      toast.error("Please enter your booking token and 10-digit phone number")
      return
    }

    setIsLoading(true)
    setSearched(true)

    try {
      const result = await checkBookingStatus(token.trim().toUpperCase(), phone)

      if (result.success && result.data) {
        setBooking(result.data as unknown as BookingData)
      } else {
        setBooking(null)
        toast.error(result.message || "No booking found")
      }
    } catch {
      toast.error("Failed to check status. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const config = booking ? statusConfig[booking.status] || statusConfig.PENDING : null

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#0066CC]">Check Booking Status</h1>
        <p className="text-gray-600 mt-2">
          Enter your booking token and phone number to check your appointment status
        </p>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="bg-blue-50/50 border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5 text-[#0066CC]" />
            Find Your Booking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label>Booking Token</Label>
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value.toUpperCase())}
              placeholder="e.g., BK-2026-0001"
              className="h-12 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                className="pl-10 h-12"
                maxLength={10}
              />
            </div>
          </div>
          <Button
            onClick={handleSearch}
            disabled={isLoading || !token || phone.length !== 10}
            className="w-full bg-[#0066CC] hover:bg-[#0055AA] h-12"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Check Status
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {searched && !isLoading && booking && config && (
        <Card className={`border-2 ${config.bgColor} shadow-lg animate-in fade-in duration-300`}>
          <CardContent className="p-6 space-y-4">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <config.icon className={`h-6 w-6 ${config.color}`} />
                <span className={`text-lg font-bold ${config.color}`}>
                  {config.label}
                </span>
              </div>
              <Badge variant="outline" className="font-mono">
                {booking.bookingToken}
              </Badge>
            </div>

            {/* Details */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Patient:</span>
                <span className="font-medium">{booking.patientName}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Stethoscope className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Department:</span>
                <span className="font-medium">{booking.department}</span>
              </div>
              {booking.preferredDoctor && (
                <div className="flex items-center gap-3 text-sm">
                  <Stethoscope className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-500">Doctor:</span>
                  <span className="font-medium">
                    Dr. {booking.preferredDoctor.user.name}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Date:</span>
                <span className="font-medium">
                  {format(new Date(booking.preferredDate), "EEEE, MMM dd, yyyy")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-gray-500">Time:</span>
                <span className="font-medium">{booking.preferredTime}</span>
              </div>
            </div>

            {/* Rejection reason */}
            {booking.status === "REJECTED" && booking.rejectionReason && (
              <div className="bg-red-100 rounded-lg p-3 text-sm text-red-800">
                <p className="font-medium">Reason:</p>
                <p>{booking.rejectionReason}</p>
              </div>
            )}

            {/* Confirmation details */}
            {booking.status === "CONFIRMED" && booking.confirmedAt && (
              <div className="bg-green-100 rounded-lg p-3 text-sm text-green-800">
                <p>
                  Confirmed by {booking.confirmedByName || "Reception"} on{" "}
                  {format(new Date(booking.confirmedAt), "MMM dd, yyyy 'at' hh:mm a")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {searched && !isLoading && !booking && (
        <Card className="border-2 border-gray-200 shadow-lg">
          <CardContent className="py-8 text-center text-gray-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No booking found</p>
            <p className="text-sm mt-1">
              Please check your booking token and phone number
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
