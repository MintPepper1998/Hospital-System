"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2, Stethoscope, User, Lock, Mail, Phone, ArrowRight, Eye, EyeOff } from "lucide-react"
import Image from "next/image"

function getRoleRedirect(role?: string): string {
  switch (role) {
    case "DOCTOR": return "/dashboard/clinical/opd"
    case "PHARMACIST": return "/dashboard/pharmacy/pos"
    case "ACCOUNTANT": return "/dashboard/billing-counter"
    case "LAB_TECHNICIAN": return "/dashboard/lab/queue"
    case "NURSE": return "/dashboard"
    case "PATIENT": return "/dashboard/patient-portal"
    case "SUPER_ADMIN":
    default: return "/dashboard"
  }
}

export default function SignInPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [loginType, setLoginType] = useState<"STAFF" | "PATIENT">("STAFF")
  const [showPassword, setShowPassword] = useState(false)

  const isPatient = loginType === "PATIENT"

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const identifier = isPatient ? formData.get("identifier") as string : undefined
    const email = !isPatient ? formData.get("email") as string : undefined
    const password = formData.get("password") as string

    try {
      const result = await signIn("credentials", {
        ...(isPatient ? { identifier } : { email }),
        password,
        loginType,
        redirect: false,
      })

      if (result?.error) {
        setError(isPatient
          ? "Invalid credentials. Please check your phone/ID and password."
          : "Invalid email or password")
        setLoading(false)
      } else if (result?.ok) {
        const session = await getSession()
        const role = (session?.user as any)?.role as string | undefined
        router.push(getRoleRedirect(role))
        router.refresh()
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  return (
    <>
      <div className="sk-login-page">
        <div className="sk-bg-shape sk-bg-shape-1" />
        <div className="sk-bg-shape sk-bg-shape-2" />
        <div className="sk-bg-shape sk-bg-shape-3" />

        <div className="sk-login-card">
          <div className="sk-card-accent" />

          <div className="sk-logo-area">
            <Image src="/shree-kamal-logo.png" alt="Shree Kamal Hospital" width={140} height={140} className="sk-logo-img" priority />
          </div>

          <div className="sk-card-header">
            <p className="sk-card-tagline">Welcome to</p>
            <h1 className="sk-card-title">Shree Kamal Hospital</h1>
            <p className="sk-card-subtitle">{isPatient ? "Access your health records & appointments" : "Staff Management Portal"}</p>
          </div>

          <div className="sk-tabs">
            <button type="button" onClick={() => { setLoginType("STAFF"); setError("") }} className={`sk-tab ${!isPatient ? "sk-tab--active" : ""}`}>
              <Stethoscope className="sk-tab-icon" />Hospital Staff
            </button>
            <button type="button" onClick={() => { setLoginType("PATIENT"); setError("") }} className={`sk-tab ${isPatient ? "sk-tab--active" : ""}`}>
              <User className="sk-tab-icon" />Patient Portal
            </button>
            <div className="sk-tab-indicator" style={{ transform: isPatient ? "translateX(100%)" : "translateX(0)" }} />
          </div>

          <form onSubmit={handleSubmit} className="sk-form">
            <div className="sk-field" key={loginType + "-f"}>
              <label className="sk-label">{isPatient ? (<><Phone className="sk-label-icon" />Phone Number or Patient ID</>) : (<><Mail className="sk-label-icon" />Email Address</>)}</label>
              {isPatient ? (
                <input name="identifier" type="text" placeholder="Enter your phone number or ID" required disabled={loading} autoComplete="username" className="sk-input" />
              ) : (
                <input name="email" type="email" placeholder="doctor@shreekamal.com" required disabled={loading} autoComplete="email" className="sk-input" />
              )}
            </div>

            <div className="sk-field">
              <label className="sk-label"><Lock className="sk-label-icon" />Password</label>
              <div className="sk-input-wrap">
                <input name="password" type={showPassword ? "text" : "password"} placeholder="••••••••••" required disabled={loading} autoComplete="current-password" className="sk-input sk-input--password" />
                <button type="button" className="sk-eye-btn" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                  {showPassword ? <EyeOff className="sk-eye-icon" /> : <Eye className="sk-eye-icon" />}
                </button>
              </div>
              {isPatient && <p className="sk-hint">Default password is your registered phone number</p>}
            </div>

            {error && <div className="sk-error"><span className="sk-error-dot" />{error}</div>}

            <button type="submit" disabled={loading} className="sk-submit-btn">
              {loading ? (<><Loader2 className="sk-submit-spinner" /><span>Signing in…</span></>) : (<><span>{isPatient ? "Access Patient Portal" : "Sign In"}</span><ArrowRight className="sk-submit-arrow" /></>)}
            </button>
          </form>

          <div className="sk-footer">
            {!isPatient ? (
              <a href="/reset-password" className="sk-forgot">Forgot your password?</a>
            ) : (
              <p className="sk-patient-help">Credentials were shared during registration.<br />Contact reception for assistance.</p>
            )}
          </div>
        </div>

        <p className="sk-branding">Shree Kamal Hospital &middot; Life Matters</p>
      </div>

      <style>{`
        .sk-login-page{--navy:#0a3d6b;--teal:#00b4a0;--teal-lt:#e0f7f4;--red:#e63946;--sky:#f0f8ff;--white:#fff;--gray-50:#f8fafc;--gray-100:#f1f5f9;--gray-200:#e2e8f0;--gray-400:#94a3b8;--gray-500:#64748b;--gray-700:#334155;--gray-900:#0f172a;font-family:var(--font-dm-sans),sans-serif;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:1.5rem;background:linear-gradient(165deg,var(--sky) 0%,var(--teal-lt) 40%,var(--white) 100%);overflow:hidden}
        .sk-bg-shape{position:absolute;border-radius:50%;pointer-events:none;z-index:0}
        .sk-bg-shape-1{width:500px;height:500px;top:-200px;right:-150px;background:radial-gradient(circle,rgba(0,180,160,.08) 0%,transparent 70%)}
        .sk-bg-shape-2{width:400px;height:400px;bottom:-180px;left:-100px;background:radial-gradient(circle,rgba(10,61,107,.06) 0%,transparent 70%)}
        .sk-bg-shape-3{width:250px;height:250px;top:30%;left:10%;background:radial-gradient(circle,rgba(230,57,70,.04) 0%,transparent 70%);animation:floatShape 20s ease-in-out infinite}
        @keyframes floatShape{0%,100%{transform:translate(0,0)}50%{transform:translate(20px,-30px)}}
        .sk-login-card{position:relative;z-index:10;width:100%;max-width:440px;background:var(--white);border-radius:24px;padding:0 2rem 2rem;box-shadow:0 1px 3px rgba(10,61,107,.04),0 8px 24px rgba(10,61,107,.06),0 24px 48px rgba(10,61,107,.04);border:1px solid rgba(0,180,160,.1);overflow:hidden}
        .sk-card-accent{height:4px;margin:0 -2rem;background:linear-gradient(90deg,var(--navy),var(--teal),var(--red))}
        .sk-logo-area{display:flex;justify-content:center;margin:1.5rem 0 .5rem}
        .sk-logo-img{width:100px;height:auto;object-fit:contain}
        .sk-card-header{text-align:center;margin-bottom:1.5rem}
        .sk-card-tagline{font-size:.72rem;font-weight:500;color:var(--teal);text-transform:uppercase;letter-spacing:.12em;margin:0 0 .25rem}
        .sk-card-title{font-family:'Playfair Display',Georgia,serif;font-size:1.625rem;font-weight:700;color:var(--navy);margin:0 0 .4rem;line-height:1.15}
        .sk-card-subtitle{font-size:.8rem;color:var(--gray-500);margin:0}
        .sk-tabs{position:relative;display:grid;grid-template-columns:1fr 1fr;background:var(--gray-100);border-radius:12px;padding:4px;margin-bottom:1.5rem}
        .sk-tab-indicator{position:absolute;top:4px;left:4px;width:calc(50% - 4px);height:calc(100% - 8px);background:var(--white);border-radius:9px;box-shadow:0 1px 4px rgba(10,61,107,.1);transition:transform .35s cubic-bezier(.16,1,.3,1);z-index:1}
        .sk-tab{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;gap:.4rem;padding:.6rem .5rem;font-family:var(--font-dm-sans),sans-serif;font-size:.78rem;font-weight:500;color:var(--gray-400);background:none;border:none;cursor:pointer;border-radius:9px;transition:color .3s}
        .sk-tab:hover{color:var(--gray-700)} .sk-tab--active{color:var(--navy);font-weight:600} .sk-tab-icon{width:15px;height:15px}
        .sk-form{display:flex;flex-direction:column;gap:1.125rem}
        .sk-field{display:flex;flex-direction:column;gap:.4rem;animation:skFieldIn .3s ease}
        @keyframes skFieldIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .sk-label{display:flex;align-items:center;gap:.35rem;font-size:.72rem;font-weight:600;color:var(--gray-700);text-transform:uppercase;letter-spacing:.06em}
        .sk-label-icon{width:13px;height:13px;color:var(--teal)}
        .sk-input{width:100%;height:46px;padding:0 1rem;font-family:var(--font-dm-sans),sans-serif;font-size:.9rem;color:var(--gray-900);background:var(--gray-50);border:1.5px solid var(--gray-200);border-radius:12px;outline:none;transition:border-color .25s,box-shadow .25s,background .25s}
        .sk-input::placeholder{color:var(--gray-400)} .sk-input:focus{border-color:var(--teal);background:var(--white);box-shadow:0 0 0 3px rgba(0,180,160,.1)} .sk-input:disabled{opacity:.5}
        .sk-input-wrap{position:relative} .sk-input--password{padding-right:3rem}
        .sk-eye-btn{position:absolute;right:0;top:0;width:46px;height:46px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:var(--gray-400);transition:color .2s} .sk-eye-btn:hover{color:var(--gray-700)} .sk-eye-icon{width:18px;height:18px}
        .sk-hint{font-size:.7rem;color:var(--teal);margin:0;font-style:italic}
        .sk-error{display:flex;align-items:center;gap:.5rem;padding:.7rem 1rem;font-size:.8rem;color:var(--red);background:rgba(230,57,70,.06);border:1px solid rgba(230,57,70,.12);border-radius:10px}
        .sk-error-dot{width:6px;height:6px;border-radius:50%;background:var(--red);flex-shrink:0;animation:skPulse 2s ease-in-out infinite}
        @keyframes skPulse{0%,100%{opacity:1}50%{opacity:.3}}
        .sk-submit-btn{width:100%;height:48px;border:none;border-radius:12px;font-family:var(--font-dm-sans),sans-serif;font-size:.875rem;font-weight:600;color:var(--white);background:linear-gradient(135deg,var(--navy) 0%,#1a5a8a 50%,var(--teal) 100%);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.5rem;letter-spacing:.02em;transition:transform .2s,box-shadow .3s;margin-top:.25rem}
        .sk-submit-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(10,61,107,.2)} .sk-submit-btn:active{transform:translateY(0)} .sk-submit-btn:disabled{opacity:.7;cursor:not-allowed;transform:none}
        .sk-submit-spinner{width:18px;height:18px;animation:skSpin 1s linear infinite} @keyframes skSpin{to{transform:rotate(360deg)}}
        .sk-submit-arrow{width:16px;height:16px;transition:transform .3s} .sk-submit-btn:hover .sk-submit-arrow{transform:translateX(3px)}
        .sk-footer{margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid var(--gray-200);text-align:center}
        .sk-forgot{font-size:.78rem;color:var(--teal);text-decoration:none;font-weight:500;transition:color .2s} .sk-forgot:hover{color:var(--navy)}
        .sk-patient-help{font-size:.75rem;color:var(--gray-400);margin:0;line-height:1.6}
        .sk-branding{margin-top:2rem;font-size:.68rem;color:var(--gray-400);letter-spacing:.04em;z-index:10}
        @media(max-width:480px){.sk-login-card{padding:0 1.5rem 1.5rem;border-radius:20px} .sk-card-title{font-size:1.375rem} .sk-logo-img{width:80px}}
      `}</style>
    </>
  )
}
