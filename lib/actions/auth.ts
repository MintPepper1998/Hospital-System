"use server"

// Domain re-exports: Authentication & user management
// TODO: Move actual implementations here from lib/actions.ts

export { createUser, logout } from "@/lib/actions"
