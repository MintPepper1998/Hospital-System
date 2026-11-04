export const dynamic = "force-dynamic"

import { requireAuthSafe } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CasualtyRegisterClient } from "./casualty-register-client"

export const metadata = {
  title: "Register & Admit Patient — Casualty — Shree Kamal Hospital",
}

export default async function CasualtyRegisterPage() {
  const authResult = await requireAuthSafe([
    "SUPER_ADMIN", "ADMIN", "DOCTOR", "NURSE", "RECEPTIONIST",
  ])
  if (!authResult.ok) redirect("/login")

  const doctors = await prisma.staff.findMany({
    where: { user: { role: "DOCTOR", isActive: true } },
    include: { user: true },
  })

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <CasualtyRegisterClient doctors={JSON.parse(JSON.stringify(doctors))} />
    </div>
  )
}
