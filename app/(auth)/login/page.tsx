"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { authenticate } from "./actions"
import { Loader2, Lock, Mail, ArrowRight, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import "./login.css"

/* ─── Submit Button ─── */
function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className="sk-btn">
      {pending ? (
        <>
          <Loader2 className="sk-spinner" />
          <span>Signing in…</span>
        </>
      ) : (
        <>
          <span>Sign In</span>
          <ArrowRight className="sk-arrow" />
        </>
      )}
    </button>
  )
}

/* ═══════════ MAIN LOGIN ═══════════ */
export default function LoginPage() {
  const [errorMessage, dispatch] = useActionState(authenticate, undefined)
  const [showPassword, setShowPassword] = useState(false)
  const [loginType, setLoginType] = useState<"STAFF" | "PATIENT">("STAFF")

  return (
    <>
      <div className="sk-page">
        {/* Animated background orbs */}
        <div className="sk-orb sk-orb-1" />
        <div className="sk-orb sk-orb-2" />
        <div className="sk-orb sk-orb-3" />

        {/* Floating particles */}
        <div className="sk-particles">
          <div className="sk-dot" /><div className="sk-dot" />
          <div className="sk-dot" /><div className="sk-dot" />
          <div className="sk-dot" /><div className="sk-dot" />
          <div className="sk-dot" /><div className="sk-dot" />
        </div>

        {/* Subtle grid */}
        <div className="sk-grid-overlay" />

        {/* Main Card */}
        <div className="sk-card">
          {/* Logo */}
          <div className="sk-logo-wrap">
            <div className="sk-logo-ring">
              <Image
                src="/shree-kamal-logo.png"
                alt="Shree Kamal Hospital"
                width={140}
                height={140}
                priority
              />
            </div>
          </div>

          {/* Title */}
          <div className="sk-header">
            <p className="sk-tagline">Welcome to</p>
            <h1 className="sk-title">Shree Kamal Hospital</h1>
            <p className="sk-subtitle">Hospital Management System</p>
          </div>

          {/* Form */}
          <form action={dispatch} className="sk-form">
            <input type="hidden" name="loginType" value={loginType} />

            {/* Login Type Tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
              <button 
                type="button" 
                onClick={() => setLoginType("STAFF")} 
                style={{
                  flex: 1, padding: "8px", fontSize: "14px", fontWeight: "600", borderRadius: "8px",
                  transition: "all 0.2s", 
                  backgroundColor: loginType === "STAFF" ? "#0ea5e9" : "#1e293b",
                  color: loginType === "STAFF" ? "#ffffff" : "#94a3b8",
                  border: "none", cursor: "pointer"
                }}
              >
                Staff
              </button>
              <button 
                type="button" 
                onClick={() => setLoginType("PATIENT")} 
                style={{
                  flex: 1, padding: "8px", fontSize: "14px", fontWeight: "600", borderRadius: "8px",
                  transition: "all 0.2s", 
                  backgroundColor: loginType === "PATIENT" ? "#0ea5e9" : "#1e293b",
                  color: loginType === "PATIENT" ? "#ffffff" : "#94a3b8",
                  border: "none", cursor: "pointer"
                }}
              >
                Patient
              </button>
            </div>

            {/* Email / Identifier */}
            <div className="sk-field">
              <label className="sk-label">
                <Mail className="sk-label-icon" />
                {loginType === "STAFF" ? "Email Address" : "Patient ID or Phone"}
              </label>
              {loginType === "STAFF" ? (
                <input
                  name="email"
                  type="email"
                  placeholder="you@shreekamal.com"
                  required
                  autoComplete="email"
                  className="sk-input"
                />
              ) : (
                <input
                  name="identifier"
                  type="text"
                  placeholder="+91 9876543210 or PAT-0188"
                  required
                  className="sk-input"
                />
              )}
            </div>

            {/* Password */}
            <div className="sk-field">
              <label className="sk-label">
                <Lock className="sk-label-icon" />
                Password
              </label>
              <div className="sk-input-wrap">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••"
                  required
                  autoComplete="current-password"
                  className="sk-input sk-input--pw"
                />
                <button
                  type="button"
                  className="sk-eye"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {/* Error */}
            {errorMessage && (
              <div className="sk-error">
                <span className="sk-error-dot" />
                {errorMessage}
              </div>
            )}

            <SubmitButton />
          </form>

          {/* Footer */}
          <div className="sk-footer">
            <a href="/reset-password" className="sk-forgot">Forgot your password?</a>
          </div>
        </div>

        {/* Bottom branding */}
        <p className="sk-brand">Shree Kamal Hospital &middot; Life Matters</p>
      </div>
    </>
  )
}