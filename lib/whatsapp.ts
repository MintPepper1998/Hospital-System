"use server"

import { prisma } from "@/lib/prisma"

/**
 * ============================================================
 * WhatsApp Business API Service (Meta Cloud API — FREE Tier)
 * ============================================================
 * 
 * Centralized service for sending WhatsApp messages via Meta's
 * official Cloud API. First 1,000 service conversations/month
 * are FREE — no third-party middleman required.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Meta Developer account at https://developers.facebook.com
 * 2. Create a Business app → Add WhatsApp product
 * 3. Go to Business Settings → System Users → Create System User (Admin)
 * 4. Generate a permanent token with permissions:
 *    - whatsapp_business_messaging
 *    - whatsapp_business_management
 * 5. Copy your Phone Number ID from WhatsApp → API Setup
 * 6. Add credentials in Admin → Hospital Settings → WhatsApp Notifications
 *    OR set env vars: META_WA_ACCESS_TOKEN, META_WA_PHONE_NUMBER_ID
 * 
 * TEMPLATE REGISTRATION:
 * Create templates in WhatsApp Manager → Message Templates:
 * - booking_received, booking_confirmed, booking_rejected
 * - bill_generated, lab_result_ready, appointment_reminder
 * 
 * Each template must be approved by Meta before use.
 * Approval typically takes a few minutes for standard templates.
 */

// ============================================
// TYPES
// ============================================

export type WhatsAppCategory = "BOOKING" | "BILLING" | "LAB_RESULT" | "REMINDER"
export type WhatsAppStatus = "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED"

interface SendWhatsAppParams {
  phone: string               // 10-digit Indian number (no country code)
  templateName: string        // Meta-approved template name
  params: Record<string, string> // Template variables {{ 1 }}, {{ 2 }}, etc.
  category: WhatsAppCategory
  referenceId?: string        // appointmentId, billId, labRequestId, etc.
  language?: string           // Override: "en", "hi", "or" (Odia)
  media?: {                   // Optional media attachment (image/document)
    type: "image" | "document"
    base64Data: string        // Base64 encoded string
    mimeType: string          // e.g. "image/png" or "application/pdf"
    filename?: string         // Optional filename
  }
}

interface WhatsAppConfig {
  enabled: boolean
  accessToken: string | null    // Meta permanent access token (System User)
  phoneNumberId: string | null  // Meta Phone Number ID
  defaultLang: string
}

// Meta Cloud API version — update periodically
const META_API_VERSION = "v21.0"

// ============================================
// CONFIG LOADER
// ============================================

/**
 * Load WhatsApp config from DB (HospitalSettings) with env var fallback.
 * DB settings take priority over env vars.
 * 
 * DB field mapping:
 *   whatsappAuthKey        → Meta permanent access token
 *   whatsappBusinessNumber → Meta Phone Number ID
 */
async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  try {
    const settings = await prisma.hospitalSettings.findUnique({
      where: { id: 1 },
      select: {
        whatsappEnabled: true,
        whatsappAuthKey: true,
        whatsappBusinessNumber: true,
        whatsappDefaultLang: true,
      },
    })

    return {
      enabled: settings?.whatsappEnabled ?? (process.env.WHATSAPP_ENABLED === "true"),
      accessToken: settings?.whatsappAuthKey || process.env.META_WA_ACCESS_TOKEN || null,
      phoneNumberId: settings?.whatsappBusinessNumber || process.env.META_WA_PHONE_NUMBER_ID || null,
      defaultLang: settings?.whatsappDefaultLang || "en",
    }
  } catch {
    // Fallback to env vars if DB read fails
    return {
      enabled: process.env.WHATSAPP_ENABLED === "true",
      accessToken: process.env.META_WA_ACCESS_TOKEN || null,
      phoneNumberId: process.env.META_WA_PHONE_NUMBER_ID || null,
      defaultLang: "en",
    }
  }
}

// ============================================
// MEDIA UPLOAD
// ============================================

/**
 * Uploads media to Meta's servers and returns the media ID.
 * The base64Data should not include the data URL prefix (e.g. 'data:image/png;base64,').
 */
async function uploadWhatsAppMedia(
  config: WhatsAppConfig,
  media: NonNullable<SendWhatsAppParams["media"]>
): Promise<string> {
  if (!config.accessToken || !config.phoneNumberId) {
    throw new Error("Missing credentials for media upload")
  }

  // Convert Base64 to Blob/Buffer
  const base64Data = media.base64Data.replace(/^data:([A-Za-z-+\/]+);base64,/, "")
  const buffer = Buffer.from(base64Data, "base64")
  const blob = new Blob([buffer], { type: media.mimeType })

  const formData = new FormData()
  formData.append("messaging_product", "whatsapp")
  formData.append("file", blob, media.filename || `file-${Date.now()}`)

  const url = `https://graph.facebook.com/${META_API_VERSION}/${config.phoneNumberId}/media`

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      // Do not set Content-Type, fetch will automatically set it with the boundary for FormData
    },
    body: formData,
  })

  const responseText = await response.text()
  let responseData: any = {}
  try {
    responseData = JSON.parse(responseText)
  } catch {
    responseData = { raw: responseText }
  }

  if (response.ok && responseData.id) {
    return responseData.id
  } else {
    const errorMsg = responseData?.error?.message || `HTTP ${response.status}`
    throw new Error(`Media upload failed: ${errorMsg}`)
  }
}

