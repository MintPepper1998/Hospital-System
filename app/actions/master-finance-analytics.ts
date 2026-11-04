"use server"

import { prisma } from "@/lib/prisma"

// --- KPIs ---
export async function getFinancialKPIs(params: { from: string, to: string }) {
  // Real implementation would aggregate data from transactions and billing
  // Simulated for UI logic:
  return {
    arpob: 14500, // Average Revenue Per Occupied Bed
    collectionEfficiency: 92.5, // %
    operatingMargin: 28.4, // %
    workingCapitalRatio: 1.8,
    debtorsDays: 45,
    creditorsDays: 32,
    revenueGrowthMoM: 5.2, // %
    ebitda: 12500000
  }
}

// --- Revenue Leakage ---
export async function getRevenueLeakage(params: { from: string, to: string }) {
  // Detects anomalies in billing (e.g. unbilled IPD services)
  return {
    totalLeakageDetected: 245000,
    incidents: [
      { id: "LKG-001", type: "UNBILLED_SERVICES", department: "OT", amount: 45000, patientId: "PT-8892", status: "UNRESOLVED", date: "2026-09-20" },
      { id: "LKG-003", type: "UNDERCHARGING", department: "Laboratory", amount: 3500, patientId: "PT-9321", status: "UNRESOLVED", date: "2026-09-22" },
      { id: "LKG-004", type: "UNBILLED_SERVICES", department: "IPD", amount: 184000, patientId: "PT-8800", status: "INVESTIGATING", date: "2026-09-18" },
    ]
  }
}

// --- Trends ---
export async function getTrendAnalysis(params: { year: number }) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  
  return months.map(m => ({
    month: m,
    revenue: Math.floor(Math.random() * 5000000) + 15000000,
    expenses: Math.floor(Math.random() * 4000000) + 10000000,
    targetRevenue: 19000000
  }))
}

// --- Doctor Revenue ---
export async function getDoctorRevenue(params: { from: string, to: string }) {
  return [
    { doctorId: "DR-001", doctorName: "Dr. Arvind Mehta", department: "Cardiology", totalRevenueGenerated: 1600000, averageSharePercentage: 20, hospitalShareAmount: 1280000, doctorShareAmount: 320000 },
    { doctorId: "DR-002", doctorName: "Dr. Sunita Sharma", department: "Gynecology", totalRevenueGenerated: 1100000, averageSharePercentage: 25, hospitalShareAmount: 825000, doctorShareAmount: 275000 },
    { doctorId: "DR-003", doctorName: "Dr. Rajesh Kumar", department: "Orthopedics", totalRevenueGenerated: 1930000, averageSharePercentage: 20, hospitalShareAmount: 1544000, doctorShareAmount: 386000 },
    { doctorId: "DR-004", doctorName: "Dr. Priya Patel", department: "Pediatrics", totalRevenueGenerated: 840000, averageSharePercentage: 15, hospitalShareAmount: 714000, doctorShareAmount: 126000 },
    { doctorId: "DR-005", doctorName: "Dr. Amit Singh", department: "General Surgery", totalRevenueGenerated: 1350000, averageSharePercentage: 25, hospitalShareAmount: 1012500, doctorShareAmount: 337500 }
  ]
}
