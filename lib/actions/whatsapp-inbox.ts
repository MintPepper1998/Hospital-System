"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getConversationMessages(conversationId: string) {
  try {
    const messages = await prisma.whatsAppMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }
    })
    
    return {
      success: true,
      data: messages.map(m => ({
        ...m,
        createdAt: m.createdAt.toISOString()
      }))
    }
  } catch (error) {
    console.error("Failed to fetch messages:", error)
    return { success: false, error: "Failed to fetch messages" }
  }
}

export async function sendInboxMessage(conversationId: string, content: string) {
  try {
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: conversationId }
    })

    if (!conversation) {
      return { success: false, error: "Conversation not found" }
    }

    // Save outbound message to DB
    const newMessage = await prisma.whatsAppMessage.create({
      data: {
        conversationId,
        direction: "OUTBOUND",
        type: "TEXT",
        content,
        status: "SENT" // Assuming sent initially
      }
    })

    // In a real 2026 app, you would call the Meta Cloud API here:
    // await axios.post(`https://graph.facebook.com/v17.0/${PHONE_ID}/messages`, {
    //   messaging_product: "whatsapp",
    //   to: conversation.phone,
    //   type: "text",
    //   text: { body: content }
    // }, { headers: { Authorization: `Bearer ${META_TOKEN}` } })

    // Update conversation timestamp
    await prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    })

    revalidatePath("/dashboard/whatsapp/inbox")

    return {
      success: true,
      data: {
        ...newMessage,
        createdAt: newMessage.createdAt.toISOString()
      }
    }
  } catch (error) {
    console.error("Failed to send message:", error)
    return { success: false, error: "Failed to send message" }
  }
}
