import { prisma } from "@/lib/prisma"
import { Badge } from "@/components/ui/badge"
import { Pill, User, Stethoscope, Clock, BedDouble, Package, Search, ShieldCheck, Scissors } from "lucide-react"
import { format } from "date-fns"
import { DispenseButton } from "@/components/dispense-button"
import { DischargeDispenseCard } from "@/components/pharmacy/discharge-dispense-card"
import { IPDAdmittedPatientsView, type AdmittedPatientItem } from "@/components/pharmacy/ipd-admitted-patients-view"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface PharmacyQueuePageProps {
  searchParams: Promise<{
    q?: string
    source?: string
    notDispensed?: string
  }>
}

export default async function PharmacyPOSPage({ searchParams }: PharmacyQueuePageProps) {
  const params = await searchParams
  const q = (params?.q || "").trim().toLowerCase()
  const source = params?.source || "ALL"
  const notDispensed = params?.notDispensed !== "false"

  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const today = new Date()

  // ==========================================
  // 1. Fetch Admitted IPD Patients & Active Regimens
  // ==========================================
  const admittedPatientsRaw = await prisma.iPDAdmission.findMany({
    where: {
      status: "ADMITTED",
      ...(q
        ? {
            OR: [
              { patient: { user: { name: { contains: q, mode: "insensitive" } } } },
              { patient: { patientId: { contains: q, mode: "insensitive" } } },
              { bed: { bedNumber: { contains: q, mode: "insensitive" } } },
              { bed: { ward: { name: { contains: q, mode: "insensitive" } } } },
              { primaryDoctor: { user: { name: { contains: q, mode: "insensitive" } } } },
              { ipdPrescriptions: { some: { medicineName: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
    },
    include: {
      patient: {
        include: { user: true },
      },
      bed: {
        include: { ward: true },
      },
      primaryDoctor: {
        include: { user: true },
      },
      ipdPrescriptions: {
        where: {
          OR: [
            { pharmacyStatus: "DISPENSED", dispensedQuantity: { gt: 0 } },
            { pharmacyStatus: "PENDING", status: "ACTIVE" },
          ],
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { admissionDate: "desc" },
  })

  const admittedPatientsData: AdmittedPatientItem[] = admittedPatientsRaw.map((adm) => {
    const admDate = new Date(adm.admissionDate)
    const daysAdmitted = Math.max(
      1,
      Math.ceil((today.getTime() - admDate.getTime()) / (1000 * 60 * 60 * 24))
    )
    return {
      admissionId: adm.id,
      patientId: adm.patient.id,
      patientName: adm.patient.user.name || "Unknown",
      patientCode: adm.patient.patientId || "Unknown",
      gender: adm.patient.gender,
      phone: adm.patient.phone,
      bedNumber: adm.bed.bedNumber,
      wardName: adm.bed.ward.name,
      wardType: adm.bed.ward.type,
      doctorName: adm.primaryDoctor.user.name || "Doctor",
      doctorSpecialization: adm.primaryDoctor.specialization,
      admissionDate: adm.admissionDate.toISOString(),
      daysAdmitted,
      reason: adm.reason,
      diagnosis: adm.diagnosis,
      medicines: adm.ipdPrescriptions.map((p) => ({
        id: p.id,
        medicineName: p.medicineName,
        dosage: p.dosage,
        frequency: p.frequency,
        duration: p.duration,
        instruction: p.instruction,
        requestedQuantity: p.requestedQuantity,
        dispensedQuantity: p.dispensedQuantity,
        unitPrice: p.unitPrice,
        totalPrice: p.totalPrice,
        status: p.status,
        pharmacyStatus: p.pharmacyStatus,
        dispensedAt: p.dispensedAt?.toISOString() || null,
        dispensedBy: p.dispensedBy,
        createdAt: p.createdAt.toISOString(),
      })),
    }
  })

  // ==========================================
  // 2. Fetch OPD appointments with prescriptions
  // ==========================================
  const opdAppointmentsRaw = await prisma.appointment.findMany({
    where: {
      status: { in: ["COMPLETED", "IN_PROGRESS"] },
      appointmentDate: { gte: startOfDay },
      ...(notDispensed && {
        billings: { none: { type: "PHARMACY" } },
      }),
      medicalRecords: {
        some: {
          prescriptions: {
            some: {
              medications: {
                some: {},
              },
            },
          },
        },
      },
    },
    include: {
      patient: {
        include: { user: true },
      },
      doctor: {
        include: { user: true },
      },
      medicalRecords: {
        include: {
          prescriptions: {
            include: {
              medications: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  // ==========================================
  // 3. Fetch Discharge Medicines
  // ==========================================
  const dischargeMedicines = await prisma.dischargeMedicine.findMany({
    where: {
      pharmacyStatus: notDispensed ? "PENDING" : undefined,
    },
    include: {
      admission: {
        include: {
          patient: { include: { user: true } },
          primaryDoctor: { include: { user: true } },
          bed: { include: { ward: true } },
        },
      },
      medicine: {
        select: {
          id: true,
          unitPrice: true,
          inventoryBatches: {
            where: { isActive: true, isExpired: false, expiryDate: { gt: new Date() }, quantity: { gt: 0 } },
            orderBy: { expiryDate: "asc" },
            select: { quantity: true, sellingPrice: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // ==========================================
  // 4. Fetch Scheduled OT Surgeries
  // ==========================================
  const otSurgeriesRaw = await prisma.surgery.findMany({
    where: {
      status: "SCHEDULED",
      scheduledDate: {
        gte: startOfDay,
        lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    },
    include: {
      patient: { include: { user: true } },
      leadSurgeon: { include: { user: true } },
    },
  })

  let otSurgeries = otSurgeriesRaw.filter((s) => {
    const consumables: any = s.consumables || {}
    return (
      consumables.otPharmacy &&
      Array.isArray(consumables.otPharmacy) &&
      consumables.otPharmacy.length > 0
    )
  })

  let opdAppointments = opdAppointmentsRaw

  if (q) {
    opdAppointments = opdAppointments.filter((a) => {
      const meds = a.medicalRecords
        .flatMap((rec) => rec.prescriptions.flatMap((p) => p.medications.map((m) => m.medicationName)))
        .join(" ")
        .toLowerCase()
      return (
        (a.patient.user.name || "").toLowerCase().includes(q) ||
        (a.patient.patientId || "").toLowerCase().includes(q) ||
        (a.doctor.user.name || "").toLowerCase().includes(q) ||
        meds.includes(q)
      )
    })

    otSurgeries = otSurgeries.filter((s) => {
      const meds = ((s.consumables as any)?.otPharmacy || []).map((m: any) => m.medicineName).join(" ").toLowerCase()
      return (
        (s.patient.user.name || "").toLowerCase().includes(q) ||
        (s.patient.patientId || "").toLowerCase().includes(q) ||
        (s.leadSurgeon.user.name || "").toLowerCase().includes(q) ||
        meds.includes(q)
      )
    })
  }

  // Group Discharge Medicines
  const dischargeGroupsMap = new Map<string, typeof dischargeMedicines>()
  for (const rx of dischargeMedicines) {
    if (!rx.admissionId) continue
    if (!dischargeGroupsMap.has(rx.admissionId)) {
      dischargeGroupsMap.set(rx.admissionId, [])
    }
    dischargeGroupsMap.get(rx.admissionId)!.push(rx)
  }
  let dischargeGroups = Array.from(dischargeGroupsMap.entries()).map(([admissionId, meds]) => {
    const admission = meds[0].admission
    const patientName = admission.patient.user.name || "Unknown"
    return {
      admissionId,
      patientName,
      patientInitial: patientName.charAt(0).toUpperCase(),
      patientId: admission.patient.patientId || "Unknown",
      doctorName: admission.primaryDoctor.user.name || "Unknown",
      bedInfo: admission.bed ? `${admission.bed.ward.name} - Bed ${admission.bed.bedNumber}` : "Unknown",
      wardName: admission.bed?.ward.name || "Unknown",
      admissionDate: admission.admissionDate,
      medicines: meds,
    }
  })

  if (q) {
    dischargeGroups = dischargeGroups.filter((g) => {
      const medicineText = g.medicines.map((m) => m.medicineName.toLowerCase()).join(" ")
      return (
        g.patientName.toLowerCase().includes(q) ||
        g.patientId.toLowerCase().includes(q) ||
        g.doctorName.toLowerCase().includes(q) ||
        g.bedInfo.toLowerCase().includes(q) ||
        medicineText.includes(q)
      )
    })
  }

  // Tab filtering
  const showIPD = source === "ALL" || source === "IPD"
  const showOPD = source === "ALL" || source === "OPD"
  const showOT = source === "ALL" || source === "OT"
  const showDischarge = source === "ALL" || source === "DISCHARGE"

  const totalOPD = opdAppointments.length
  const totalIPDAdmitted = admittedPatientsData.length
  const totalOT = otSurgeries.length
  const totalDischarge = dischargeGroups.length

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Clinical Header Bar */}
      <div className="rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.03)] p-5 md:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-900" />
              <p className="text-[11px] font-mono uppercase tracking-wider text-slate-500 font-semibold">
                Hospital Pharmacy &bull; Dispensing & Inpatient Regimen Monitor
              </p>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
              Pharmacy Prescriptions & Regimen Queue
            </h1>
            <p className="text-xs text-slate-500">
              Central operational console for inpatient regimens, OPD consultation dispensing, OT requisitions, and discharge fulfillment.
            </p>
          </div>

          {/* Metric Status Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/pharmacy/pos?source=IPD"
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                source === "IPD"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <BedDouble className="w-3.5 h-3.5" />
              <span>IPD Inpatients</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${source === "IPD" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"}`}>
                {totalIPDAdmitted}
              </span>
            </Link>

            <Link
              href="/dashboard/pharmacy/pos?source=OPD"
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                source === "OPD"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>OPD Queue</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${source === "OPD" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"}`}>
                {totalOPD}
              </span>
            </Link>

            <Link
              href="/dashboard/pharmacy/pos?source=OT"
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                source === "OT"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>OT Surgery</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${source === "OT" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"}`}>
                {totalOT}
              </span>
            </Link>

            <Link
              href="/dashboard/pharmacy/pos?source=DISCHARGE"
              className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                source === "DISCHARGE"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Discharge</span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${source === "DISCHARGE" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"}`}>
                {totalDischarge}
              </span>
            </Link>
          </div>
        </div>

        {/* Clean Clinical Search Form */}
        <form method="GET" className="grid grid-cols-1 md:grid-cols-12 gap-2.5 pt-4 border-t border-slate-100 items-center">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by patient name, UHID, doctor, bed number, or medication..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="md:col-span-4">
            <select
              name="source"
              defaultValue={source}
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 text-slate-900 font-semibold"
            >
              <option value="ALL">All Categories & Patients</option>
              <option value="IPD">Admitted IPD Inpatients ({totalIPDAdmitted})</option>
              <option value="OPD">OPD Consultation Queue ({totalOPD})</option>
              <option value="OT">OT Surgery Requests ({totalOT})</option>
              <option value="DISCHARGE">Discharge Medications ({totalDischarge})</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-center gap-1.5">
            <button
              type="submit"
              className="flex-1 h-9 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors active:scale-95"
            >
              Filter
            </button>
            {q && (
              <Link
                href="/dashboard/pharmacy/pos"
                className="h-9 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold flex items-center justify-center transition-colors"
              >
                Reset
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* ======================================================== */}
      {/* 1. ADMITTED IPD PATIENTS & ACTIVE MEDICINES MONITOR      */}
      {/* ======================================================== */}
      {showIPD && (
        <section className="space-y-4">
          <IPDAdmittedPatientsView admissions={admittedPatientsData} searchQuery={q} />
        </section>
      )}

      {/* ======================================================== */}
      {/* 2. DISCHARGE MEDICATIONS SECTION                         */}
      {/* ======================================================== */}
      {showDischarge && totalDischarge > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-800" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
              Discharge Fulfillment Orders ({totalDischarge})
            </h3>
            <span className="text-xs text-slate-500 font-mono">
              &bull; Patients cleared for discharge with take-home medicines
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dischargeGroups.map((group) => (
              <div
                key={group.admissionId}
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                      {group.patientInitial}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{group.patientName}</h4>
                      <p className="font-mono text-slate-500 text-xs">{group.patientId}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                    DISCHARGE
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    Discharge Medications ({group.medicines.length})
                  </p>
                  <div className="space-y-1 text-slate-900 font-medium">
                    {group.medicines.slice(0, 3).map((rx) => (
                      <div key={rx.id} className="flex justify-between">
                        <span>{rx.medicineName}</span>
                        <span className="text-slate-500 text-[11px] font-mono">{rx.dosage}</span>
                      </div>
                    ))}
                    {group.medicines.length > 3 && (
                      <p className="text-[10px] text-slate-500">
                        +{group.medicines.length - 3} more items...
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-0.5">
                  <p className="flex items-center gap-1.5 font-medium text-slate-700">
                    <BedDouble className="w-3.5 h-3.5 text-slate-500" />
                    {group.bedInfo}
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-500">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                    Dr. {group.doctorName}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <DischargeDispenseCard
                    admissionId={group.admissionId}
                    patientName={group.patientName}
                    bedInfo={group.bedInfo}
                    prescriptions={group.medicines
                      .filter((rx) => rx.pharmacyStatus === "PENDING")
                      .map((rx) => ({
                        id: rx.id,
                        medicineName: rx.medicineName,
                        dosage: rx.dosage,
                        frequency: rx.frequency,
                        duration: rx.duration,
                        instruction: rx.instruction,
                        unitPrice: rx.medicine?.inventoryBatches[0]?.sellingPrice ?? rx.medicine?.unitPrice ?? 0,
                        availableStock: rx.medicine
                          ? rx.medicine.inventoryBatches.reduce((s, b) => s + b.quantity, 0)
                          : undefined,
                        linked: !!rx.medicineId,
                        quantity: rx.quantity,
                      }))}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 3. OPD QUEUE SECTION                                     */}
      {/* ======================================================== */}
      {showOPD && totalOPD > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-800" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
              Outpatient (OPD) Consultation Prescriptions ({totalOPD})
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {opdAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                      {appointment.patient.user.name?.charAt(0).toUpperCase() || "P"}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{appointment.patient.user.name}</h4>
                      <p className="font-mono text-slate-500 text-xs">{appointment.patient.patientId}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                    OPD
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                    Prescribed Items
                  </p>
                  <div className="space-y-1 text-slate-900 font-medium">
                    {appointment.medicalRecords.flatMap((rec) =>
                      rec.prescriptions.flatMap((p) =>
                        p.medications.slice(0, 3).map((med) => (
                          <div key={med.id} className="flex justify-between">
                            <span>{med.medicationName}</span>
                            <span className="text-slate-500 text-[11px] font-mono">{med.frequency}</span>
                          </div>
                        ))
                      )
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500 space-y-0.5">
                  <p className="flex items-center gap-1.5 text-slate-700 font-medium">
                    <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                    Dr. {appointment.doctor.user.name}
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-500 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {format(new Date(appointment.appointmentDate), "MMM dd, yyyy")} &bull; {appointment.appointmentTime}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <DispenseButton
                    appointmentId={appointment.id}
                    patientName={appointment.patient.user.name || "Patient"}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ======================================================== */}
      {/* 4. OT SURGERIES SECTION                                  */}
      {/* ======================================================== */}
      {showOT && totalOT > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <span className="w-2 h-2 rounded-full bg-slate-800" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight uppercase">
              Operation Theatre Requisitions ({totalOT})
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {otSurgeries.map((surgery) => {
              const otMeds: any[] = (surgery.consumables as any)?.otPharmacy || []
              return (
                <div
                  key={surgery.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold text-sm flex items-center justify-center">
                        {surgery.patient.user.name?.charAt(0).toUpperCase() || "P"}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{surgery.patient.user.name}</h4>
                        <p className="font-mono text-slate-500 text-xs">{surgery.patient.patientId}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold">
                      OT SURGERY
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
                      Required Consumables ({otMeds.length})
                    </p>
                    <div className="space-y-1 text-slate-900 font-medium">
                      {otMeds.slice(0, 3).map((m, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>{m.medicineName}</span>
                          <span className="font-mono font-bold text-slate-700">x{m.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 space-y-0.5">
                    <p className="font-semibold text-slate-900">
                      Procedure: {surgery.procedureName}
                    </p>
                    <p className="text-slate-600">
                      Surgeon: Dr. {surgery.leadSurgeon.user.name}
                    </p>
                    <p className="text-slate-400 font-mono">
                      Scheduled: {format(new Date(surgery.scheduledDate), "dd MMM yyyy")}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <Link
                      href={`/dashboard/pharmacy/dispense-ot/${surgery.id}`}
                      className="w-full inline-flex items-center justify-center h-9 px-4 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-colors active:scale-95"
                    >
                      Bill & Dispense OT Consumables
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Global Fallback Empty State */}
      {totalIPDAdmitted === 0 && totalOPD === 0 && totalOT === 0 && totalDischarge === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-16 text-center space-y-3">
          <Pill className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Prescriptions or Admissions Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            There are currently no patients or prescriptions matching your search.
          </p>
        </div>
      )}
    </div>
  )
}
