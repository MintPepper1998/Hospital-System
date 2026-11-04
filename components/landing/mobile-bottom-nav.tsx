"use client"

import Link from "next/link"
import { Home, Calendar, Phone, User } from "lucide-react"

const navItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Calendar, label: "Appointment", href: "/book-appointment" },
  { icon: Phone, label: "Emergency", href: "tel:1066" },
  { icon: User, label: "Login", href: "/login" },
]

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-xl border-t border-[#E5E7EB] shadow-[0_-4px_24px_rgba(11,37,69,0.06)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex flex-col items-center gap-0.5 px-3 py-2 text-[#6B7280] hover:text-[#13A89E] transition-colors"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  )
}
