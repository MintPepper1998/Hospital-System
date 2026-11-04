import { prisma } from "@/lib/prisma"
import { TemplatesClient } from "./templates-client"

export default async function WhatsAppTemplatesPage() {
  const templates = await prisma.whatsAppTemplate.findMany({
    orderBy: { createdAt: "desc" },
  })

  // Serialize dates for client component
  const serialized = templates.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }))

  return <TemplatesClient initialTemplates={serialized} />
}