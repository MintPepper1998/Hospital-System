"use client"

import { useState } from "react"
import { signIn, getSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Lock, Phone, ArrowRight, Eye, EyeOff, Heart, ShieldCheck, FileText } from "lucide-react"
import Image from "next/image"

export default function PatientLoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const identifier = formData.get("identifier") as string
    const password = formData.get("password") as string

    try {
      const result = await signIn("credentials", {
        identifier,
        password,
        loginType: "PATIENT",
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid credentials. Please check your Phone / Patient ID and password.")
        setLoading(false)
      } else if (result?.ok) {
        router.push("/dashboard/patient-portal")
        router.refresh()
      }
    } catch {
      setError("Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <>
      <div className="pl-page">
        {/* Ambient shapes */}
        <div className="pl-glow pl-glow--1" />
        <div className="pl-glow pl-glow--2" />
        <div className="pl-glow pl-glow--3" />

        {/* Top bar */}
        <nav className="pl-topbar">
          <Link href="/" className="pl-topbar-logo">
            <img 
              src="/images/shreekamal-logo.png" 
              alt="Shree Kamal Hospital" 
              className="pl-topbar-logo-img"
            />
            <span className="pl-topbar-name">Shree Kamal Hospital</span>
          </Link>
          <Link href="/auth/signin" className="pl-topbar-staff">
            Staff Login →
          </Link>
        </nav>

        <div className="pl-container">
          {/* Left — Features */}
          <div className="pl-features">
            <div className="pl-features-badge">Patient Portal</div>
            <h1 className="pl-features-title">
              Your Health,<br />
              <span className="pl-features-title-accent">Always Accessible.</span>
            </h1>
            <p className="pl-features-desc">
              Access your medical records, view test results, track appointments, and connect with your doctors — all in one secure place.
            </p>
            <div className="pl-features-grid">
              <div className="pl-feature-card">
                <div className="pl-feature-icon pl-feature-icon--blue">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="pl-feature-label">Test Reports</h3>
                  <p className="pl-feature-desc">View and download lab results instantly</p>
                </div>
              </div>
              <div className="pl-feature-card">
                <div className="pl-feature-icon pl-feature-icon--teal">
                  <Heart size={20} />
                </div>
                <div>
                  <h3 className="pl-feature-label">Health Dashboard</h3>
                  <p className="pl-feature-desc">Track vitals, prescriptions & history</p>
                </div>
              </div>
              <div className="pl-feature-card">
                <div className="pl-feature-icon pl-feature-icon--purple">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="pl-feature-label">Secure Access</h3>
                  <p className="pl-feature-desc">Your data is encrypted and private</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right — Login Card */}
          <div className="pl-card-wrap">
            <div className="pl-card">
              <div className="pl-card-accent" />
              
              <div className="pl-card-header">
                <h2 className="pl-card-title">Welcome Back</h2>
                <p className="pl-card-subtitle">Sign in to your Patient Portal</p>
              </div>

              <form onSubmit={handleSubmit} className="pl-form">
                <div className="pl-field">
                  <label className="pl-label">
                    <Phone size={13} className="pl-label-icon" />
                    Phone Number or Patient ID
                  </label>
                  <input
                    name="identifier"
                    type="text"
                    placeholder="e.g. 9876543210 or P00012"
                    required
                    disabled={loading}
                    autoComplete="username"
                    className="pl-input"
                  />
                </div>

                <div className="pl-field">
                  <label className="pl-label">
                    <Lock size={13} className="pl-label-icon" />
                    Password
                  </label>
                  <div className="pl-input-wrap">
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••"
                      required
                      disabled={loading}
                      autoComplete="current-password"
                      className="pl-input pl-input--pw"
                    />
                    <button
                      type="button"
                      className="pl-eye"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="pl-hint">Default password is your 10-digit phone number. If registered without a phone, use your Patient ID (e.g. PAT-2026-0001)</p>
                </div>

                {error && (
                  <div className="pl-error">
                    <span className="pl-error-dot" />
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="pl-submit">
                  {loading ? (
                    <>
                      <Loader2 size={18} className="pl-spinner" />
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <>
                      <span>Access My Portal</span>
                      <ArrowRight size={16} className="pl-arrow" />
                    </>
                  )}
                </button>
              </form>

              <div className="pl-card-footer">
                <p className="pl-help">
                  Credentials were shared during registration.<br />
                  Contact reception for assistance.
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="pl-branding">Shree Kamal Hospital &middot; Life Matters</p>
      </div>

      <style>{`
        /* ── Layout ── */
        .pl-page{--navy:#0a3d6b;--teal:#00b4a0;--teal-lt:#e0f7f4;--purple:#7c3aed;--red:#e63946;--sky:#f0f8ff;--white:#fff;--g50:#f8fafc;--g100:#f1f5f9;--g200:#e2e8f0;--g400:#94a3b8;--g500:#64748b;--g700:#334155;--g900:#0f172a;font-family:var(--font-dm-sans),system-ui,sans-serif;position:relative;display:flex;flex-direction:column;min-height:100vh;background:linear-gradient(165deg,var(--sky) 0%,var(--teal-lt) 35%,var(--white) 100%);overflow:hidden}

        /* Glow shapes */
        .pl-glow{position:absolute;border-radius:50%;pointer-events:none;z-index:0}
        .pl-glow--1{width:600px;height:600px;top:-200px;right:-100px;background:radial-gradient(circle,rgba(0,180,160,.1) 0%,transparent 70%)}
        .pl-glow--2{width:500px;height:500px;bottom:-200px;left:-150px;background:radial-gradient(circle,rgba(10,61,107,.07) 0%,transparent 70%)}
        .pl-glow--3{width:300px;height:300px;top:40%;left:20%;background:radial-gradient(circle,rgba(124,58,237,.05) 0%,transparent 70%);animation:plFloat 18s ease-in-out infinite}
        @keyframes plFloat{0%,100%{transform:translate(0,0)}50%{transform:translate(25px,-35px)}}

        /* Top bar */
        .pl-topbar{position:relative;z-index:20;display:flex;align-items:center;justify-content:space-between;padding:1.25rem 2rem}
        .pl-topbar-logo{display:flex;align-items:center;gap:.75rem;text-decoration:none}
        .pl-topbar-logo-img{width:36px;height:36px;object-fit:contain;border-radius:8px}
        .pl-topbar-name{font-size:.9rem;font-weight:700;color:var(--navy);letter-spacing:-.01em}
        .pl-topbar-staff{font-size:.78rem;font-weight:600;color:var(--g500);text-decoration:none;transition:color .2s}
        .pl-topbar-staff:hover{color:var(--navy)}

        /* Container */
        .pl-container{position:relative;z-index:10;flex:1;display:grid;grid-template-columns:1fr 1fr;gap:4rem;align-items:center;max-width:1200px;margin:0 auto;padding:2rem 2rem 4rem}

        /* Left features */
        .pl-features{display:flex;flex-direction:column;gap:2rem}
        .pl-features-badge{display:inline-flex;align-items:center;background:var(--white);border:1px solid rgba(0,180,160,.2);border-radius:100px;padding:.4rem 1rem;font-size:.7rem;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.1em;width:fit-content;box-shadow:0 2px 8px rgba(0,180,160,.08)}
        .pl-features-title{font-family:'Playfair Display',Georgia,serif;font-size:3rem;font-weight:700;line-height:1.1;color:var(--navy);margin:0}
        .pl-features-title-accent{background:linear-gradient(135deg,var(--teal),var(--navy));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .pl-features-desc{font-size:.95rem;line-height:1.7;color:var(--g500);max-width:440px}
        .pl-features-grid{display:flex;flex-direction:column;gap:1rem;margin-top:.5rem}
        .pl-feature-card{display:flex;align-items:center;gap:1rem;background:var(--white);border:1px solid var(--g200);border-radius:16px;padding:1rem 1.25rem;box-shadow:0 1px 4px rgba(0,0,0,.03);transition:transform .25s,box-shadow .25s}
        .pl-feature-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.06)}
        .pl-feature-icon{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .pl-feature-icon--blue{background:#dbeafe;color:#2563eb}
        .pl-feature-icon--teal{background:var(--teal-lt);color:var(--teal)}
        .pl-feature-icon--purple{background:#ede9fe;color:var(--purple)}
        .pl-feature-label{font-size:.85rem;font-weight:700;color:var(--g900);margin:0 0 .15rem}
        .pl-feature-desc{font-size:.75rem;color:var(--g400);margin:0}

        /* Card wrap */
        .pl-card-wrap{display:flex;justify-content:center}
        .pl-card{width:100%;max-width:440px;background:var(--white);border-radius:24px;padding:0 2rem 2rem;box-shadow:0 1px 3px rgba(10,61,107,.04),0 8px 24px rgba(10,61,107,.06),0 24px 48px rgba(10,61,107,.04);border:1px solid rgba(0,180,160,.1);overflow:hidden}
        .pl-card-accent{height:4px;margin:0 -2rem;background:linear-gradient(90deg,var(--teal),var(--navy),var(--teal))}

        /* Card header */
        .pl-card-header{text-align:center;margin:2rem 0 1.75rem}
        .pl-card-title{font-family:'Playfair Display',Georgia,serif;font-size:1.6rem;font-weight:700;color:var(--navy);margin:0 0 .35rem}
        .pl-card-subtitle{font-size:.82rem;color:var(--g500);margin:0}

        /* Form */
        .pl-form{display:flex;flex-direction:column;gap:1.125rem}
        .pl-field{display:flex;flex-direction:column;gap:.4rem;animation:plFieldIn .3s ease}
        @keyframes plFieldIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .pl-label{display:flex;align-items:center;gap:.35rem;font-size:.72rem;font-weight:600;color:var(--g700);text-transform:uppercase;letter-spacing:.06em}
        .pl-label-icon{color:var(--teal)}
        .pl-input{width:100%;height:48px;padding:0 1rem;font-family:inherit;font-size:.9rem;color:var(--g900);background:var(--g50);border:1.5px solid var(--g200);border-radius:14px;outline:none;transition:border-color .25s,box-shadow .25s,background .25s}
        .pl-input::placeholder{color:var(--g400)}
        .pl-input:focus{border-color:var(--teal);background:var(--white);box-shadow:0 0 0 3px rgba(0,180,160,.1)}
        .pl-input:disabled{opacity:.5}
        .pl-input-wrap{position:relative}
        .pl-input--pw{padding-right:3.5rem}
        .pl-eye{position:absolute;right:0;top:0;width:48px;height:48px;display:flex;align-items:center;justify-content:center;background:none;border:none;cursor:pointer;color:var(--g400);transition:color .2s}
        .pl-eye:hover{color:var(--g700)}
        .pl-hint{font-size:.7rem;color:var(--teal);margin:0;font-style:italic}

        /* Error */
        .pl-error{display:flex;align-items:center;gap:.5rem;padding:.7rem 1rem;font-size:.8rem;color:var(--red);background:rgba(230,57,70,.06);border:1px solid rgba(230,57,70,.12);border-radius:12px}
        .pl-error-dot{width:6px;height:6px;border-radius:50%;background:var(--red);flex-shrink:0;animation:plPulse 2s ease-in-out infinite}
        @keyframes plPulse{0%,100%{opacity:1}50%{opacity:.3}}

        /* Submit */
        .pl-submit{width:100%;height:50px;border:none;border-radius:14px;font-family:inherit;font-size:.9rem;font-weight:600;color:var(--white);background:linear-gradient(135deg,var(--navy) 0%,var(--teal) 100%);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.5rem;letter-spacing:.02em;transition:transform .2s,box-shadow .3s;margin-top:.35rem}
        .pl-submit:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,180,160,.2)}
        .pl-submit:active{transform:translateY(0)}
        .pl-submit:disabled{opacity:.7;cursor:not-allowed;transform:none}
        .pl-spinner{animation:plSpin 1s linear infinite}
        @keyframes plSpin{to{transform:rotate(360deg)}}
        .pl-arrow{transition:transform .3s}
        .pl-submit:hover .pl-arrow{transform:translateX(3px)}

        /* Footer */
        .pl-card-footer{margin-top:1.5rem;padding-top:1.25rem;border-top:1px solid var(--g200);text-align:center}
        .pl-help{font-size:.75rem;color:var(--g400);margin:0;line-height:1.6}

        /* Branding */
        .pl-branding{text-align:center;padding:1.5rem 0;font-size:.68rem;color:var(--g400);letter-spacing:.04em;z-index:10;position:relative}

        /* ── Responsive ── */
        @media(max-width:900px){
          .pl-container{grid-template-columns:1fr;gap:2.5rem;padding:1.5rem 1.5rem 3rem}
          .pl-features{text-align:center;align-items:center}
          .pl-features-title{font-size:2.2rem}
          .pl-features-desc{text-align:center;max-width:360px}
          .pl-features-grid{max-width:360px}
        }
        @media(max-width:480px){
          .pl-card{padding:0 1.5rem 1.5rem;border-radius:20px}
          .pl-card-title{font-size:1.35rem}
          .pl-features-title{font-size:1.8rem}
          .pl-topbar{padding:1rem 1.25rem}
        }
      `}</style>
    </>
  )
}
