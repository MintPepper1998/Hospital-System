"use server"

// Domain re-exports: Surgery & operation theater management
// TODO: Move actual implementations here from lib/actions.ts

export { getTheaters, getSurgeries, getTodaysSurgeries, createTheater, upsertOperationTheater, deleteOperationTheater, scheduleSurgery, updateSurgeryStatus, updatePACStatus } from "@/lib/actions"
