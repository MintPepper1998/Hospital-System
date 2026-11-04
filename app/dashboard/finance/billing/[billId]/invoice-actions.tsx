"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Printer, Download, ArrowLeft, Send, Loader2, CheckCircle2, X, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { useSearchParams, useRouter } from "next/navigation"
import { sendBillNotification } from "@/lib/whatsapp"
import { toast } from "sonner"

interface InvoiceActionsProps {
  billingData?: {
    billingId: string
    billNumber: string
    patientName: string
    patientPhone: string | null
    grandTotal: number
  }
}

export function InvoiceActions({ billingData }: InvoiceActionsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [showSendPanel, setShowSendPanel] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState(billingData?.patientPhone || "")
  const [isSending, setIsSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (searchParams.get("action") === "print") {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [searchParams])

  // Close panel on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowSendPanel(false)
      }
    }
    if (showSendPanel) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showSendPanel])

  const handlePrint = () => {
    window.print()
  }

  const handleSendBill = async () => {
    if (!phoneNumber || phoneNumber.trim().length < 10) {
      toast.error("Please enter a valid 10-digit phone number")
      return
    }
    if (!billingData) {
      toast.error("Bill data not available")
      return
    }

    setIsSending(true)
    setSendSuccess(false)

    try {
      // Capture the bill as an image — template REQUIRES an image header
      let mediaBase64 = ""
      const billElement = document.querySelector("[data-bill-template]") as HTMLElement
      if (billElement) {
        try {
          const html2canvas = (await import("html2canvas")).default
          const canvas = await html2canvas(billElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
            onclone: (clonedDoc: Document) => {
              // Strip CSS lab()/oklch() color functions that html2canvas can't parse
              const allEls = clonedDoc.querySelectorAll("*")
              allEls.forEach((el) => {
                const htmlEl = el as HTMLElement
                const cs = htmlEl.style
                if (cs.color && (cs.color.includes("lab(") || cs.color.includes("oklch("))) {
                  cs.color = "#000000"
                }
                if (cs.backgroundColor && (cs.backgroundColor.includes("lab(") || cs.backgroundColor.includes("oklch("))) {
                  cs.backgroundColor = "#ffffff"
                }
                if (cs.borderColor && (cs.borderColor.includes("lab(") || cs.borderColor.includes("oklch("))) {
                  cs.borderColor = "#cccccc"
                }
              })
              const styles = clonedDoc.querySelectorAll("style")
              styles.forEach((style) => {
                if (style.textContent) {
                  style.textContent = style.textContent
                    .replace(/lab\([^)]*\)/g, "#000000")
                    .replace(/oklch\([^)]*\)/g, "#000000")
                }
              })
            },
          })
          mediaBase64 = canvas.toDataURL("image/png")
        } catch (err) {
          console.warn("html2canvas failed, generating fallback image:", err)
        }
      }

      // Fallback: generate a simple bill summary image if capture failed
      if (!mediaBase64 || mediaBase64.length < 200) {
        const canvas = document.createElement("canvas")
        canvas.width = 600
        canvas.height = 300
        const ctx = canvas.getContext("2d")
        if (ctx) {
          // White background
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, 600, 300)
          // Header bar
          ctx.fillStyle = "#0066CC"
          ctx.fillRect(0, 0, 600, 50)
          ctx.fillStyle = "#ffffff"
          ctx.font = "bold 20px Arial"
          ctx.fillText("SHREE KAMAL HOSPITAL", 20, 33)
          // Bill details
          ctx.fillStyle = "#333333"
          ctx.font = "bold 16px Arial"
          ctx.fillText("OPD BILL / RECEIPT", 200, 85)
          ctx.font = "14px Arial"
          ctx.fillStyle = "#555555"
          ctx.fillText(`Patient: ${billingData.patientName}`, 30, 120)
          ctx.fillText(`Bill No: ${billingData.billNumber}`, 30, 148)
          ctx.fillText(`Date: ${new Date().toLocaleDateString("en-GB")}`, 30, 176)
          ctx.font = "bold 18px Arial"
          ctx.fillStyle = "#0066CC"
          ctx.fillText(`Total: ₹${billingData.grandTotal.toFixed(2)}`, 30, 216)
          // Footer
          ctx.fillStyle = "#999999"
          ctx.font = "11px Arial"
          ctx.fillText("Thank you for choosing Shree Kamal Hospital", 30, 270)
          mediaBase64 = canvas.toDataURL("image/png")
        }
      }

      const dateStr = new Date().toLocaleDateString("en-GB").replace(/\//g, "-")

      const result = await sendBillNotification({
        phone: phoneNumber.trim(),
        patientName: billingData.patientName,
        billNumber: billingData.billNumber,
        amount: billingData.grandTotal.toFixed(2),
        date: dateStr,
        referenceId: billingData.billingId,
        ...(mediaBase64 && { mediaBase64 }),
      })

      if (result.success) {
        setSendSuccess(true)
        toast.success(`Bill sent to ${phoneNumber}!`)
        setTimeout(() => {
          setSendSuccess(false)
          setShowSendPanel(false)
        }, 2000)
      } else {
        toast.error(result.message || "Failed to send bill")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send bill")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex items-center justify-between print:hidden">
      <button
        onClick={() => router.back()}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Billing
      </button>

      <div className="flex gap-2 items-center relative">
        {/* Send Bill Button */}
        {billingData && (
          <div className="relative" ref={panelRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSendPanel(!showSendPanel)
                setSendSuccess(false)
              }}
              className="text-green-700 hover:text-green-800 hover:bg-green-50 border-green-200"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Send Bill
            </Button>

            {/* Send Panel Dropdown */}
            {showSendPanel && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                      alt="WhatsApp"
                      className="w-5 h-5"
                    />
                    <span className="text-white font-semibold text-sm">Send via WhatsApp</span>
                  </div>
                  <button
                    onClick={() => setShowSendPanel(false)}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-3">
                  {/* Bill Info */}
                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bill No:</span>
                      <span className="font-mono font-semibold">{billingData.billNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Patient:</span>
                      <span className="font-semibold">{billingData.patientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount:</span>
                      <span className="font-bold text-green-700">₹{billingData.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="wa-phone" className="text-xs font-medium">
                      Phone Number
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex items-center bg-gray-100 border rounded-md px-2 text-xs text-muted-foreground shrink-0">
                        +91
                      </div>
                      <Input
                        id="wa-phone"
                        type="tel"
                        placeholder="Enter 10-digit number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        maxLength={10}
                        className="text-sm h-9"
                        autoFocus
                      />
                    </div>
                    {billingData.patientPhone && phoneNumber !== billingData.patientPhone && (
                      <button
                        onClick={() => setPhoneNumber(billingData.patientPhone || "")}
                        className="text-[10px] text-blue-600 hover:underline"
                      >
                        Use patient's number ({billingData.patientPhone})
                      </button>
                    )}
                  </div>

                  {/* Send Button */}
                  <Button
                    className={cn(
                      "w-full",
                      sendSuccess
                        ? "bg-green-600 hover:bg-green-600"
                        : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    )}
                    size="sm"
                    onClick={handleSendBill}
                    disabled={isSending || sendSuccess || phoneNumber.length < 10}
                  >
                    {sendSuccess ? (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Sent Successfully!
                      </>
                    ) : isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Bill
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Invoice
        </Button>
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>
    </div>
  )
}
