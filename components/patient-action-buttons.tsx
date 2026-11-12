"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button"
import { Calendar, Stethoscope, History, Printer, Pencil, Activity, AlertTriangle, UserCheck, XCircle, Loader2, FileText, ExternalLink } from "lucide-react"
import { BookAppointmentDialog } from "@/components/book-appointment-dialog"
import { PrintOPDButton } from "@/components/print-opd-button"
import { PaperOPDDialog } from "@/components/clinical/paper-opd-dialog"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import { markPatientArrived, skipPatientVitals } from "@/app/actions/clinical"
import { cancelOPDAppointment } from "@/lib/actions"
import { MarkArrivedDialog } from "@/components/mark-arrived-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Doctor {
  id: string
  user: {
    name: string
  }
  department: string
  specialization: string | null
}

interface Appointment {
  id: string
  status: string
  isPaperConsultation?: boolean
  scannedPaperUrl?: string | null
}

interface PatientActionButtonsProps {
  patientId: string
  patientName: string
  appointment: Appointment | null
  doctors: Doctor[]
  isProfileComplete?: boolean
  hideConsultation?: boolean
  patientPhone?: string | null
}

export function PatientActionButtons({
  patientId,
  patientName,
  appointment,
  doctors,
  isProfileComplete = true,
  hideConsultation = false,
  patientPhone,
}: PatientActionButtonsProps) {
  const [isPending, startTransition] = useTransition()
  const [isCancelling, setIsCancelling] = useState(false)

  const handleCancel = async (appointmentId: string) => {
    setIsCancelling(true)
    try {
      const result = await cancelOPDAppointment(appointmentId)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message || "Failed to cancel appointment")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsCancelling(false)
    }
  }

  const handleArrived = async (appointmentId: string) => {
    startTransition(async () => {
      try {
        const result = await markPatientArrived(appointmentId)
        if (result.success) {
          toast.success("Patient marked as arrived and sent to vitals queue")
        } else {
          toast.error("Failed to mark patient as arrived")
        }
      } catch (error: any) {
        toast.error(error.message || "An error occurred")
      }
    })
  }

  const handleSkipVitals = async (appointmentId: string) => {
    startTransition(async () => {
      try {
        const result = await skipPatientVitals(appointmentId)
        if (result.success) {
          toast.success("Skipped vitals. Patient is now waiting for doctor.")
        } else {
          toast.error("Failed to skip vitals")
        }
      } catch (error: any) {
        toast.error(error.message || "An error occurred")
      }
    })
  }

  const EditButton = () => (
    <Link
      href={`/dashboard/clinical/opd/edit/${patientId}`}
      className={cn(
        buttonVariants({ variant: "outline", size: "sm" }),
        !isProfileComplete ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
      )}
      title={!isProfileComplete ? "Complete Profile First" : "Edit Patient Information"}
    >
      <Pencil className="mr-2 h-4 w-4" />
      {!isProfileComplete ? "Complete Profile" : "Edit"}
    </Link>
  )

  // Enforce profile completion for any new bookings or actions
  if (!isProfileComplete) {
    return (
      <div className="flex gap-2 items-center">
        <EditButton />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-not-allowed">
                <Button size="sm" variant="outline" disabled className="pointer-events-none opacity-50">
                  <AlertTriangle className="mr-2 h-4 w-4 text-amber-500" />
                  Action Blocked
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Must complete profile (DOB, Gender, Address) before proceeding.
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  // The common BookAppointmentDialog which we'll render to keep it mounted.
  // We hide its trigger based on the appointment state.
  const bookDialog = (
    <BookAppointmentDialog
      patientId={patientId}
      patientName={patientName}
      patientPhone={patientPhone}
      doctors={doctors as any}
      hideTrigger={!!appointment && appointment.status !== "COMPLETED" && appointment.status !== "CANCELLED"}
    />
  )

// CONFIRMED status — e.g. from Online Booking
  if (appointment && appointment.status === "CONFIRMED") {
    return (
      <div className="flex gap-2 items-center">
        <EditButton />
        <MarkArrivedDialog
          patientId={patientId}
          patientName={patientName}
          appointmentId={appointment.id}
          doctor={(appointment as any).doctor}
        />
        {bookDialog}
      </div>
    )
  }

  // PENDING status — vitals not yet done
  if (appointment && appointment.status === "PENDING") {
    return (
      <div className="flex gap-2 items-center">
        <EditButton />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" disabled={isCancelling}>
              {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Cancel & Refund
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel OPD Booking?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this booking for <strong>{patientName}</strong>? 
                This will automatically process a refund for the paid amount and remove the patient from the Vitals Queue.
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Booking</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleCancel(appointment.id)} className="bg-red-600 hover:bg-red-700">
                Yes, Cancel & Refund
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Link
          href={`/dashboard/clinical/patient/${patientId}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          )}
        >
          <History className="mr-2 h-4 w-4" />
          History
        </Link>

        {/* Print and Start Consultation BLOCKED until vitals done */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-not-allowed">
                <Button
                  size="sm"
                  variant="outline"
                  disabled
                  className="pointer-events-none text-gray-400 border-gray-200"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Record vitals first (Nurse station)
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          size="sm"
          variant="outline"
          onClick={() => handleSkipVitals(appointment.id)}
          disabled={isPending}
          className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Activity className="mr-2 h-4 w-4" />}
          Skip Vitals
        </Button>

        <PaperOPDDialog
          appointmentId={appointment.id}
          patientId={patientId}
          patientName={patientName}
          patientPhone={patientPhone}
          triggerLabel="Done on Paper"
          triggerVariant="compact"
        />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="cursor-not-allowed">
                <Button
                  size="sm"
                  disabled
                  className="pointer-events-none bg-gray-300 text-gray-500"
                >
                  <Activity className="mr-2 h-4 w-4" />
                  Awaiting Vitals
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent className="bg-amber-50 border-amber-200">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                Nurse must record vitals before consultation
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {bookDialog}
      </div>
    )
  }

  // VITALS_DONE — vitals recorded, can now print + start consultation
  if (appointment && appointment.status === "VITALS_DONE") {
    return (
      <div className="flex gap-2 items-center">
        <EditButton />
        <Link
          href={`/dashboard/clinical/patient/${patientId}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          )}
        >
          <History className="mr-2 h-4 w-4" />
          History
        </Link>
        <PrintOPDButton
          appointmentId={appointment.id}
          label="Print"
          iconSize="h-4 w-4"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "text-[#0066CC] hover:text-[#0052A3] hover:bg-blue-50"
          )}
        />
        <PaperOPDDialog
          appointmentId={appointment.id}
          patientId={patientId}
          patientName={patientName}
          patientPhone={patientPhone}
          triggerLabel="Done on Paper"
          triggerVariant="compact"
        />
        {!hideConsultation && (
          <Link href={`/dashboard/clinical/opd/${appointment.id}`}>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Stethoscope className="mr-2 h-4 w-4" />
              Start Consultation
            </Button>
          </Link>
        )}
        {bookDialog}
      </div>
    )
  }

  // IN_PROGRESS — consultation already started
  if (appointment && appointment.status === "IN_PROGRESS") {
    return (
      <div className="flex gap-2 items-center">
        <EditButton />
        <PrintOPDButton
          appointmentId={appointment.id}
          label="Print"
          iconSize="h-4 w-4"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "text-[#0066CC] hover:text-[#0052A3] hover:bg-blue-50"
          )}
        />
        <PaperOPDDialog
          appointmentId={appointment.id}
          patientId={patientId}
          patientName={patientName}
          patientPhone={patientPhone}
          triggerLabel="Done on Paper"
          triggerVariant="compact"
        />
        {!hideConsultation && (
          <Link href={`/dashboard/clinical/opd/${appointment.id}`}>
            <Button
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Stethoscope className="mr-2 h-4 w-4" />
              Continue Consultation
            </Button>
          </Link>
        )}
        {bookDialog}
      </div>
    )
  }

  // COMPLETED
  if (appointment && appointment.status === "COMPLETED") {
    return (
      <div className="flex gap-2 items-center">
        <EditButton />
        {appointment.isPaperConsultation && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <FileText className="h-3 w-3 text-amber-600" />
            Paper OPD
          </span>
        )}
        {appointment.scannedPaperUrl && (
          <a
            href={appointment.scannedPaperUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            )}
          >
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            View Scan
          </a>
        )}
        <PaperOPDDialog
          appointmentId={appointment.id}
          patientId={patientId}
          patientName={patientName}
          patientPhone={patientPhone}
          existingScanUrl={appointment.scannedPaperUrl}
          isCompleted={true}
          triggerLabel={appointment.scannedPaperUrl ? "Update Scan" : "Attach Scan"}
          triggerVariant="compact"
        />
        <Link
          href={`/dashboard/clinical/patient/${patientId}`}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          )}
        >
          <History className="mr-2 h-4 w-4" />
          View History
        </Link>
        {bookDialog}
      </div>
    )
  }

  // No appointment (or cancelled) — show book button and history
  return (
    <div className="flex gap-2">
      <EditButton />
      <Link
        href={`/dashboard/clinical/patient/${patientId}`}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
        )}
      >
        <History className="mr-2 h-4 w-4" />
        History
      </Link>
      {bookDialog}
    </div>
  )
}
