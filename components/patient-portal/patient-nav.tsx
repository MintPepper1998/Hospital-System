"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState } from "react"
import {
  LayoutDashboard, Calendar, FileText, FlaskConical,
  Receipt, LogOut, Menu, X, ChevronRight, HeartPulse,
} from "lucide-react"
import { cn } from "@/lib/utils"
import Image from "next/image"

const navItems = [
  { label: "Dashboard", href: "/dashboard/patient-portal", icon: LayoutDashboard },
  { label: "Appointments", href: "/dashboard/patient-portal/appointments", icon: Calendar },
  { label: "Records", href: "/dashboard/patient-portal/records", icon: FileText },
  { label: "Lab Reports", href: "/dashboard/patient-portal/labs", icon: FlaskConical },
  { label: "Billing", href: "/dashboard/patient-portal/billing", icon: Receipt },
]

interface PatientPortalNavProps {
  patientName: string
  patientDisplayId: string
  userEmail: string
}

export function PatientPortalNav({ patientName, patientDisplayId, userEmail }: PatientPortalNavProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  function isActive(href: string) {
    if (href === "/dashboard/patient-portal") return pathname === href
    return pathname.startsWith(href)
  }

  return (
    <>
      <header className="skn-header">
        <div className="skn-inner">
          {/* Brand */}
          <Link href="/dashboard/patient-portal" className="skn-brand">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm transition-all duration-300">
              <Image src="/shree-kamal-logo.png" alt="Shree Kamal Hospital" width={80} height={80} className="skn-brand-logo" />
            </div>
            <div className="skn-brand-text">
              <span className="skn-brand-name">Shree Kamal</span>
              <span className="skn-brand-sub">Patient Portal</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="skn-desktop">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("skn-link", active && "skn-link--active")}
                >
                  <Icon className="skn-link-icon" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Right */}
          <div className="skn-right">
            <div className="skn-user-info">
              <span className="skn-user-name">{patientName}</span>
              <span className="skn-user-id">{patientDisplayId}</span>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="skn-logout" title="Sign out">
              <LogOut className="skn-logout-icon" />
            </button>
            <button className="skn-hamburger" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="skn-hamburger-icon" /> : <Menu className="skn-hamburger-icon" />}
            </button>
          </div>
        </div>

        {/* Accent bar */}
        <div className="skn-accent" />

        {/* Mobile */}
        {mobileOpen && (
          <nav className="skn-mobile">
            <div className="skn-mobile-user">
              <p className="skn-mobile-name">{patientName}</p>
              <p className="skn-mobile-id">{patientDisplayId}</p>
            </div>
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              return (
                <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                  className={cn("skn-mobile-link", active && "skn-mobile-link--active")}>
                  <Icon className="skn-mobile-link-icon" /><span>{item.label}</span>
                  <ChevronRight className="skn-mobile-arrow" />
                </Link>
              )
            })}
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="skn-mobile-logout">
              <LogOut className="skn-mobile-link-icon" />Sign Out
            </button>
          </nav>
        )}
      </header>

      <style>{`
        .skn-header {
          position: sticky; top: 0; z-index: 40;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: none;
        }
        .skn-accent {
          height: 3px;
          background: linear-gradient(90deg, #0a3d6b, #00b4a0, #e63946);
        }
        .skn-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.25rem;
          height: 58px;
        }


        .skn-brand { display: flex; align-items: center; gap: 0.6rem; text-decoration: none; }
        .skn-brand-logo { width: 38px; height: auto; }
        .skn-brand-text { display: flex; flex-direction: column; }
        .skn-brand-name {
          font-family: var(--font-playfair), Georgia, serif;
          font-size: 0.85rem; font-weight: 700;
          color: #0a3d6b; line-height: 1.1;
        }
        .skn-brand-sub {
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.62rem; font-weight: 500;
          color: #00b4a0; letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .skn-desktop { display: none; align-items: center; gap: 0.125rem; }
        @media (min-width: 768px) { .skn-desktop { display: flex; } }
        .skn-link {
          display: flex; align-items: center; gap: 0.35rem;
          padding: 0.4rem 0.7rem; border-radius: 8px;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 0.76rem; font-weight: 500;
          color: #64748b; text-decoration: none;
          transition: color 0.2s, background 0.2s;
        }
        .skn-link:hover { color: #0a3d6b; background: #f0f8ff; }
        .skn-link--active { color: #0a3d6b !important; background: #e0f7f4 !important; font-weight: 600; }
        .skn-link-icon { width: 15px; height: 15px; }

        .skn-right { display: flex; align-items: center; gap: 0.6rem; }
        .skn-user-info { display: none; flex-direction: column; text-align: right; }
        @media (min-width: 1024px) { .skn-user-info { display: flex; } }
        .skn-user-name { font-size: 0.78rem; font-weight: 500; color: #334155; line-height: 1.2; }
        .skn-user-id { font-size: 0.62rem; color: #00b4a0; }

        .skn-logout {
          display: none; padding: 0.35rem; border-radius: 8px;
          background: #f8fafc; border: 1px solid #e2e8f0;
          cursor: pointer; transition: background 0.2s, border-color 0.2s;
        }
        @media (min-width: 768px) { .skn-logout { display: flex; } }
        .skn-logout:hover { background: #fef2f2; border-color: #fca5a5; }
        .skn-logout-icon { width: 15px; height: 15px; color: #94a3b8; }
        .skn-logout:hover .skn-logout-icon { color: #e63946; }

        .skn-hamburger {
          display: flex; padding: 0.35rem; background: none;
          border: none; cursor: pointer; color: #64748b;
        }
        @media (min-width: 768px) { .skn-hamburger { display: none; } }
        .skn-hamburger-icon { width: 22px; height: 22px; }

        .skn-mobile {
          display: flex; flex-direction: column;
          padding: 0.5rem 1rem 1rem;
          background: #ffffff;
          border-top: 1px solid #f1f5f9;
          animation: sknSlide 0.25s ease;
        }
        @keyframes sknSlide { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        @media (min-width: 768px) { .skn-mobile { display: none; } }
        .skn-mobile-user { padding: 0.5rem 0; margin-bottom: 0.5rem; border-bottom: 1px solid #f1f5f9; }
        .skn-mobile-name { font-size: 0.85rem; font-weight: 600; color: #0a3d6b; margin: 0; }
        .skn-mobile-id { font-size: 0.7rem; color: #00b4a0; margin: 0.125rem 0 0; }
        .skn-mobile-link {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.6rem 0.4rem; border-radius: 8px;
          font-size: 0.82rem; font-weight: 500;
          color: #64748b; text-decoration: none; transition: background 0.2s;
        }
        .skn-mobile-link:hover { background: #f8fafc; }
        .skn-mobile-link--active { color: #0a3d6b; background: #e0f7f4; }
        .skn-mobile-link-icon { width: 18px; height: 18px; flex-shrink: 0; }
        .skn-mobile-arrow { width: 14px; height: 14px; margin-left: auto; opacity: 0.25; }
        .skn-mobile-logout {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.6rem 0.4rem; margin-top: 0.5rem;
          border-top: 1px solid #f1f5f9;
          font-size: 0.82rem; font-weight: 500;
          color: #e63946; background: none; border-left: none;
          border-right: none; border-bottom: none;
          border-radius: 8px; cursor: pointer; width: 100%;
          transition: background 0.2s;
        }
        .skn-mobile-logout:hover { background: #fef2f2; }
      `}</style>
    </>
  )
}
