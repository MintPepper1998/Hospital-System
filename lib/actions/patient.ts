"use server"

// Domain re-exports: Patient management
// TODO: Move actual implementations here from lib/actions.ts

export { registerPatient, getPaginatedPatients, getPatientHistory } from "@/lib/actions"
