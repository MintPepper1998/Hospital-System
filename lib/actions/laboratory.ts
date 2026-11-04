"use server"

// Domain re-exports: Laboratory & diagnostics
// TODO: Move actual implementations here from lib/actions.ts

export { collectSample, enterLabResult, createLabTest, updateLabTest, upsertLabTest, deleteLabTest } from "@/lib/actions"
