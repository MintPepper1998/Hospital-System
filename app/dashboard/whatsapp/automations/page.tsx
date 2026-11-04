import { prisma } from "@/lib/prisma"
import { AutomationsClient } from "./automations-client"

export default async function WhatsAppAutomationsPage() {
  const [rules, templates] = await Promise.all([
    prisma.whatsAppAutomationRule.findMany({
      orderBy: { eventName: 'asc' }
    }),
    prisma.whatsAppTemplate.findMany({
      where: { status: 'APPROVED' }
    })
  ])

  const serializedRules = rules.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString()
  }))

  return <AutomationsClient initialRules={serializedRules} templates={templates} />
}