// ============================================
// CORE SENDER
// ============================================

/**
 * Send a WhatsApp template message via Meta Cloud API.
 * 
 * - Checks if WhatsApp is enabled in settings
 * - Logs every attempt to the WhatsAppLog table
 * - Gracefully handles failures (never crashes the parent action)
 * 
 * Meta Cloud API docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
 */
export async function sendWhatsAppTemplate(data: SendWhatsAppParams): Promise<{
  success: boolean
  messageId?: string
  message: string
}> {
  const config = await getWhatsAppConfig()
  const lang = data.language || config.defaultLang || "en"
  const fullPhone = `91${data.phone.replace(/\D/g, "").slice(-10)}`

  // ── GATE 1: Is WhatsApp enabled? ──
  if (!config.enabled) {
    await logMessage({
      phone: data.phone,
      templateName: data.templateName,
      language: lang,
      category: data.category,
      params: data.params,
      status: "SKIPPED",
      errorMessage: "WhatsApp notifications are disabled",
      referenceId: data.referenceId,
    })
    console.log(`[WHATSAPP] ⏭️ Skipped (disabled): ${data.templateName} → ${data.phone}`)
    return { success: true, message: "WhatsApp notifications are disabled — skipped" }
  }

  // ── GATE 2: Are credentials configured? ──
  if (!config.accessToken || !config.phoneNumberId) {
    await logMessage({
      phone: data.phone,
      templateName: data.templateName,
      language: lang,
      category: data.category,
      params: data.params,
      status: "FAILED",
      errorMessage: "Meta Cloud API credentials not configured (access token or phone number ID missing)",
      referenceId: data.referenceId,
    })
    console.warn(`[WHATSAPP] ⚠️ Credentials missing for: ${data.templateName} → ${data.phone}`)
    return { success: false, message: "WhatsApp credentials not configured" }
  }

  // ── SEND VIA META CLOUD API ──
  try {
    // Build Meta template components array
    // Each param becomes a positional body parameter: {{1}}, {{2}}, etc.
    const paramValues = Object.values(data.params)
    const bodyParameters = paramValues.map((val) => ({
      type: "text" as const,
      text: String(val),
    }))

    // Build components array
    const components: any[] = []

    // Process Media Attachment (image header)
    if (data.media) {
      try {
        const mediaId = await uploadWhatsAppMedia(config, data.media)
        components.push({
          type: "header",
          parameters: [
            {
              type: data.media.type,
              [data.media.type]: {
                id: mediaId
              }
            }
          ]
        })
      } catch (mediaErr: any) {
        // If media upload fails, continue without header — template header is optional
        console.warn(`[WHATSAPP] ⚠️ Media upload failed, sending without image: ${mediaErr.message}`)
      }
    }

    // Process Body Parameters
    if (bodyParameters.length > 0) {
      components.push({
        type: "body",
        parameters: bodyParameters
      })
    }

    const payload: Record<string, any> = {
      messaging_product: "whatsapp",
      to: fullPhone,
      type: "template",
      template: {
        name: data.templateName,
        language: { code: lang },
        components,
      },
    }

    const apiUrl = `https://graph.facebook.com/${META_API_VERSION}/${config.phoneNumberId}/messages`

    // Debug: Log the exact payload being sent
    console.log(`[WHATSAPP] 📤 Sending ${data.templateName} (${lang}) → ${fullPhone}`)
    console.log(`[WHATSAPP] 📋 Payload:`, JSON.stringify(payload, null, 2))

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    let responseData: any = {}
    try {
      responseData = JSON.parse(responseText)
    } catch {
      responseData = { raw: responseText }
    }

    if (response.ok) {
      // Meta returns: { messaging_product: "whatsapp", contacts: [...], messages: [{ id: "wamid.xxx" }] }
      const messageId = responseData?.messages?.[0]?.id || "unknown"

      await logMessage({
        phone: data.phone,
        templateName: data.templateName,
        language: lang,
        category: data.category,
        params: data.params,
        status: "SENT",
        messageId: String(messageId),
        referenceId: data.referenceId,
      })

      console.log(`[WHATSAPP] ✅ Sent: ${data.templateName} → ${fullPhone} (ID: ${messageId})`)
      return { success: true, messageId: String(messageId), message: "Message sent successfully" }
    } else {
      // Meta error format: { error: { message: "...", type: "...", code: ..., fbtrace_id: "..." } }
      const metaError = responseData?.error
      const errorMsg = metaError
        ? `[${metaError.code}] ${metaError.message}` 
        : `HTTP ${response.status}: ${responseText.substring(0, 200)}`

      await logMessage({
        phone: data.phone,
        templateName: data.templateName,
        language: lang,
        category: data.category,
        params: data.params,
        status: "FAILED",
        errorMessage: errorMsg,
        referenceId: data.referenceId,
      })

      console.error(`[WHATSAPP] ❌ Failed: ${data.templateName} → ${fullPhone}: ${errorMsg}`)
      return { success: false, message: errorMsg }
    }
  } catch (error: any) {
    const errorMsg = error.message || "Unknown error during WhatsApp API call"

    await logMessage({
      phone: data.phone,
      templateName: data.templateName,
      language: lang,
      category: data.category,
      params: data.params,
      status: "FAILED",
      errorMessage: errorMsg,
      referenceId: data.referenceId,
    })

    console.error(`[WHATSAPP] 💥 Exception: ${data.templateName} → ${data.phone}: ${errorMsg}`)
    return { success: false, message: errorMsg }
  }
}

