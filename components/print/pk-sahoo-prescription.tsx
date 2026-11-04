"use client"

interface PKSahooPrescriptionProps {
  appointment: {
    id: string
    appointmentDate: Date
    appointmentTime: string | null
    reason: string | null
    bloodPressure: string | null
    pulse: string | null
    temperature: string | null
    weight: string | null
    height: string | null
    spo2: string | null
    patient: {
      patientId: string
      phone: string | null
      gender: string | null
      user: { name: string | null }
    }
    doctor: {
      user: { name: string | null }
      licenseNumber: string | null
      designation: string | null
      specialization: string | null
    }
  }
  age: number
  appointmentDate: string
  hospitalSettings: {
    name: string
    phone: string | null
    address: string | null
    logoUrl?: string | null
  }
}

const OPD_SERVICES = [
  "OPV", "BCG", "Pentavac", "Rotavirus", "Inj. Polio", "MR", "JE", "Pneumococcal"
]

const ADOLESCENT_SERVICES = [
  "Influenza (6m, 7m) &\neach year once Till 5yrs",
  "MMR (6m, 15m, 4-6yrs)",
  "Typhoid (6m-8m)",
  "Hepatitis A (1yr, 1½ yr)",
  "Chickenpox (15m, 18m)",
  "Meningococcal (9m,12m)",
  "HPV (Cervical Cancer)\n10 yrs For Girls",
  "T dap (0-14yrs)",
  "Td (17-18yrs)",
]

