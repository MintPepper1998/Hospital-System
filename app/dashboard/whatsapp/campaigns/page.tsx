import { prisma } from "@/lib/prisma"
import { CampaignsClient } from "./campaigns-client"

export default async function WhatsAppCampaignsPage() {
  const [patients, contacts, templates] = await Promise.all([
    prisma.patient.findMany({
      select: { id: true, user: { select: { name: true } }, phone: true },
      where: { phone: { not: null } },
    }),
    prisma.marketingContact.findMany({
      where: { optedOut: false },
    }),
    prisma.whatsAppTemplate.findMany({
      where: { status: "APPROVED", category: "MARKETING" },
    }),
  ])

  const combinedAudience = [
    ...patients.filter((p) => p.phone).map((p) => ({
      id: `p-${p.id}`,
      name: p.user?.name || "Unknown Patient",
      phone: p.phone as string,
      type: "PATIENT",
    })),
    ...contacts.map((c) => ({
      id: `c-${c.id}`,
      name: c.name || "Unknown",
      phone: c.phone,
      type: "CONTACT",
    })),
  ]

  const serializedTemplates = templates.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))

  return <CampaignsClient audience={combinedAudience} templates={serializedTemplates} />
}