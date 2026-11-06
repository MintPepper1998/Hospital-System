"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function getAutomationRules() {
  try {
    const rules = await prisma.whatsAppAutomationRule.findMany({
      orderBy: { eventName: 'asc' }
    })
    
    return {
      success: true,
      data: rules.map(r => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString()
      }))
    }
  } catch (error) {
    console.error("Failed to fetch rules:", error)
    return { success: false, error: "Failed to fetch rules" }
  }
}

export async function upsertAutomationRule(data: { eventName: string, isActive: boolean, templateId: string, delayMinutes: number }) {
  try {
    const rule = await prisma.whatsAppAutomationRule.upsert({
      where: { eventName: data.eventName },
      update: {
        isActive: data.isActive,
        templateId: data.templateId,
        delayMinutes: data.delayMinutes
      },
      create: {
        eventName: data.eventName,
        isActive: data.isActive,
        templateId: data.templateId,
        delayMinutes: data.delayMinutes
      }
    })

    revalidatePath("/dashboard/whatsapp/automations")

    return {
      success: true,
      message: "Automation rule updated",
      data: {
        ...rule,
        createdAt: rule.createdAt.toISOString(),
        updatedAt: rule.updatedAt.toISOString()
      }
    }
  } catch (error) {
    console.error("Failed to update rule:", error)
    return { success: false, error: "Failed to update rule" }
  }
}

export async function triggerAutomation(eventName: string, phone: string, dynamicData: Record<string, string>) {
  // Service function called by other parts of the system
  try {
    const rule = await prisma.whatsAppAutomationRule.findUnique({
      where: { eventName }
    })

    if (!rule || !rule.isActive || !rule.templateId) return { success: false, reason: "Rule inactive or not found" }

    // In 2026 real app: Call Meta API using rule.templateId
    // Delay logic using Redis/RabbitMQ or setTimeout if < 5 mins
    console.log(`[AUTOMATION TRIGGERED] Event: ${eventName}, To: ${phone}, Template: ${rule.templateId}`)

    // Create log
    await prisma.whatsAppLog.create({
      data: {
        phone,
        templateName: rule.templateId,
        language: "en",
        category: "REMINDER",
        status: "SENT",
        params: {},
        messageId: `auto-${Date.now()}`
      }
    })

    return { success: true }
  } catch (error) {
    console.error("Failed to trigger automation:", error)
    return { success: false, error: "System error" }
  }
}
