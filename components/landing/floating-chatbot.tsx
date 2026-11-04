"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  MessageCircle,
  X,
  Send,
  Calendar,
  UserSearch,
  Siren,
  FileText,
  Phone,
  Video,
  Bot,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

const quickActions = [
  {
    icon: Calendar,
    label: "Book Appointment",
    href: "/book-appointment",
    color: "bg-[#E6F7F6] text-[#13A89E] hover:bg-[#D0F0ED]",
  },
  {
    icon: UserSearch,
    label: "Find a Doctor",
    href: "/find-doctor",
    color: "bg-blue-50 text-blue-600 hover:bg-blue-100",
  },
  {
    icon: Video,
    label: "Video Consult",
    href: "/video-consult",
    color: "bg-purple-50 text-purple-600 hover:bg-purple-100",
  },
  {
    icon: FileText,
    label: "Health Checkup",
    href: "/health-checkup",
    color: "bg-amber-50 text-amber-600 hover:bg-amber-100",
  },
  {
    icon: Phone,
    label: "Call Hospital",
    href: "tel:1066",
    color: "bg-cyan-50 text-cyan-600 hover:bg-cyan-100",
  },
  {
    icon: Siren,
    label: "Emergency",
    href: "tel:1066",
    color: "bg-red-50 text-red-600 hover:bg-red-100",
  },
]

const faqs = [
  "What are your visiting hours?",
  "How do I get my reports?",
  "What insurance do you accept?",
  "How to cancel appointment?",
]

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")

  return (
    <>
      {/* Chatbot Panel */}
      <div
        className={cn(
          "fixed z-50 transition-all duration-300 ease-in-out",
          "bottom-20 md:bottom-6 right-4",
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <Card className="w-[340px] shadow-2xl shadow-black/15 border-0 overflow-hidden rounded-3xl">
          {/* Header */}
          <CardHeader className="bg-gradient-to-r from-[#0B2545] to-[#1B3A5C] text-white p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-[#13A89E]/20 rounded-2xl p-2">
                  <Bot className="h-6 w-6 text-[#13A89E]" />
                </div>
                <div>
                  <CardTitle className="text-lg">Kamal Assist</CardTitle>
                  <p className="text-xs text-white/60">
                    24/7 Healthcare Support
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/10 h-8 w-8 rounded-xl"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Welcome Message */}
            <div className="p-4 bg-[#F7F8FA] border-b border-[#E5E7EB]">
              <div className="flex gap-3">
                <div className="bg-[#0B2545] rounded-xl p-1.5 h-fit">
                  <Bot className="h-4 w-4 text-[#13A89E]" />
                </div>
                <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm text-sm border border-[#E5E7EB]">
                  <p className="text-[#1A1A2E]">
                    Hello! 👋 I&apos;m Kamal Assist. How can I help you today?
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4">
              <p className="text-xs font-semibold text-[#6B7280] uppercase mb-3 tracking-wider">
                Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={cn(
                      "flex items-center gap-2 p-2.5 rounded-xl transition-colors",
                      action.color
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <action.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{action.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* FAQs */}
            <div className="p-4 border-t border-[#E5E7EB]">
              <p className="text-xs font-semibold text-[#6B7280] uppercase mb-3 tracking-wider">
                Frequently Asked
              </p>
              <div className="space-y-1">
                {faqs.map((faq) => (
                  <button
                    key={faq}
                    className="w-full flex items-center justify-between p-2.5 text-left text-sm text-[#1A1A2E] hover:bg-[#F7F8FA] rounded-xl transition-colors group"
                    onClick={() => setMessage(faq)}
                  >
                    <span>{faq}</span>
                    <ChevronRight className="h-4 w-4 text-[#D1D5DB] group-hover:text-[#13A89E] group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#E5E7EB] bg-[#F7F8FA]">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your question..."
                  className="flex-1 bg-white rounded-xl border-[#E5E7EB]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && message.trim()) {
                      setMessage("")
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="bg-[#13A89E] hover:bg-[#0F8C84] rounded-xl"
                  disabled={!message.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[10px] text-[#9CA3AF] mt-2 text-center">
                Powered by Shree Kamal Hospital
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed z-50 transition-all duration-300",
          "bottom-20 md:bottom-6 right-4",
          "bg-[#13A89E] text-white",
          "rounded-2xl p-4 shadow-lg shadow-[#13A89E]/30 hover:shadow-xl hover:shadow-[#13A89E]/40",
          "hover:scale-105 active:scale-95",
          isOpen && "opacity-0 pointer-events-none scale-75"
        )}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] font-bold">
          1
        </span>
      </button>
    </>
  )
}
