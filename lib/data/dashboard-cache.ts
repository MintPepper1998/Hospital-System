import { cache } from "react"
import { getAdminDashboardData } from "@/lib/actions/dashboard"
import { getAdminStats } from "@/app/actions/admin-dashboard"
import { getNurseStats } from "@/app/actions/nurse-dashboard"
import { getDoctorDashboardData } from "@/app/actions/doctor-dashboard"

export const getCachedAdminDashboardData = cache(getAdminDashboardData)
export const getCachedAdminStats = cache(getAdminStats)
export const getCachedNurseStats = cache(getNurseStats)
export const getCachedDoctorDashboardData = cache(getDoctorDashboardData)
