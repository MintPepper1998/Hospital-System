"use client"

import dynamic from "next/dynamic"
import { DoctorDashboardSkeleton, NurseDashboardSkeleton } from "./dashboard-skeletons"

export const LazyDoctorView = dynamic(
  () => import("./doctor-view").then((mod) => ({ default: mod.DoctorView })),
  { loading: () => <DoctorDashboardSkeleton /> }
)

export const LazyNurseView = dynamic(
  () => import("./nurse-view").then((mod) => ({ default: mod.NurseView })),
  { loading: () => <NurseDashboardSkeleton /> }
)
