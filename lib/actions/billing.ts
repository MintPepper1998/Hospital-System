"use server"

// Domain re-exports: Billing & invoicing
// TODO: Move actual implementations here from lib/actions.ts

export { generateInvoice, generateInvoiceWithAutoCreate, createSmartInvoice } from "@/lib/actions"
