"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { sendWhatsAppTemplate } from "@/lib/whatsapp"
import { z } from "zod"

const createTemplateSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .regex(/^[a-z0-9_]+$/, "Template name must contain only lowercase English letters, numbers, and underscores (e.g. summer_promo_1)"),
  language: z.string().min(2, "Language code required"),
  category: z.enum(["MARKETING", "UTILITY", "AUTHENTICATION"]),
  body: z.string().min(5, "Template body is required"),
})

export async function createLocalTemplate(data: z.infer<typeof createTemplateSchema>) {
  try {
    const validated = createTemplateSchema.parse(data)
    
    // Check if name already exists
    const existing = await prisma.whatsAppTemplate.findUnique({
      where: { name: validated.name }
    })
    
    if (existing) {
      return { success: false, message: "A template with this name already exists" }
    }

    const template = await prisma.whatsAppTemplate.create({
      data: {
        name: validated.name,
        language: validated.language,
        category: validated.category,
        body: validated.body,
        status: "APPROVED", // Local tracking defaults to APPROVED for simplicity as per feedback
      }
    })

    revalidatePath("/dashboard/whatsapp/templates")
    return { success: true, message: "Template tracked successfully", data: template }
  } catch (error: any) {
    console.error("[createLocalTemplate] Error:", error)
    return { success: false, message: error.message || "Failed to create template" }
  }
}

export async function deleteLocalTemplate(id: string) {
  try {
    await prisma.whatsAppTemplate.delete({ where: { id } })
    revalidatePath("/dashboard/whatsapp/templates")
    return { success: true, message: "Template deleted" }
  } catch (error: any) {
    return { success: false, message: "Failed to delete template" }
  }
}

// ==========================================
// CAMPAIGNS & CONTACTS
// ==========================================

const addContactSchema = z.object({
  name: z.string().optional(),
  phone: z.string().min(10, "Valid 10-digit phone required").max(15),
  tags: z.string().optional(),
})

export async function addMarketingContact(data: z.infer<typeof addContactSchema>) {
  try {
    const validated = addContactSchema.parse(data)
    
    const existing = await prisma.marketingContact.findUnique({
      where: { phone: validated.phone }
    })
    
    if (existing) {
      return { success: false, message: "This phone number is already in your contacts" }
    }

    await prisma.marketingContact.create({
      data: {
        name: validated.name,
        phone: validated.phone,
        tags: validated.tags,
      }
    })

    revalidatePath("/dashboard/whatsapp/campaigns")
    return { success: true, message: "Contact added successfully" }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to add contact" }
  }
}

export async function editMarketingContact(id: string, data: { name?: string; phone?: string }) {
  try {
    if (!id) return { success: false, message: "Contact ID is required" }

    const contact = await prisma.marketingContact.findUnique({ where: { id } })
    if (!contact) return { success: false, message: "Contact not found" }

    // If phone is changing, check for duplicates
    if (data.phone && data.phone !== contact.phone) {
      const existing = await prisma.marketingContact.findUnique({ where: { phone: data.phone } })
      if (existing) return { success: false, message: "This phone number already exists" }
    }

    await prisma.marketingContact.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
      },
    })

    revalidatePath("/dashboard/whatsapp/campaigns")
    return { success: true, message: "Contact updated successfully" }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to update contact" }
  }
}

export async function deleteMarketingContact(id: string) {
  try {
    if (!id) return { success: false, message: "Contact ID is required" }

    await prisma.marketingContact.delete({ where: { id } })

    revalidatePath("/dashboard/whatsapp/campaigns")
    return { success: true, message: "Contact deleted successfully" }
  } catch (error: any) {
    return { success: false, message: error.message || "Failed to delete contact" }
  }
}

export async function sendBulkCampaign(data: {
  templateName: string
  language: string
  category: "MARKETING" | "UTILITY"
  contacts: { phone: string; name: string }[]
}) {
  try {
    if (!data.contacts || data.contacts.length === 0) {
      return { success: false, message: "No contacts provided for the campaign" }
    }

    if (!data.templateName) {
      return { success: false, message: "Template name is required" }
    }

    let successCount = 0
    let failCount = 0

    const template = await prisma.whatsAppTemplate.findUnique({
      where: { name: data.templateName }
    })
    const body = template?.body || ""

    // Send in batches of 5 to avoid overwhelming the outgoing connections
    for (let i = 0; i < data.contacts.length; i += 5) {
      const batch = data.contacts.slice(i, i + 5)
      
      await Promise.all(
        batch.map(async (contact) => {
          const params: Record<string, string> = {}
          // Match all {{n}} patterns and provide a fallback value
          const matches = body.match(/\{\{(\d+)\}\}/g)
          if (matches) {
            matches.forEach(match => {
              const num = match.replace(/[{}]/g, "")
              // Standard assumption: {{1}} is usually the name
              if (num === "1") params[num] = contact.name || "Patient"
              else params[num] = "Value" // Fallback for other unknowns
            })
          }

          const result = await sendWhatsAppTemplate({
            phone: contact.phone,
            templateName: data.templateName,
            language: data.language,
            category: data.category as any,
            params, 
          })
          
          if (result.success) {
            successCount++
          } else {
            failCount++
          }
        })
      )
    }

    return { 
      success: true, 
      message: `Campaign complete! Successfully sent to ${successCount} numbers. Failed: ${failCount}.` 
    }
  } catch (error: any) {
    console.error("[sendBulkCampaign] Error:", error)
    return { success: false, message: error.message || "Failed to execute campaign" }
  }
}