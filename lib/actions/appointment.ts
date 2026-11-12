"use server"

// Domain re-exports: Appointment & consultation management
// TODO: Move actual implementations here from lib/actions.ts

export { createAppointment, updateConsultation, saveConsultation, getDoctorQueue } from "@/lib/actions"
export { completePaperConsultation } from "@/app/actions/clinical"
