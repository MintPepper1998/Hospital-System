"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Globe,
  Check,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Phone,
  Calendar,
  Stethoscope,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { confirmOnlineBooking, rejectOnlineBooking, getOnlineBookings } from "@/app/actions/online-booking"

interface Doctor {
  id: string
  department: string | null
  specialization: string | null
  user: { name: string | null }
}

interface Booking {
  id: string
  patientName: string
  phone: string
  email: string | null
  age: number | null
  gender: string | null
  department: string
  preferredDate: string
  preferredTime: string
  reason: string | null
  status: string
  bookingToken: string
  createdAt: string
  preferredDoctor: {
    id: string
    user: { name: string | null }
    specialization: string | null
  } | null
}

interface OnlineBookingsSectionProps {
  initialBookings: Booking[]
  doctors: Doctor[]
  currentUser: { id: string; name: string }
}

export function OnlineBookingsSection({
  initialBookings,
  doctors,
  currentUser,
}: OnlineBookingsSectionProps) {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings)
  const [confirmDialog, setConfirmDialog] = useState<Booking | null>(null)
  const [rejectDialog, setRejectDialog] = useState<Booking | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Confirm dialog state
  const [confirmDoctorId, setConfirmDoctorId] = useState("")
  const [confirmDate, setConfirmDate] = useState("")
  const [confirmTime, setConfirmTime] = useState("")

  // Reject dialog state
  const [rejectReason, setRejectReason] = useState("")

  const pendingBookings = bookings.filter((b) => b.status === "PENDING")
  const recentBookings = bookings.filter((b) => b.status !== "PENDING").slice(0, 10)

  const refreshBookings = async () => {
    setIsRefreshing(true)
    const result = await getOnlineBookings({ status: "ALL" })
    if (result.success) {
      setBookings(result.data as unknown as Booking[])
    }
    setIsRefreshing(false)
  }

  const handleConfirm = () => {
    if (!confirmDialog || !confirmDoctorId || !confirmDate || !confirmTime) {
      toast.error("Please fill all fields")
      return
    }

    startTransition(async () => {
      const result = await confirmOnlineBooking({
        bookingId: confirmDialog.id,
        doctorId: confirmDoctorId,
        appointmentDate: confirmDate,
        appointmentTime: confirmTime,
        confirmedByName: currentUser.name,
        confirmedById: currentUser.id,
      })

      if (result.success) {
        toast.success(result.message)
        setConfirmDialog(null)
        refreshBookings()
      } else {
        toast.error(result.message)
      }
    })
  }

  const handleReject = () => {
    if (!rejectDialog || !rejectReason.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }

    startTransition(async () => {
      const result = await rejectOnlineBooking({
        bookingId: rejectDialog.id,
        reason: rejectReason,
        rejectedByName: currentUser.name,
        rejectedById: currentUser.id,
      })

      if (result.success) {
        toast.success(result.message)
        setRejectDialog(null)
        setRejectReason("")
        refreshBookings()
      } else {
        toast.error(result.message)
      }
    })
  }

  const openConfirmDialog = (booking: Booking) => {
    setConfirmDoctorId(booking.preferredDoctor?.id || "")
    setConfirmDate(new Date(booking.preferredDate).toISOString().split("T")[0])
    setConfirmTime(booking.preferredTime)
    setConfirmDialog(booking)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="neo-pressed border-none text-amber-700 bg-transparent">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        )
      case "CONFIRMED":
        return (
          <Badge className="neo-flat text-green-700 bg-[#e0e5ec] hover:bg-[#e0e5ec]">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge className="neo-flat text-red-600 bg-[#e0e5ec] hover:bg-[#e0e5ec]">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        )
      default:
        return <Badge className="neo-flat bg-[#e0e5ec] text-zinc-700">{status}</Badge>
    }
  }

  return (
    <>
      <Card className="bg-[#e0e5ec] neo-flat !rounded-[2rem] border-none overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-600" />
              Online Booking Requests
              {pendingBookings.length > 0 && (
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold animate-pulse">
                  {pendingBookings.length}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Bookings from the public website — review and confirm
            </CardDescription>
          </div>
          <Button
            className="neo-button bg-[#e0e5ec] text-zinc-700 hover:text-zinc-900 border-none"
            size="sm"
            onClick={refreshBookings}
            disabled={isRefreshing}
          >
            <RefreshCcw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent>
          {pendingBookings.length === 0 ? (
            <div className="text-center py-10 my-4 neo-pressed rounded-[2rem] text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-40 text-purple-600" />
              <p className="font-medium text-purple-900/60">No pending online bookings</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Preferred Doctor</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingBookings.map((booking) => (
                  <TableRow
                    key={booking.id}
                    className="hover:bg-purple-50/50 transition-colors"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{booking.patientName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {booking.phone}
                        </p>
                        {booking.reason && (
                          <p className="text-xs text-gray-500 mt-0.5 max-w-[180px] truncate" title={booking.reason}>
                            💬 {booking.reason}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {booking.department}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {booking.preferredDoctor ? (
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="h-3.5 w-3.5 text-[#0066CC]" />
                          <span className="text-sm">
                            Dr. {booking.preferredDoctor.user.name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Any doctor</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          {format(new Date(booking.preferredDate), "MMM dd, yyyy")}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {booking.preferredTime}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(booking.createdAt), "MMM dd, hh:mm a")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 h-8"
                          onClick={() => openConfirmDialog(booking)}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8"
                          onClick={() => setRejectDialog(booking)}
                        >
                          <X className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Recent processed bookings */}
          {recentBookings.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-500 mb-3">
                Recently Processed
              </h4>
              <div className="space-y-2">
                {recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-3 rounded-2xl neo-flat text-sm mb-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-zinc-700">{b.patientName}</span>
                      <span className="text-xs text-zinc-500 neo-pressed px-2 py-1 rounded-md">{b.department}</span>
                    </div>
                    {getStatusBadge(b.status)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CONFIRM DIALOG ── */}
      <Dialog open={!!confirmDialog} onOpenChange={(v) => !v && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Confirm Appointment
            </DialogTitle>
            <DialogDescription>
              Confirm the booking for{" "}
              <span className="font-semibold">{confirmDialog?.patientName}</span>{" "}
              ({confirmDialog?.phone})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {confirmDialog?.reason && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-xs text-gray-500 font-medium mb-1">Patient's Reason:</p>
                <p>{confirmDialog.reason}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>
                Assign Doctor <span className="text-red-500">*</span>
              </Label>
              <Select value={confirmDoctorId} onValueChange={setConfirmDoctorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors
                    .filter(
                      (d) =>
                        !confirmDialog?.department ||
                        d.department === confirmDialog.department
                    )
                    .map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        Dr. {doc.user.name} — {doc.department}
                        {doc.specialization && ` (${doc.specialization})`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={confirmDate}
                  onChange={(e) => setConfirmDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Time <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={confirmTime}
                  onChange={(e) => setConfirmTime(e.target.value)}
                  placeholder="e.g., 10:00 AM"
                />
              </div>
            </div>

            {confirmDialog?.preferredDoctor &&
              confirmDoctorId !== confirmDialog.preferredDoctor.id && (
                <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                  Patient preferred Dr.{" "}
                  {confirmDialog.preferredDoctor.user.name} but you selected a
                  different doctor.
                </div>
              )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handleConfirm}
              disabled={isPending || !confirmDoctorId || !confirmDate || !confirmTime}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirm Appointment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── REJECT DIALOG ── */}
      <Dialog open={!!rejectDialog} onOpenChange={(v) => !v && setRejectDialog(null)}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-red-700 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Reject Booking
            </DialogTitle>
            <DialogDescription>
              Reject the booking for{" "}
              <span className="font-semibold">{rejectDialog?.patientName}</span>.
              The patient will be notified via WhatsApp.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Doctor is not available on the requested date, Please try another date..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isPending || !rejectReason.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Reject & Notify Patient
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
