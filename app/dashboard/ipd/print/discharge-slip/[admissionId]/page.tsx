import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { DischargeSlipPrintClient } from "@/components/ipd/discharge-slip-print-client"
import { getHospitalSettings } from "@/app/actions/settings"

interface PageProps {
  params: Promise<{ admissionId: string }>
}

export default async function DischargeSlipPrintPage({ params }: PageProps) {
  const { admissionId } = await params

  if (!admissionId) notFound()

  const admission = await prisma.iPDAdmission.findUnique({
    where: { id: admissionId },
    include: {
      patient: { include: { user: true } },
      primaryDoctor: { include: { user: true } },
      bed: { include: { ward: true } },
      dischargeMedicines: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!admission) notFound()

  // Calculate age (years only)
  let ageString = ""
  if (admission.patient.dateOfBirth) {
    const dob = new Date(admission.patient.dateOfBirth)
    const years = Math.abs(new Date(Date.now() - dob.getTime()).getUTCFullYear() - 1970)
    ageString = `${years}Y`
  } else {
    ageString = "N/A"
  }

  // Get most recent surgery for this patient (if any)
  const recentSurgery = await prisma.surgery.findFirst({
    where: { patientId: admission.patientId },
    orderBy: { scheduledDate: 'desc' }
  })

  const hospitalSettings = await getHospitalSettings()
  const patient = admission.patient
  const admissionDate = new Date(admission.admissionDate)

  // Generate sequential discharge number: JAJ/00001/2026
  const disYear = admissionDate.getFullYear()
  const startOfYear = new Date(disYear, 0, 1)
  const endOfYear = new Date(disYear + 1, 0, 1)
  const admissionsBefore = await prisma.iPDAdmission.count({
    where: {
      AND: [
        { admissionDate: { gte: startOfYear } },
        { admissionDate: { lte: admissionDate } },
      ],
    },
  })
  // Use the count as the sequence (this admission is included in count)
  const disNumber = `JAJ/${String(admissionsBefore).padStart(5, "0")}/${disYear}`

  // Construct full address
  const addressParts = []
  if (patient.address) addressParts.push(patient.address)
  if (patient.city) addressParts.push(patient.city)
  if (patient.state) addressParts.push(patient.state)
  if (patient.pincode) addressParts.push(`PIN-${patient.pincode}`)
  const fullAddress = addressParts.join(", ")

  return (
    <DischargeSlipPrintClient admissionId={admissionId}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          body * { visibility: hidden; }
          #discharge-form-print, #discharge-form-print * { visibility: visible; }
          #discharge-form-print { position: absolute; left: 0; top: 0; width: 210mm; min-height: 297mm; padding: 15mm; box-sizing: border-box; margin: 0 auto; page-break-after: always; }
          .no-print { display: none !important; }
        }
      `}} />

      <div id="discharge-form-print" className="bg-white text-black max-w-[210mm] mx-auto min-h-[297mm] font-sans p-8 flex flex-col">
        
        {/* Header matching the image style */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-black">
          <div className="w-[15%]">
             {hospitalSettings.logoUrl && <img src={hospitalSettings.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />}
          </div>
          <div className="text-center w-[85%] pl-4">
            <h1 className="text-2xl font-black uppercase tracking-wide mb-1">{hospitalSettings.name}</h1>
            <p className="text-sm font-medium uppercase tracking-wider mb-2">
              {hospitalSettings.address}
            </p>
            <div className="flex justify-center gap-12 text-sm font-bold uppercase">
              <span>DIS. NO. {disNumber}</span>
              <span>MOB. : {hospitalSettings.phone}</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-10 mt-2">
          <span className="text-2xl font-bold uppercase tracking-wider border-b-2 border-black pb-1 inline-block px-4">
            DISCHARGE / REFERAL TICKET
          </span>
        </div>

        {/* Form Fields with solid underlines */}
        <div className="space-y-6 text-base font-medium flex-1 flex flex-col">
          
          <div className="flex items-end gap-2">
            <span className="shrink-0">Name</span>
            <div className="flex-1 border-b border-black text-lg uppercase px-2 font-bold leading-none">{patient.user.name}</div>
          </div>
          
          <div className="flex items-end gap-2">
            <span className="shrink-0">Address</span>
            <div className="flex-1 border-b border-black uppercase px-2 leading-none">{fullAddress}</div>
          </div>
          
          <div className="flex items-end gap-6">
            <div className="flex items-end gap-2 shrink-0">
              <span className="shrink-0">Age</span>
              <div className="w-24 border-b border-black uppercase px-2 text-center leading-none">{ageString}</div>
            </div>
            <div className="flex items-end gap-2 shrink-0">
              <span className="shrink-0">Sex</span>
              <div className="w-24 border-b border-black uppercase px-2 text-center leading-none">{patient.gender}</div>
            </div>
            <div className="flex items-end gap-2 flex-1">
              <span className="shrink-0">Regd. No.</span>
              <div className="flex-1 border-b border-black uppercase px-2 text-center leading-none">{patient.patientId}</div>
            </div>
          </div>

          <div className="flex items-end gap-6">
            <div className="flex items-end gap-2 flex-1">
              <span className="shrink-0">Date of Admission</span>
              <div className="flex-1 border-b border-black uppercase px-2 text-center leading-none">{format(admissionDate, "dd/MM/yyyy")}</div>
            </div>
            <div className="flex items-end gap-2 flex-1">
              <span className="shrink-0">Date of Opearation</span>
              <div className="flex-1 border-b border-black uppercase px-2 text-center leading-none">
                {recentSurgery?.actualStartTime ? format(new Date(recentSurgery.actualStartTime), "dd/MM/yyyy") : ""}
              </div>
            </div>
          </div>

          <div className="flex items-end gap-6">
            <div className="flex items-end gap-2 flex-1">
              <span className="shrink-0">Bed No</span>
              <div className="flex-1 border-b border-black uppercase px-2 text-center leading-none">{admission.bed.bedNumber}</div>
            </div>
            <div className="flex items-end gap-2 flex-1">
              <span className="shrink-0">Date of Discharge</span>
              <div className="flex-1 border-b border-black uppercase px-2 text-center leading-none">
                {admission.dischargeDate ? format(new Date(admission.dischargeDate), "dd/MM/yyyy") : ""}
              </div>
            </div>
          </div>
          
          <div className="flex items-end gap-2">
            <span className="shrink-0">Disease</span>
            <div className="flex-1 border-b border-black uppercase px-2 leading-none min-h-[1.2em]">{admission.diagnosis || ""}</div>
          </div>

          <div className="flex items-end gap-2">
            <span className="shrink-0">Treatment Given</span>
            <div className="flex-1 border-b border-black uppercase px-2 leading-none min-h-[1.2em]">{admission.treatmentGiven || ""}</div>
          </div>

          <div className="flex items-end gap-2 mt-4">
            <span className="shrink-0 font-bold">Treatment on Discharge</span>
          </div>

          {admission.dischargeMedicines.length > 0 ? (
            <div className="mt-2 mb-4">
              <table className="w-full text-[13px] border-collapse border border-black">
                <thead>
                  <tr className="bg-gray-100 font-semibold border-b border-black">
                    <th className="px-2 py-1 border-r border-black text-left">Medicine Name</th>
                    <th className="px-2 py-1 border-r border-black text-left w-20">Dosage</th>
                    <th className="px-2 py-1 border-r border-black text-left w-24">Frequency</th>
                    <th className="px-2 py-1 border-r border-black text-left w-20">Duration</th>
                    <th className="px-2 py-1 text-left">Instructions</th>
                  </tr>
                </thead>
                <tbody>
                  {admission.dischargeMedicines.map((med) => (
                    <tr key={med.id} className="border-b border-black last:border-0">
                      <td className="px-2 py-1 border-r border-black">{med.medicineName}</td>
                      <td className="px-2 py-1 border-r border-black">{med.dosage}</td>
                      <td className="px-2 py-1 border-r border-black">{med.frequency}</td>
                      <td className="px-2 py-1 border-r border-black">{med.duration}</td>
                      <td className="px-2 py-1">{med.instruction || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              {/* Spacer for handwriting area after Treatment Given */}
              <div className="min-h-[120px]"></div>
            </>
          )}

          <div className="flex items-end gap-2">
            <span className="shrink-0">Advised</span>
            <div className="flex-1 border-b border-black uppercase px-2 leading-none min-h-[1.2em]">{admission.adviceOnDischarge || ""}</div>
          </div>

          {/* Spacer for handwriting area after Advised */}
          <div className="min-h-[120px]"></div>

          <div className="flex items-end gap-2">
            <span className="shrink-0 font-bold">Condition Discharge</span>
            <div className="flex-1 border-b border-black uppercase px-2 leading-none min-h-[1.2em]">{admission.conditionAtDischarge || ""}</div>
          </div>

          {/* Signature at the bottom right */}
          <div className="mt-auto pt-12 flex justify-end">
            <div className="w-64 flex flex-col items-center">
              <div className="w-full border-b border-dotted border-slate-400 mb-1"></div>
              <div className="font-medium text-right w-full">Signature</div>
            </div>
          </div>
        </div>
      </div>
    </DischargeSlipPrintClient>
  )
}