export function PKSahooPrescription({ appointment, age, appointmentDate, hospitalSettings }: PKSahooPrescriptionProps) {
  return (
    <div className="pk-prescription-page">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .pk-prescription-page { width: 210mm; min-height: 297mm; }
        }
        .pk-prescription-page {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          background: #fff;
          font-family: 'Segoe UI', Arial, sans-serif;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        /* Watermark — centered logo */
        .pk-watermark {
          position: absolute;
          top: 50%;
          left: 55%;
          transform: translate(-50%, -50%);
          width: 280px;
          height: 280px;
          opacity: 0.05;
          pointer-events: none;
          z-index: 0;
        }
        .pk-content { 
          position: relative; 
          z-index: 1; 
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 297mm;
        }
      `}</style>

      {/* Watermark — actual hospital logo, transparent in center */}
      <div className="pk-watermark flex items-center justify-center">
        <img 
          src="/images/shreekamal-logo.png" 
          alt=""
          className="w-full h-full object-contain"
        />
      </div>

      <div className="pk-content">
        {/* ══════════════════════════════════════════════════════════════ */}
        {/* HEADER: Hospital Logo + Contact Center + Name                */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="flex items-center px-5 pt-4 pb-1">
          {/* Logo — larger */}
          <div className="shrink-0">
            <img 
              src="/images/shreekamal-logo.png" 
              alt="Shree Kamal Hospital" 
              className="w-[90px] h-[90px] object-contain"
            />
          </div>

          {/* Center — Contact Info filling the gap */}
          <div className="flex-1 flex flex-col items-center justify-center px-3">
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-teal-500 to-transparent mb-1.5" />
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <span className="text-green-600">📞</span>
              <span className="font-semibold">{hospitalSettings.phone || "+91 6712301234"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mt-0.5">
              <span className="text-red-500">📍</span>
              <span>{hospitalSettings.address || "CHANDAPUR, PANIKOILI, JAJPUR, ODISHA, 755043"}</span>
            </div>
            <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-teal-500 to-transparent mt-1.5" />
          </div>

          {/* Hospital Name — larger */}
          <div className="shrink-0">
            <img 
              src="/logo-full.png" 
              alt="Shree Kamal Hospital" 
              className="h-[62px] object-contain"
            />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* DOCTOR + PATIENT INFO ROW                                    */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 gap-0 mx-4 mt-2 border border-gray-400 text-[11px]">
          {/* Left: Doctor Info */}
          <div className="border-r border-gray-400 p-2 space-y-1.5">
            <div className="flex">
              <span className="font-bold text-gray-800 w-[105px] shrink-0">Doctor Name :</span>
              <span className="flex-1 border-b border-dotted border-gray-400 text-gray-900 font-semibold pl-1">
                Dr. {appointment.doctor.user.name}
              </span>
            </div>
            <div className="flex">
              <span className="font-bold text-gray-800 w-[105px] shrink-0">Qualification :</span>
              <span className="flex-1 border-b border-dotted border-gray-400 text-gray-900 pl-1">
                {appointment.doctor.designation || appointment.doctor.specialization || "Paediatrics"}
              </span>
            </div>
            <div className="flex">
              <span className="font-bold text-red-600 w-[105px] shrink-0">Reg. No.</span>
              <span className="flex-1 border-b border-dotted border-gray-400 text-gray-900 pl-1">
                {appointment.doctor.licenseNumber || ""}
              </span>
            </div>
          </div>

          {/* Right: Patient Info */}
          <div className="p-2 space-y-1.5">
            <div className="flex">
              <span className="font-bold text-blue-700 w-[95px] shrink-0">Patient Name :</span>
              <span className="flex-1 border-b border-dotted border-gray-400 text-gray-900 font-semibold pl-1">
                {appointment.patient.user.name}
              </span>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-1">
                <span className="font-bold text-blue-700 w-[38px] shrink-0">Age :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 text-gray-900 pl-1">
                  {age ? `${age} yrs` : ""}
                </span>
              </div>
              <div className="flex flex-1">
                <span className="font-bold text-blue-700 w-[32px] shrink-0">Sex :</span>
                <span className="flex-1 border-b border-dotted border-gray-400 text-gray-900 pl-1">
                  {appointment.patient.gender || ""}
                </span>
              </div>
            </div>
            <div className="flex">
              <span className="font-bold text-blue-700 w-[95px] shrink-0">UHID No.</span>
              <span className="flex-1 border-b border-dotted border-gray-400 text-gray-900 pl-1">
                {appointment.patient.patientId}
              </span>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-1">
                <span className="font-bold text-blue-700 w-[95px] shrink-0">Phone No.</span>
                <span className="flex-1 border-b border-dotted border-gray-400 text-gray-900 pl-1">
                  {appointment.patient.phone || ""}
                </span>
              </div>
              <div className="flex shrink-0">
                <span className="font-bold text-blue-700">Date :</span>
                <span className="text-gray-900 font-medium pl-1">{appointmentDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* MAIN BODY: Left sidebar + Right Rx area                      */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="flex mx-4 mt-2 flex-1">
          {/* LEFT SIDEBAR — Vaccination Checklists + Vitals */}
          <div className="w-[185px] shrink-0 pr-1">
            {/* OPD SERVICES */}
            <div className="mb-1">
              <div className="bg-gradient-to-r from-teal-600 to-cyan-500 text-white text-center text-[10px] font-bold py-1 rounded-t-sm">
                OPD SERVICES
              </div>
              <div className="border border-t-0 border-gray-300 px-2 py-1">
                {OPD_SERVICES.map((service, i) => (
                  <div key={i} className="flex items-center gap-1.5 py-[2px]">
                    <div className="w-3 h-3 rounded-full border border-gray-400 shrink-0" />
                    <span className="text-[10px] text-gray-800">{service}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ADOLESCENT SERVICES */}
            <div className="mb-1">
              <div className="bg-gradient-to-r from-orange-500 to-amber-400 text-white text-center text-[10px] font-bold py-1 rounded-t-sm">
                ADOLESCENT SERVICES
              </div>
              <div className="border border-t-0 border-gray-300 px-2 py-1">
                {ADOLESCENT_SERVICES.map((service, i) => (
                  <div key={i} className="flex items-start gap-1.5 py-[2px]">
                    <div className="w-3 h-3 rounded-full border border-gray-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] text-gray-800 whitespace-pre-line leading-tight">{service}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VITALS */}
            <div>
              <div className="bg-gradient-to-r from-red-500 to-rose-400 text-white text-center text-[10px] font-bold py-1 rounded-t-sm">
                VITALS
              </div>
              <div className="border border-t-0 border-gray-300 px-2 py-1.5 space-y-1">
                {[
                  { label: "BP", value: appointment.bloodPressure },
                  { label: "Pulse", value: appointment.pulse ? `${appointment.pulse} bpm` : null },
                  { label: "Temp", value: appointment.temperature ? `${appointment.temperature}°F` : null },
                  { label: "SpO₂", value: appointment.spo2 ? `${appointment.spo2}%` : null },
                  { label: "Weight", value: appointment.weight ? `${appointment.weight} kg` : null },
                  { label: "Height", value: appointment.height || null },
                ].map((v, i) => (
                  <div key={i} className="flex items-center text-[10px]">
                    <span className="font-semibold text-gray-800 w-12 shrink-0">{v.label}</span>
                    <span className="text-gray-700 mr-1">:</span>
                    <span className={`flex-1 ${v.value ? 'font-semibold text-black' : 'border-b border-dotted border-gray-400'}`}>
                      {v.value || ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Rx Area */}
          <div className="flex-1 pl-4 flex flex-col">
            {/* Rx Symbol */}
            <div className="mb-2">
              <span className="text-4xl font-serif italic font-bold text-blue-800">R</span>
              <sub className="text-lg font-serif text-blue-800">x</sub>
            </div>

            {/* Prescription content area — blank for handwriting */}
            <div className="flex-1" />
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* FOOTER: Signature at the very bottom                         */}
        {/* ══════════════════════════════════════════════════════════════ */}
        <div className="mt-auto px-8 pb-4">
          <div className="flex justify-end">
            <div className="text-center">
              <div className="w-48 border-t border-gray-700 pt-1" />
              <p className="text-[11px] text-teal-700 font-medium tracking-wide">Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