// ============================================
// AUDIT LOGGER
// ============================================

async function logMessage(data: {
  phone: string
  templateName: string
  language: string
  category: string
  params: Record<string, string>
  status: WhatsAppStatus
  messageId?: string
  errorMessage?: string
  referenceId?: string
}) {
  try {
    await prisma.whatsAppLog.create({
      data: {
        phone: data.phone,
        templateName: data.templateName,
        language: data.language,
        category: data.category,
        params: data.params as any,
        status: data.status,
        messageId: data.messageId || null,
        errorMessage: data.errorMessage || null,
        referenceId: data.referenceId || null,
      },
    })
  } catch (err) {
    // Never let logging failures crash the parent action
    console.error("[WHATSAPP_LOG] Failed to write audit log:", err)
  }
}

// ============================================
// CONVENIENCE HELPERS (for future use)
// ============================================

/**
 * Send a bill notification to a patient
 * (Call this from billing actions when ready)
 */
export async function sendBillNotification(data: {
  phone: string
  patientName: string
  billNumber: string
  amount: string
  date: string
  referenceId?: string
  mediaBase64?: string
}) {
  // Parameters MUST be in the exact order the template expects:
  // {{1}} = patientName, {{2}} = billNumber, {{3}} = amount, {{4}} = date
  return sendWhatsAppTemplate({
    phone: data.phone,
    templateName: "bill_generated",
    language: "en",
    params: {
      "1": data.patientName,
      "2": data.billNumber,
      "3": data.amount,
      "4": data.date,
    },
    category: "BILLING",
    referenceId: data.referenceId,
    // Template requires an image header — always include it
    ...(data.mediaBase64 ? {
      media: {
        type: "image" as const,
        base64Data: data.mediaBase64,
        mimeType: "image/png",
        filename: `bill-${data.billNumber}.png`
      }
    } : {}),
  })
}

/**
 * Send a lab result notification to a patient
 * (Call this from lab workflow when ready)
 */
export async function sendLabResultNotification(data: {
  phone: string
  patientName: string
  testName: string
  date: string
  referenceId?: string
}) {
  return sendWhatsAppTemplate({
    phone: data.phone,
    templateName: "lab_result_ready",
    params: {
      patientName: data.patientName,
      testName: data.testName,
      date: data.date,
    },
    category: "LAB_RESULT",
    referenceId: data.referenceId,
  })
}

/**
 * Send an appointment reminder to a patient
 * (Call this from a scheduled job when ready)
 */
export async function sendAppointmentReminder(data: {
  phone: string
  patientName: string
  date: string
  time: string
  doctorName: string
  referenceId?: string
}) {
  return sendWhatsAppTemplate({
    phone: data.phone,
    templateName: "appointment_reminder",
    params: {
      patientName: data.patientName,
      date: data.date,
      time: data.time,
      doctorName: data.doctorName,
    },
    category: "REMINDER",
    referenceId: data.referenceId,
  })
}

/**
 * Send a discharge summary notification to a patient.
 * Called automatically from processDischarge() after successful discharge.
 */
export async function sendDischargeNotification(data: {
  phone: string
  patientName: string
  dischargeDate: string
  diagnosis: string
  followUpDate: string
  medications: string
  referenceId?: string
}) {
  return sendWhatsAppTemplate({
    phone: data.phone,
    templateName: "discharge_summary",
    params: {
      "1": data.patientName,
      "2": data.dischargeDate,
      "3": data.diagnosis || "As discussed with doctor",
      "4": data.followUpDate || "As advised by doctor",
      "5": data.medications || "As per prescription",
    },
    category: "BILLING",
    referenceId: data.referenceId,
  })
}

/**
 * Send a surgery day alert to the patient (evening before surgery).
 * Called from the cron job for tomorrow's scheduled surgeries.
 */
export async function sendSurgeryDayAlert(data: {
  phone: string
  patientName: string
  procedureName: string
  surgeryDate: string
  surgeryTime: string
  theaterName: string
  surgeonName: string
  referenceId?: string
}) {
  return sendWhatsAppTemplate({
    phone: data.phone,
    templateName: "surgery_day_alert",
    params: {
      "1": data.patientName,
      "2": data.procedureName,
      "3": data.surgeryDate,
      "4": data.surgeryTime,
      "5": data.theaterName,
      "6": data.surgeonName,
    },
    category: "REMINDER",
    referenceId: data.referenceId,
  })
}
