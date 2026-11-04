"use server"

import { prisma } from "@/lib/prisma"

export async function getPharmacyAccounts() {
  const accounts = await prisma.financialAccount.findMany({
    where: { scope: "PHARMACY", isActive: true },
    select: { id: true, name: true, type: true, currentBalance: true },
    orderBy: { name: "asc" }
  })
  return accounts
}
