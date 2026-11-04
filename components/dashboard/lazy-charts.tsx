"use client"

import dynamic from "next/dynamic"
import { RevenueChartSkeleton, SpecializationChartSkeleton } from "./dashboard-skeletons"

export const LazyRevenueAnalytics = dynamic(
  () => import("./revenue-analytics").then((mod) => ({ default: mod.RevenueAnalytics })),
  { loading: () => <RevenueChartSkeleton />, ssr: false }
)

export const LazySpecializationChart = dynamic(
  () => import("./specialization-chart").then((mod) => ({ default: mod.SpecializationChart })),
  { loading: () => <SpecializationChartSkeleton />, ssr: false }
)

export const LazyDashboardCalendar = dynamic(
  () => import("./dashboard-calendar").then((mod) => ({ default: mod.DashboardCalendar })),
  { ssr: false }
)
