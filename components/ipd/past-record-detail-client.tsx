"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft, User, Calendar, BedDouble, Stethoscope, FileText,
  Pill, FlaskConical, Scissors, Activity, Heart, ChevronDown,
  Clock, Printer, Shield, Phone, MapPin, UtensilsCrossed,
  Monitor, ClipboardList, DollarSign, Users, AlertCircle, CheckCircle2
} from "lucide-react"
import { format } from "date-fns"

// ── Accordion Section ──
function Section({
  id, title, icon: Icon, count, children, color = "indigo", defaultOpen = false
}: {
  id: string; title: string; icon: any; count?: number; children: React.ReactNode; color?: string; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const colors: Record<string, string> = {
    indigo: "from-indigo-500 to-blue-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-pink-600",
    violet: "from-violet-500 to-purple-600",
    sky: "from-sky-500 to-cyan-600",
    slate: "from-slate-500 to-gray-600",
    teal: "from-teal-500 to-emerald-600",
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-500"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left group"
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-sm`}>
            <Icon className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">{title}</h3>
            {count !== undefined && <span className="text-[10px] text-slate-400 font-medium">{count} record{count !== 1 ? "s" : ""}</span>}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1 border-t border-slate-100">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Info Row helper ──
const Info = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</span>
    <span className="text-sm font-medium text-slate-800">{value || "—"}</span>
  </div>
)

// ── Status Badge ──
const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
    STOPPED: "bg-red-50 text-red-700 border-red-200",
    DISPENSED: "bg-blue-50 text-blue-700 border-blue-200",
    PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    CANCELLED: "bg-gray-100 text-gray-500 border-gray-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
    IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  }
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${styles[status] || styles.PENDING}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

export function PastRecordDetailClient({ record }: { record: any }) {
  const router = useRouter()
  const r = record

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 print:bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-4 print:px-0">

        {/* Back + Print */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <button
            onClick={() => router.push("/dashboard/ipd/past-records")}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors duration-300"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Past Records
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-blue-600 rounded-xl hover:from-indigo-600 hover:to-blue-700 transition-all duration-300 active:scale-[0.97] shadow-md shadow-indigo-200/50"
          >
            <Printer className="w-4 h-4" /> Print Record
          </button>
        </div>

        {/* Patient Header Card */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="bg-white border border-slate-200/80 rounded-2xl p-6 mb-6 shadow-sm"
        >
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-200/50 flex-shrink-0">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{r.patient.name}</h1>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                  {r.status}
                </span>
                {r.isBskyAdmission && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                    BSKY
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 mt-4">
                <Info label="Patient ID" value={r.patient.patientId} />
                <Info label="IP Number" value={r.ipNumber} />
                <Info label="Gender" value={r.patient.gender} />
                <Info label="Blood Group" value={r.patient.bloodGroup} />
                <Info label="Admission" value={r.admissionDate ? format(new Date(r.admissionDate), "dd MMM yyyy") : "—"} />
                <Info label="Discharge" value={r.dischargeDate ? format(new Date(r.dischargeDate), "dd MMM yyyy") : "—"} />
                <Info label="Stay Duration" value={`${r.daysAdmitted} day${r.daysAdmitted !== 1 ? "s" : ""}`} />
                <Info label="Discharge Type" value={r.dischargeType?.replace(/_/g, " ")} />
                <Info label="Ward / Bed" value={`${r.ward} · ${r.bedNumber}`} />
                <Info label="Primary Doctor" value={r.primaryDoctor.name} />
                <Info label="Phone" value={r.patient.phone} />
                <Info label="Diagnosis" value={r.diagnosis || r.finalDiagnosis} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sections */}
        <div className="space-y-4">

          {/* Patient Details */}
          <Section id="patient" title="Patient Demographics" icon={User} color="indigo" defaultOpen={false}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 mt-2">
              <Info label="Full Name" value={r.patient.name} />
              <Info label="Father/Husband" value={r.patient.fatherOrHusbandName} />
              <Info label="Date of Birth" value={r.patient.dateOfBirth ? format(new Date(r.patient.dateOfBirth), "dd MMM yyyy") : null} />
              <Info label="Email" value={r.patient.email} />
              <Info label="Phone" value={r.patient.phone} />
              <Info label="Emergency Contact" value={r.patient.emergencyContact ? `${r.patient.emergencyContactName || ""} — ${r.patient.emergencyContact}` : null} />
              <Info label="Address" value={[r.patient.address, r.patient.city, r.patient.state, r.patient.pincode].filter(Boolean).join(", ")} />
              <Info label="Aadhaar" value={r.patient.aadharNumber} />
              <Info label="BSKY Number" value={r.patient.bskyNumber} />
              <Info label="Allergies" value={r.patient.allergies} />
              <Info label="Medical History" value={r.patient.medicalHistory} />
            </div>
          </Section>

          {/* Assigned Doctors */}
          {r.doctors.length > 0 && (
            <Section id="doctors" title="Assigned Doctors" icon={Stethoscope} count={r.doctors.length} color="sky">
              <div className="space-y-2 mt-2">
                {/* Primary Doctor */}
                <div className="flex items-center justify-between py-2 px-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                  <div>
                    <span className="font-semibold text-sm text-slate-900">{r.primaryDoctor.name}</span>
                    <span className="ml-2 text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-semibold uppercase">Primary</span>
                    {r.primaryDoctor.department && <span className="ml-2 text-xs text-slate-400">{r.primaryDoctor.department}</span>}
                  </div>
                </div>
                {r.doctors.map((d: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-semibold text-sm text-slate-900">{d.name}</span>
                      {d.role && <span className="ml-2 text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-semibold uppercase">{d.role}</span>}
                      {d.department && <span className="ml-2 text-xs text-slate-400">{d.department}</span>}
                    </div>
                    <span className="text-xs text-slate-400">{format(new Date(d.assignedAt), "dd MMM yyyy")}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Assigned Nurses */}
          {r.nurses.length > 0 && (
            <Section id="nurses" title="Nursing Assignments" icon={Heart} count={r.nurses.length} color="rose">
              <div className="space-y-2 mt-2">
                {r.nurses.map((n: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-semibold text-sm text-slate-900">{n.name}</span>
                      <span className="ml-2 text-xs text-slate-400">Shift: {n.shift}</span>
                    </div>
                    <span className="font-semibold text-sm text-slate-700">₹{n.cost}/day</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Clinical Notes */}
          {r.clinicalNotes.length > 0 && (
            <Section id="notes" title="Clinical Notes" icon={FileText} count={r.clinicalNotes.length} color="amber">
              <div className="space-y-4 mt-2">
                {r.clinicalNotes.map((n: any) => (
                  <div key={n.id} className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-600">{n.authorName || "Doctor"}</span>
                      <span className="text-xs text-slate-400">{format(new Date(n.date), "dd MMM yyyy, hh:mm a")}</span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{n.note}</p>
                    {(n.bp || n.pulse || n.temperature || n.spO2) && (
                      <div className="flex gap-4 mt-3 pt-2 border-t border-slate-100 flex-wrap">
                        {n.bp && <span className="text-xs text-slate-500">BP: <strong>{n.bp}</strong></span>}
                        {n.pulse && <span className="text-xs text-slate-500">Pulse: <strong>{n.pulse}</strong></span>}
                        {n.temperature && <span className="text-xs text-slate-500">Temp: <strong>{n.temperature}</strong></span>}
                        {n.spO2 && <span className="text-xs text-slate-500">SpO₂: <strong>{n.spO2}</strong></span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Vitals */}
          {r.vitals.length > 0 && (
            <Section id="vitals" title="Vitals History" icon={Activity} count={r.vitals.length} color="emerald">
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Date</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">BP</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Pulse</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Temp</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">SpO₂</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">RR</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.vitals.map((v: any) => (
                      <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2 px-2 text-slate-600">{format(new Date(v.recordedAt), "dd MMM, hh:mm a")}</td>
                        <td className="py-2 px-2 font-semibold text-slate-800">{v.bp || "—"}</td>
                        <td className="py-2 px-2 text-slate-700">{v.pulse || "—"}</td>
                        <td className="py-2 px-2 text-slate-700">{v.temperature || "—"}</td>
                        <td className="py-2 px-2 text-slate-700">{v.spO2 || "—"}</td>
                        <td className="py-2 px-2 text-slate-700">{v.respiratoryRate || "—"}</td>
                        <td className="py-2 px-2 text-slate-400">{v.recordedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Medications */}
          {r.medications.length > 0 && (
            <Section id="medications" title="Medications (IPD)" icon={Pill} count={r.medications.length} color="violet">
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Medicine</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Dosage</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Frequency</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Duration</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Qty</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Status</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.medications.map((m: any) => (
                      <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2 px-2 font-semibold text-slate-800">{m.medicineName}</td>
                        <td className="py-2 px-2 text-slate-600">{m.dosage}</td>
                        <td className="py-2 px-2 text-slate-600">{m.frequency}</td>
                        <td className="py-2 px-2 text-slate-600">{m.duration}</td>
                        <td className="py-2 px-2 text-slate-600">{m.dispensedQuantity || "—"}</td>
                        <td className="py-2 px-2"><StatusBadge status={m.pharmacyStatus} /></td>
                        <td className="py-2 px-2 text-right font-semibold text-slate-800">
                          {m.totalPrice != null ? `₹${Number(m.totalPrice).toFixed(2)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Discharge Medicines */}
          {r.dischargeMedicines.length > 0 && (
            <Section id="discharge-meds" title="Discharge Medicines" icon={Pill} count={r.dischargeMedicines.length} color="teal">
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Medicine</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Dosage</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Frequency</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Duration</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Qty</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.dischargeMedicines.map((m: any) => (
                      <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-2 px-2 font-semibold text-slate-800">{m.medicineName}</td>
                        <td className="py-2 px-2 text-slate-600">{m.dosage}</td>
                        <td className="py-2 px-2 text-slate-600">{m.frequency}</td>
                        <td className="py-2 px-2 text-slate-600">{m.duration}</td>
                        <td className="py-2 px-2 text-slate-600">{m.quantity}</td>
                        <td className="py-2 px-2"><StatusBadge status={m.pharmacyStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Lab Reports */}
          {r.labReports.length > 0 && (
            <Section id="labs" title="Lab Investigations" icon={FlaskConical} count={r.labReports.length} color="sky">
              <div className="space-y-2 mt-2">
                {r.labReports.map((lr: any) => (
                  <div key={lr.id} className="flex items-center justify-between py-3 px-3 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{lr.testName}</span>
                        <StatusBadge status={lr.status} />
                        {lr.isUrgent && <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-600">URGENT</span>}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Ordered by {lr.orderedByName} · {format(new Date(lr.createdAt), "dd MMM yyyy")}
                        {lr.completedAt && ` · Completed ${format(new Date(lr.completedAt), "dd MMM yyyy")}`}
                      </div>
                      {lr.result && <p className="text-xs text-slate-600 mt-1 font-medium">Result: {lr.result}</p>}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-semibold uppercase">{lr.type}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Surgeries */}
          {r.surgeries.length > 0 && (
            <Section id="surgeries" title="Surgeries / Operations" icon={Scissors} count={r.surgeries.length} color="rose">
              <div className="space-y-3 mt-2">
                {r.surgeries.map((s: any) => (
                  <div key={s.id} className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900">{s.procedureName}</h4>
                          <StatusBadge status={s.status} />
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {s.surgeonName} · {s.theaterName} · {format(new Date(s.scheduledDate), "dd MMM yyyy")} · {s.durationMinutes}min
                        </div>
                        {s.diagnosis && <p className="text-xs text-slate-600 mt-2">Dx: {s.diagnosis}</p>}
                        {s.findings && <p className="text-xs text-slate-600 mt-1">Findings: {s.findings}</p>}
                      </div>
                      <span className="font-bold text-sm text-slate-900 whitespace-nowrap">₹{s.surgeryCharge?.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Equipment */}
          {r.equipment.length > 0 && (
            <Section id="equipment" title="Equipment Usage" icon={Monitor} count={r.equipment.length} color="slate">
              <div className="space-y-2 mt-2">
                {r.equipment.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <div>
                      <span className="font-semibold text-sm text-slate-900">{e.equipmentName}</span>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {format(new Date(e.startDate), "dd MMM")} — {e.endDate ? format(new Date(e.endDate), "dd MMM") : "Ongoing"}
                        {e.dailyRate > 0 && ` · ₹${e.dailyRate}/day`}
                      </div>
                    </div>
                    {e.totalCharge > 0 && <span className="font-semibold text-sm text-slate-700">₹{e.totalCharge.toLocaleString("en-IN")}</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Diet & Meals */}
          {(r.diets.length > 0 || r.meals.length > 0) && (
            <Section id="diet" title="Diet & Meals" icon={UtensilsCrossed} count={r.diets.length + r.meals.length} color="amber">
              {r.diets.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Diet Plans</h4>
                  {r.diets.map((d: any) => (
                    <div key={d.id} className="py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <span className="font-semibold text-sm text-slate-900">{d.dietPlanName}</span>
                      <div className="text-xs text-slate-400">
                        {format(new Date(d.startDate), "dd MMM")} — {d.endDate ? format(new Date(d.endDate), "dd MMM") : "Ongoing"}
                      </div>
                      {d.instructions && <p className="text-xs text-slate-500 mt-1">{d.instructions}</p>}
                    </div>
                  ))}
                </div>
              )}
              {r.meals.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Meal Orders ({r.meals.length})</h4>
                  {r.meals.slice(0, 10).map((m: any) => (
                    <div key={m.id} className="flex justify-between py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                      <div>
                        <span className="text-sm text-slate-700">{m.mealSlot}</span>
                        <span className="ml-2 text-xs text-slate-400">{format(new Date(m.createdAt), "dd MMM")}</span>
                      </div>
                      <span className="font-semibold text-sm text-slate-700">₹{m.totalAmount}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Bed Transfers */}
          {r.bedTransfers.length > 0 && (
            <Section id="transfers" title="Bed Transfers" icon={BedDouble} count={r.bedTransfers.length} color="sky">
              <div className="space-y-2 mt-2">
                {r.bedTransfers.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors">
                    <span className="text-sm text-slate-600">{t.fromBed}</span>
                    <span className="text-slate-300">→</span>
                    <span className="text-sm font-semibold text-slate-900">{t.toBed}</span>
                    <span className="text-xs text-slate-400 ml-auto">{format(new Date(t.transferDate), "dd MMM yyyy")}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Discharge Summary */}
          {r.finalDiagnosis && (
            <Section id="discharge-summary" title="Discharge Summary" icon={ClipboardList} color="emerald" defaultOpen={true}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="sm:col-span-2">
                  <Info label="Final Diagnosis" value={r.finalDiagnosis} />
                </div>
                {r.proceduresDone && <Info label="Procedures Done" value={r.proceduresDone} />}
                {r.courseInHospital && <Info label="Course in Hospital" value={r.courseInHospital} />}
                {r.treatmentGiven && <Info label="Treatment Given" value={r.treatmentGiven} />}
                {r.conditionAtDischarge && <Info label="Condition at Discharge" value={r.conditionAtDischarge} />}
                {r.adviceOnDischarge && <Info label="Advice on Discharge" value={r.adviceOnDischarge} />}
                {r.followUpDate && <Info label="Follow-up Date" value={format(new Date(r.followUpDate), "dd MMM yyyy")} />}
              </div>
            </Section>
          )}

          {/* Billing Summary */}
          <Section id="billing" title="Billing Summary" icon={DollarSign} color="emerald">
            <div className="mt-2 space-y-2">
              {[
                { label: "Room Charges", value: r.billing?.roomRent },
                { label: "Pharmacy", value: r.billing?.pharmacyTotal },
                { label: "Laboratory", value: r.billing?.labTotal },
                { label: "Surgery", value: r.billing?.surgeryTotal },
                { label: "Nursing", value: r.billing?.nursingTotal },
                { label: "Equipment", value: r.billing?.equipmentTotal },
                { label: "Canteen", value: r.billing?.canteenTotal },
              ].filter(item => item.value > 0).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50">
                  <span className="text-sm text-slate-600">{item.label}</span>
                  <span className="font-semibold text-sm text-slate-800">₹{Number(item.value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ))}
              {r.discountAmount > 0 && (
                <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-green-50/50">
                  <span className="text-sm text-green-700">Discount {r.discountReason ? `(${r.discountReason})` : ""}</span>
                  <span className="font-semibold text-sm text-green-700">-₹{r.discountAmount.toLocaleString("en-IN")}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-3 px-3 rounded-xl bg-slate-900 text-white mt-2">
                <span className="font-bold text-sm">Total Bill Amount</span>
                <span className="font-bold text-lg">₹{Number(r.totalBillAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between py-2 px-3">
                <span className="text-sm text-slate-500">Amount Paid</span>
                <span className="font-semibold text-sm text-emerald-600">₹{r.amountPaid.toLocaleString("en-IN")}</span>
              </div>
              {r.balanceDue > 0 && (
                <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-red-50">
                  <span className="text-sm font-semibold text-red-600">Balance Due</span>
                  <span className="font-bold text-sm text-red-600">₹{r.balanceDue.toLocaleString("en-IN")}</span>
                </div>
              )}
            </div>
          </Section>

          {/* Timeline */}
          {r.timeline.length > 0 && (
            <Section id="timeline" title="Timeline" icon={Clock} count={r.timeline.length} color="slate">
              <div className="relative ml-4 mt-2">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />
                {r.timeline.map((e: any, i: number) => (
                  <div key={e.id} className="relative pl-6 pb-4 last:pb-0">
                    <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-indigo-400 -translate-x-[3.5px]" />
                    <div className="text-xs text-slate-400">{format(new Date(e.timestamp), "dd MMM yyyy, hh:mm a")}</div>
                    <div className="text-sm font-semibold text-slate-800 mt-0.5">{e.title}</div>
                    {e.description && <div className="text-xs text-slate-500 mt-0.5">{e.description}</div>}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}
