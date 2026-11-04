"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  SquaresFour, 
  CalendarBlank, 
  FileText, 
  Users, 
  Prescription, 
  CreditCard, 
  ChatTeardropText, 
  Gear,
  FirstAidKit,
  List,
  X,
  Clock
} from "@phosphor-icons/react/dist/ssr";

const BASE = "/dashboard/patient-portal";

const navItems = [
  { name: "Dashboard",     icon: SquaresFour,       href: BASE },
  { name: "Appointments",  icon: CalendarBlank,     href: `${BASE}/appointments` },
  { name: "Test Results",  icon: FileText,          href: `${BASE}/labs` },
  { name: "Prescriptions", icon: Prescription,      href: `${BASE}/prescriptions` },
  { name: "Billing",       icon: CreditCard,        href: `${BASE}/billing` },
  { name: "Feedback",      icon: ChatTeardropText,  href: `${BASE}/feedback` },
  { name: "Settings",      icon: Gear,              href: `${BASE}#settings` },
];

export default function PatientSidebar({ receptionist }: { receptionist?: any }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    // Exact match for dashboard home, prefix match for sub-pages
    if (href === BASE) return pathname === BASE;
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* ── Mobile Hamburger Trigger ── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-5 left-4 z-50 w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#1e293b] shadow-lg shadow-black/5 border border-gray-100 lg:hidden active:scale-[0.95] transition-transform"
        aria-label="Open sidebar"
      >
        <List weight="bold" size={20} />
      </button>

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] bg-zinc-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          print:hidden
          fixed inset-y-0 left-0 z-[70] w-[280px] bg-[#f8f9fb] flex flex-col pt-8 pb-6 px-6 border-r border-gray-100
          transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
          lg:static lg:translate-x-0 lg:rounded-l-[40px]
          ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-5 right-4 w-8 h-8 rounded-full bg-zinc-200/60 flex items-center justify-center text-zinc-500 lg:hidden active:scale-[0.93] transition-transform"
          aria-label="Close sidebar"
        >
          <X weight="bold" size={14} />
        </button>
        
        {/* Hospital Branding */}
        <Link href={BASE} className="flex items-center gap-3 mb-10 px-2 group" onClick={() => setMobileOpen(false)}>
          <div className="w-9 h-9 bg-gradient-to-br from-[#1a56db] to-[#0ea5e9] rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <FirstAidKit weight="fill" size={18} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-extrabold text-[#1e293b] tracking-tight">Shree Kamal</span>
            <span className="text-[10px] font-semibold text-[#64748b] tracking-widest uppercase">Hospital</span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-200 font-medium text-sm ${
                  active 
                    ? "bg-[#1a56db] text-white shadow-lg shadow-blue-500/20" 
                    : "text-[#64748b] hover:bg-white hover:text-[#1e293b]"
                }`}
              >
                <item.icon weight={active ? "fill" : "regular"} size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Connect Reception Card */}
        <div className="bg-white rounded-[24px] p-5 mt-8 shadow-sm border border-gray-100">
          <h4 className="text-sm font-bold text-[#1e293b] mb-4">Connect Reception</h4>
          <div className="flex flex-col items-center text-center">
            {/* Receptionist Avatar */}
            <div className="w-14 h-14 rounded-full mb-3 shadow-md border-2 border-white overflow-hidden bg-gradient-to-br from-blue-100 to-blue-50">
              <img 
                src={receptionist?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(receptionist?.name || 'Reception')}&background=e0f2fe&color=0369a1&size=56&bold=true`}
                alt="Receptionist"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <span className="text-sm font-bold text-[#1e293b]">{receptionist?.name || "Hospital Reception"}</span>
            <span className="text-[11px] text-[#64748b] font-medium">Receptionist</span>
            <div className="flex items-center gap-1 text-[10px] text-[#64748b] mt-1.5 mb-4">
              <Clock weight="regular" size={12} />
              Available 24/7
            </div>
            
            <a 
              href={`tel:${receptionist?.phone || '+1234567890'}`}
              className="w-full bg-[#f8f9fb] hover:bg-gray-100 transition-colors text-[#1e293b] text-xs font-semibold py-2.5 rounded-xl border border-gray-200 flex items-center justify-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Call Reception
            </a>
          </div>
        </div>

      </aside>
    </>
  );
}
