import { prisma } from "@/lib/prisma"
import { InboxClient } from "./inbox-client"

export default async function WhatsAppInboxPage() {
  // Fetch conversations with latest message
  const conversations = await prisma.whatsAppConversation.findMany({
    include: {
      patient: {
        select: {
          id: true,
          user: { select: { name: true } }
        }
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    orderBy: { updatedAt: 'desc' }
  })

  // Serialize dates and prepare data for client
  const serializedConversations = conversations.map(c => ({
    id: c.id,
    phone: c.phone,
    status: c.status,
    patientName: c.patient?.user?.name || "Unknown Patient",
    lastMessage: c.messages[0]?.content || "No messages",
    lastMessageTime: c.messages[0]?.createdAt.toISOString() || c.updatedAt.toISOString(),
    updatedAt: c.updatedAt.toISOString()
  }))

  return (
    <InboxClient initialConversations={serializedConversations} />
  )
}
