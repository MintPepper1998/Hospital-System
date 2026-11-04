import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { AdmissionSlipPrintClient } from "@/components/ipd/admission-slip-print-client"
import { getHospitalSettings } from "@/app/actions/settings"

interface PageProps {
  params: Promise<{ admissionId: string }>
}

export default async function AdmissionSlipPrintPage({ params }: PageProps) {
  const { admissionId } = await params

  if (!admissionId) notFound()

  const admission = await prisma.iPDAdmission.findUnique({
    where: { id: admissionId },
    include: {
      patient: { include: { user: true } },
      primaryDoctor: { include: { user: true } },
      bed: { include: { ward: true } },
    },
  })

  if (!admission) notFound()

  // Calculate age
  let ageString = ""
  if (admission.patient.dateOfBirth) {
    const dob = new Date(admission.patient.dateOfBirth)
    const diffMs = Date.now() - dob.getTime()
    const ageDt = new Date(diffMs)
    const years = Math.abs(ageDt.getUTCFullYear() - 1970)
    const months = ageDt.getUTCMonth()
    const days = ageDt.getUTCDate() - 1
    
    const parts = []
    if (years > 0) parts.push(`${years}Y`)
    if (months > 0) parts.push(`${months}M`)
    if (days > 0) parts.push(`${days}D`)
    ageString = parts.length > 0 ? parts.join(" ") : "0D"
  } else {
    ageString = "N/A"
  }

  const hospitalSettings = await getHospitalSettings()
  const patient = admission.patient
  const doctor = admission.primaryDoctor
  const admissionDate = new Date(admission.admissionDate)
  const doctorName = `Dr. ${doctor.user.name}`

  // Check if patient was previously registered (had other admissions before this one)
  const priorAdmissionCount = await prisma.iPDAdmission.count({
    where: { patientId: patient.id, id: { not: admissionId }, admissionDate: { lt: admissionDate } },
  })
  const wasPreviouslyRegistered = priorAdmissionCount > 0

  // Format Aadhaar with spaces (XXXX XXXX XXXX)
  const formattedAadhar = patient.aadharNumber
    ? patient.aadharNumber.replace(/(\d{4})(?=\d)/g, "$1 ").trim()
    : ""

  return (
    <AdmissionSlipPrintClient admissionId={admissionId}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: A4 portrait; margin: 6mm; }
          html, body { height: auto !important; overflow: visible !important; }
          body * { visibility: hidden; }
          #admission-form-print, #admission-form-print * { visibility: visible; }
          #admission-form-print { position: absolute; left: 0; top: 0; width: 100%; page-break-after: avoid; page-break-inside: avoid; }
          .no-print { display: none !important; }
        }
      `}} />

      <div id="admission-form-print" className="bg-white text-black max-w-[210mm] mx-auto font-sans text-[12px] leading-snug">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b-2 border-blue-900">
          <div className="w-[18%] flex justify-center">
             {hospitalSettings.logoUrl && <img src={hospitalSettings.logoUrl} alt="Logo" className="max-h-[55px] object-contain" />}
          </div>
          <div className="text-center w-[64%] text-blue-900">
            <h1 className="text-[22px] font-bold uppercase tracking-wide">{hospitalSettings.name}</h1>
            {hospitalSettings.address && <p className="text-[11px] font-medium mt-0.5">{hospitalSettings.address}</p>}
            <p className="text-[11px] mt-0.5">
              {hospitalSettings.phone && `📞 ${hospitalSettings.phone} `}
              {hospitalSettings.phone && hospitalSettings.email && ` | `}
              {hospitalSettings.email && `✉ ${hospitalSettings.email}`}
            </p>
          </div>
          <div className="w-[18%]"></div>
        </div>

        {/* Title */}
        <div className="text-center font-bold text-base mb-1.5 flex items-center justify-center">
          <span className="bg-blue-900 text-white px-5 py-0.5 border border-blue-900 shadow-sm rounded-sm uppercase tracking-wider">Admission Form</span>
        </div>

        {/* Main Grid */}
        <div className="border border-blue-900">
          
          {/* Row 1: Registration Status, UHID, IP No, Ward/Bed */}
          <div className="flex border-b border-blue-900">
            <div className="py-1 px-1.5 border-r border-blue-900 w-[28%] flex items-center">
              <span className="mr-1.5">Previously Registered :</span>
              {wasPreviouslyRegistered ? (
                <><span className="mr-1 font-bold text-base">☑</span><span className="mr-1.5">YES</span><span className="mr-1 font-bold text-base">☐</span><span>NO</span></>
              ) : (
                <><span className="mr-1 font-bold text-base">☐</span><span className="mr-1.5">YES</span><span className="mr-1 font-bold text-base">☑</span><span>NO</span></>
              )}
            </div>
            <div className="py-1 px-1.5 border-r border-blue-900 w-[22%] text-center">
              <div className="font-bold">UHID</div>
              <div className="font-medium">{patient.patientId}</div>
            </div>
            <div className="py-1 px-1.5 border-r border-blue-900 w-[22%] text-center">
              <div className="font-bold">I.P.No</div>
              <div className="uppercase font-medium">{admission.ipNumber || admissionId.slice(-10)}</div>
            </div>
            <div className="py-1 px-1.5 w-[28%] text-center">
              <div className="font-bold">Ward/Bed No</div>
              <div className="uppercase font-medium">{admission.bed.ward.name} - {admission.bed.bedNumber}</div>
            </div>
          </div>

          {/* Row 2: Patient Details — Two Columns */}
          <div className="flex border-b border-blue-900">
            {/* Left Column */}
            <div className="w-[50%] border-r border-blue-900">
              <div className="py-[3px] px-1.5 flex border-b border-blue-900"><span className="w-[120px] text-blue-800 font-medium shrink-0">Name Of Patient :</span> <span className="font-bold uppercase flex-1">{patient.user.name}</span></div>
              <div className="py-[3px] px-1.5 flex border-b border-blue-900"><span className="w-[120px] text-blue-800 font-medium shrink-0">Father/Guardian :</span> <span className="uppercase flex-1">{patient.fatherOrHusbandName || patient.fatherSpouseName || ""}</span></div>
              <div className="py-[3px] px-1.5 flex border-b border-blue-900"><span className="w-[120px] text-blue-800 font-medium shrink-0">Mother Name :</span> <span className="uppercase flex-1">{patient.motherName || ""}</span></div>
              <div className="py-[3px] px-1.5 flex border-b border-blue-900"><span className="w-[120px] text-blue-800 font-medium shrink-0">Occupation :</span> <span className="uppercase flex-1">{patient.occupation || ""}</span></div>
              <div className="py-[3px] px-1.5 flex border-b border-blue-900"><span className="w-[120px] text-blue-800 font-medium shrink-0">Contact No :</span> <span className="uppercase font-medium flex-1">{patient.phone || ""}</span></div>
              <div className="py-[3px] px-1.5 flex border-b border-blue-900"><span className="w-[120px] text-blue-800 font-medium shrink-0">Email :</span> <span className="flex-1 truncate">{patient.user.email?.includes("@hospital-erp.internal") ? "" : patient.user.email || ""}</span></div>
              <div className="py-[3px] px-1.5 flex border-b border-blue-900"><span className="w-[120px] text-blue-800 font-medium shrink-0">Ref. By Doctor :</span> <span className="uppercase flex-1">{patient.referredBy || ""}</span></div>
              <div className="py-[3px] px-1.5 flex"><span className="w-[120px] text-blue-800 font-medium shrink-0">Primary Doctor :</span> <span className="uppercase font-bold flex-1">{doctorName}</span></div>
            </div>

            {/* Right Column */}
            <div className="w-[50%]">
              <div className="flex border-b border-blue-900">
                <div className="w-[55%] py-[3px] px-1.5 border-r border-blue-900"><span className="text-blue-800 font-medium">Age/Gender : </span><span className="font-bold uppercase">{ageString} ({patient.gender})</span></div>
                <div className="w-[45%] py-[3px] px-1.5"><span className="text-blue-800 font-medium">Blood Grp : </span><span className="font-bold">{patient.bloodGroup || ""}</span></div>
              </div>
              <div className="flex border-b border-blue-900">
                <div className="w-[55%] py-[3px] px-1.5 border-r border-blue-900"><span className="text-blue-800 font-medium">Marital Status : </span><span className="uppercase">{patient.maritalStatus || ""}</span></div>
                <div className="w-[45%] py-[3px] px-1.5"><span className="text-blue-800 font-medium">Admitted On : </span><span className="font-medium">{format(admissionDate, "dd/MM/yyyy")}</span></div>
              </div>
              <div className="py-[3px] px-1.5 flex border-b border-blue-900 min-h-[38px]"><span className="w-20 shrink-0 text-blue-800 font-medium">Address : </span><span className="uppercase flex-1 leading-snug">{patient.address || ""}{patient.city ? `, ${patient.city}` : ""}{patient.state ? `, ${patient.state}` : ""}{patient.pincode ? `, PIN-${patient.pincode}` : ""}</span></div>
              <div className="flex border-b border-blue-900">
                 <div className="py-[3px] px-1.5 w-1/2 border-r border-blue-900"><span className="text-blue-800 font-medium">Nationality : </span><span className="uppercase">{patient.nationality || "INDIAN"}</span></div>
                 <div className="py-[3px] px-1.5 w-1/2"><span className="text-blue-800 font-medium">Religion : </span><span className="uppercase">{patient.religion || ""}</span></div>
              </div>
              <div className="py-[3px] px-1.5 border-b border-blue-900"><span className="text-blue-800 font-medium">Department : </span><span className="uppercase font-bold">{doctor.department || doctor.specialization || "GENERAL MEDICINE"}</span></div>
              <div className="py-[3px] px-1.5"><span className="text-blue-800 font-medium">Reason : </span><span className="uppercase">{admission.reason || ""}</span></div>
            </div>
          </div>

          {/* Row 3: Aadhaar, BSKY, Emergency Contact */}
          <div className="flex border-b border-blue-900">
            <div className="py-1 px-1.5 w-[33%] border-r border-blue-900 flex">
              <span className="text-blue-800 font-medium shrink-0">Aadhaar No : </span>
              <span className="font-medium ml-1">{formattedAadhar}</span>
            </div>
            <div className="py-1 px-1.5 w-[33%] border-r border-blue-900 flex">
              <span className="text-blue-800 font-medium shrink-0">BSKY : </span>
              <span className="font-medium ml-1">
                {admission.isBskyAdmission || patient.isBsky
                  ? `Yes — ${patient.bskyNumber || ""}`
                  : "No"}
              </span>
            </div>
            <div className="py-1 px-1.5 w-[34%] flex">
              <span className="text-blue-800 font-medium shrink-0">Emergency : </span>
              <span className="ml-1">
                {patient.emergencyContactName || ""}
                {patient.emergencyContact ? ` (${patient.emergencyContact})` : ""}
                {patient.emergencyContactRelation ? ` — ${patient.emergencyContactRelation}` : ""}
              </span>
            </div>
          </div>

          {/* Row 4: Payment Info */}
          <div className="flex border-b border-blue-900">
            <div className="py-1 px-1.5 w-[50%] border-r border-blue-900 flex">
              <span className="text-blue-800 font-medium shrink-0">Payment Mode : </span>
              <span className="font-medium ml-1 uppercase">{admission.isBskyAdmission ? "BSKY" : "CASH"}</span>
            </div>
            <div className="py-1 px-1.5 w-[50%] flex">
              <span className="text-blue-800 font-medium shrink-0">Advance Deposit : </span>
              <span className="font-bold ml-1">₹{(admission.initialDeposit || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* ICU Section */}
          <div className="py-1 px-1.5 border-b border-blue-900 font-bold">
            ICU and Critical Care Consultant/in-Charge : {doctorName} ( In case of admission in ICU )
          </div>

          {/* Declaration */}
          <div className="px-2 py-1.5 border-b border-blue-900 text-[11.5px] leading-[1.5]">
            <div className="font-bold text-[13px] mb-1">Declaration:</div>
            <div>
              1. I am having Health Insurance Policy issued by <span className="inline-block w-[280px] border-b border-blue-900 mx-1"></span> ( Copy enclosed )<br/>
              <span className="ml-4">I undertake to pay the hospital bill in full, if</span><br/>
              <span className="ml-4">( a ) The TPA reject for cashless treatment (OR) ( b ) The TPA does not respond till the time of discharge.</span>
            </div>
            <div>
              2. I am Corporate credit patient referred by company <span className="inline-block w-[240px] border-b border-blue-900 mx-1"></span> with E.I.D <span className="inline-block w-[110px] border-b border-blue-900 mx-1"></span>
            </div>
            <div>
              3. I am Direct patient and shall pay the bill as per your terms, Cash/Credit Card No <span className="inline-block w-[260px] border-b border-blue-900 mx-1"></span>
            </div>
            <div>
              4. I have been explained about patient rights and responsibilities by <span className="inline-block w-[150px] border-b border-blue-900 mx-1"></span> in <span className="inline-block w-[110px] border-b border-blue-900 mx-1"></span> language.
            </div>
            <div className="font-bold mt-1">
              Note : After Registration / Admission No changes in above will be done.
            </div>
            
            {/* Signatures */}
            <div className="flex justify-between mt-5 px-3 items-end">
              <div className="text-center w-56">
                <div className="border-t border-blue-900 pt-0.5 font-medium">Signature of the Admission Clerk</div>
              </div>
              <div className="text-center w-68">
                <div className="text-center mb-3 text-[10px]">I hereby declare that the above information is correct.</div>
                <div className="border-t border-blue-900 pt-0.5 font-medium">
                  Signature of the Patient / Attendant
                </div>
              </div>
            </div>
          </div>

          {/* Hospital Use Only */}
          <div className="py-1 text-center font-bold border-b border-blue-900 text-[13px]">
            FOR HOSPITAL USE ONLY
          </div>
          
          <div className="py-0.5 px-1.5 border-b border-blue-900 min-h-[18px] text-blue-800 font-medium">Diagnosis on Admission : </div>
          
          <div className="flex border-b border-blue-900 min-h-[16px] items-center">
            <div className="py-1 px-1.5 w-[70%] border-r border-blue-900 text-blue-800 font-medium">Final Diagnosis : </div>
            <div className="py-1 px-1.5 w-[30%] text-blue-800 font-medium">I.C.D Code : </div>
          </div>
          <div className="flex border-b border-blue-900 min-h-[16px] items-center">
            <div className="py-1 px-1.5 w-[70%] border-r border-blue-900 text-blue-800 font-medium">Secondary Diagnosis : </div>
            <div className="py-1 px-1.5 w-[30%] text-blue-800 font-medium">I.C.D Code : </div>
          </div>
          <div className="flex border-b border-blue-900 min-h-[16px] items-center">
            <div className="py-1 px-1.5 w-[70%] border-r border-blue-900 text-blue-800 font-medium">Surgery : </div>
            <div className="py-1 px-1.5 w-[30%] text-blue-800 font-medium">I.C.D Code : </div>
          </div>
          <div className="flex border-b border-blue-900 min-h-[16px] items-center">
            <div className="py-1 px-1.5 w-[70%] border-r border-blue-900 text-blue-800 font-medium">Type Of Anesthesia : </div>
            <div className="py-1 px-1.5 w-[30%] text-blue-800 font-medium">Date : </div>
          </div>
          <div className="flex border-b border-blue-900 min-h-[16px] items-center">
            <div className="py-1 px-1.5 w-[70%] border-r border-blue-900 text-blue-800 font-medium">Date Of Discharge : </div>
            <div className="py-1 px-1.5 w-[30%] text-blue-800 font-medium">Hospital Days : </div>
          </div>
          <div className="flex border-b border-blue-900 min-h-[16px] items-center">
            <div className="py-1 px-1.5 w-[70%] flex border-r border-blue-900 items-center">
               <span className="w-28 text-blue-800 font-medium">Cause Of Death : </span>
               <span className="mx-1.5 text-blue-800 font-medium flex items-center">Under 48 hrs. <span className="inline-block w-3.5 h-3.5 border border-blue-900 ml-1"></span></span>
               <span className="mx-1.5 text-blue-800 font-medium flex items-center">Above 48 hrs. <span className="inline-block w-3.5 h-3.5 border border-blue-900 ml-1"></span></span>
            </div>
            <div className="py-1 px-1.5 w-[30%] text-blue-800 font-medium">Date : </div>
          </div>
          
          <div className="py-0.5 px-1.5 border-b border-blue-900 flex items-center min-h-[18px]">
             <span className="font-bold w-20">RESULT : </span>
             <span className="mx-2 text-blue-800 font-medium flex items-center">Recovered <span className="w-3.5 h-3.5 border border-blue-900 ml-1"></span></span>
             <span className="mx-2 text-blue-800 font-medium flex items-center">Improved <span className="w-3.5 h-3.5 border border-blue-900 ml-1"></span></span>
             <span className="mx-2 text-blue-800 font-medium flex items-center">Diagnosis Only <span className="w-3.5 h-3.5 border border-blue-900 ml-1"></span></span>
             <span className="mx-2 text-blue-800 font-medium flex items-center">LAMA <span className="w-3.5 h-3.5 border border-blue-900 ml-1"></span></span>
             <span className="mx-2 text-blue-800 font-medium flex items-center">MLC <span className="w-3.5 h-3.5 border border-blue-900 ml-1"></span></span>
             <span className="mx-2 text-blue-800 font-medium flex items-center">Exp <span className="w-3.5 h-3.5 border border-blue-900 ml-1"></span></span>
          </div>
          
          {/* Obstetric Data */}
          <div className="py-0.5 px-1.5 font-bold">Obstetric Data : </div>
          <div className="flex pb-1 pt-0.5">
             <div className="w-1/3 px-3 space-y-1.5">
                <div className="flex justify-between items-end"><span className="text-blue-800 font-medium">Normal</span><div className="border-b border-blue-900 w-[55%]"></div></div>
                <div className="flex justify-between items-end"><span className="text-blue-800 font-medium">Abnormal</span><div className="border-b border-blue-900 w-[55%]"></div></div>
                <div className="flex justify-between items-end"><span className="text-blue-800 font-medium">Weight</span><div className="border-b border-blue-900 w-[55%]"></div></div>
             </div>
             <div className="w-1/3 px-3 space-y-1.5">
                <div className="flex justify-between items-end"><span className="text-blue-800 font-medium">Live Birth</span><div className="border-b border-blue-900 w-[55%]"></div></div>
                <div className="flex justify-between items-end"><span className="text-blue-800 font-medium">Twin</span><div className="border-b border-blue-900 w-[55%]"></div></div>
                <div className="flex justify-between items-end"><span className="text-blue-800 font-medium">Still Birth</span><div className="border-b border-blue-900 w-[55%]"></div></div>
             </div>
             <div className="w-1/3 px-3 space-y-1">
                <div className="flex justify-between items-end"><span className="text-blue-800 font-medium">Date</span><div className="border-b border-blue-900 w-[55%]"></div></div>
                <div className="flex justify-between items-end"><span className="text-blue-800 font-medium">Male</span><div className="border-b border-blue-900 w-[55%]"></div></div>
                <div className="flex justify-between items-end"><span className="text-blue-800 font-medium">Female</span><div className="border-b border-blue-900 w-[55%]"></div></div>
             </div>
          </div>
          
        </div>
        
      </div>
    </AdmissionSlipPrintClient>
  )
}
