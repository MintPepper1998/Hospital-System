import { NextResponse, NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * ============================================================
 * WhatsApp Webhook Endpoint — Meta Cloud API
 * ============================================================
 *
 * This route receives TWO types of requests from Meta:
 *
 * 1. GET  — Webhook verification (one-time handshake)
 *    Meta sends: hub.mode, hub.verify_token, hub.challenge
 *    We validate the token and echo back the challenge.
 *
 * 2. POST — Real-time event notifications
 *    Meta sends inbound messages, delivery receipts, etc.
 *    We parse and save them to the WhatsAppConversation/Message tables.
 *
 * CONFIG:
 *   Set WHATSAPP_WEBHOOK_VERIFY_TOKEN in your .env file.
 *   This token is chosen BY YOU — it just needs to match what
 *   you paste in the Meta Developer Dashboard.
 */

// Verification token — must match what you enter in Meta Dashboard
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "shree_kamal_whatsapp_2026"

// ─── GET: Webhook Verification ──────────────────────────────
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode")
  const token = req.nextUrl.searchParams.get("hub.verify_token")
  const challenge = req.nextUrl.searchParams.get("hub.challenge")

  console.log("[WEBHOOK] Verification request — mode:", mode, "| tokenMatch:", token === VERIFY_TOKEN)

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WEBHOOK] ✅ Verification successful")
    return new NextResponse(challenge, { status: 200 })
  } else {
    console.warn("[WEBHOOK] ❌ Verification failed")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
}

// ─── POST: Receive Inbound Messages & Status Updates ────────
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ── TEMPORARY DEBUG: Save the raw payload ──
    try {
      let debugConversation = await prisma.whatsAppConversation.findUnique({
        where: { phone: "9999999999" }
      })
      if (!debugConversation) {
        debugConversation = await prisma.whatsAppConversation.create({
          data: { phone: "9999999999", status: "OPEN" }
        })
      }
      await prisma.whatsAppMessage.create({
        data: {
          conversationId: debugConversation.id,
          direction: "INBOUND",
          type: "TEXT",
          content: JSON.stringify(body).slice(0, 1000), // Save first 1000 chars of payload
          status: "RECEIVED"
        }
      })
    } catch (debugErr) {
      console.error("Failed to log debug payload", debugErr)
    }


    // Always respond 200 fast to Meta (they retry on non-200)
    if (body.object !== "whatsapp_business_account") {
      return NextResponse.json({ success: true }, { status: 200 })
    }

    for (const entry of body.entry) {
      for (const change of entry.changes) {
        const value = change.value
        if (!value) continue

        // ── Handle Status Updates (delivered, read, etc.) ──
        if (value.statuses) {
          for (const status of value.statuses) {
            // status.id = wamid, status.status = "delivered" | "read" | "failed"
            // Update the outbound message status in our DB
            try {
              await prisma.whatsAppMessage.updateMany({
                where: { id: status.id },
                data: { status: status.status.toUpperCase() }
              })
            } catch {
              // wamid might not match our DB id — that's fine
            }
          }
        }

        // ── Handle Inbound Messages ──
        if (value.messages) {
          for (const message of value.messages) {
            const phone = message.from // e.g., "919876543210"
            let content = ""
            let mediaUrl: string | null = null

            switch (message.type) {
              case "text":
                content = message.text?.body || ""
                break
              case "button":
                content = message.button?.text || ""
                break
              case "interactive":
                if (message.interactive?.type === "button_reply") {
                  content = message.interactive.button_reply.title
                } else if (message.interactive?.type === "list_reply") {
                  content = message.interactive.list_reply.title
                }
                break
              case "image":
              case "document":
              case "video":
              case "audio":
                content = message[message.type]?.caption || `[${message.type.toUpperCase()}]`
                mediaUrl = message[message.type]?.id || null // This is a Meta media ID
                break
              case "location":
                content = `📍 Location: ${message.location?.latitude}, ${message.location?.longitude}`
                break
              case "reaction":
                content = `Reacted: ${message.reaction?.emoji || "👍"}`
                break
              default:
                content = `[${message.type || "unknown"}]`
            }

            // Find or create conversation
            let conversation = await prisma.whatsAppConversation.findUnique({
              where: { phone }
            })

            if (!conversation) {
              // Try to match with an existing patient by phone
              const patient = await prisma.patient.findFirst({
                where: { phone }
              })

              conversation = await prisma.whatsAppConversation.create({
                data: {
                  phone,
                  patientId: patient?.id || null,
                  status: "OPEN"
                }
              })
            } else if (conversation.status === "CLOSED") {
              // Re-open closed conversations when patient texts again
              await prisma.whatsAppConversation.update({
                where: { id: conversation.id },
                data: { status: "OPEN" }
              })
            }

            // Save the message
            await prisma.whatsAppMessage.create({
              data: {
                conversationId: conversation.id,
                direction: "INBOUND",
                type: message.type?.toUpperCase() || "TEXT",
                content: content || "[Empty]",
                mediaUrl,
                status: "RECEIVED"
              }
            })
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[WEBHOOK] Error processing payload:", error)
    // Always return 200 to Meta — otherwise they'll keep retrying
    return NextResponse.json({ success: true }, { status: 200 })
  }
}
