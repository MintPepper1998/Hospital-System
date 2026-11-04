"use server"

// Domain re-exports: Ward & discharge management
// TODO: Move actual implementations here from lib/actions.ts

export { createWard, getAdmissionForDischarge, processDischarge_DEPRECATED } from "@/lib/actions"
