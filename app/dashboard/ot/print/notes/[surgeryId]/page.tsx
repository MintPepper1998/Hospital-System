import React from "react"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { getHospitalSettings } from "@/app/actions/settings"
import { OTPrintClient } from "@/components/ot/ot-print-client"

export default async function OperationNotesPrintPage(props: { params: Promise<{ surgeryId: string }> }) {
  const params = await props.params;
  const surgery = await prisma.surgery.findUnique({
    where: { id: params.surgeryId },
    include: {
      patient: { include: { user: true } },
      leadSurgeon: { include: { user: true } },
      theater: true,
      staffAssignments: {
        include: { staff: { include: { user: true } } }
      }
    }
  })

  if (!surgery) return notFound()

  const settings = await getHospitalSettings()

  const patientAge = surgery.patient.dateOfBirth
    ? Math.abs(new Date(Date.now() - new Date(surgery.patient.dateOfBirth).getTime()).getUTCFullYear() - 1970)
    : null

  const patientInfo = {
    regdNo: surgery.patient.patientId || surgery.patient.id,
    name: surgery.patient.user?.name || '--',
    bedNo: "OT",
    ageSex: `${patientAge ?? '--'} Y / ${surgery.patient.gender || '--'}`,
    doctor: surgery.leadSurgeon?.user?.name ? `Dr. ${surgery.leadSurgeon.user.name}` : '--',
    doa: format(new Date(surgery.scheduledDate), "dd/MM/yyyy, hh:mm a"),
    diagnosis: surgery.diagnosis || surgery.procedureName,
    wardName: "Operation Theater"
  }

  const assistants = surgery.staffAssignments
    .filter(a => a.role === "Assistant Surgeon")
    .map(a => a.staff.user.name)
    .join(", ")

  return (
    <div className="bg-white min-h-screen text-black">
      <OTPrintClient surgeryId={surgery.id} title="Operation Notes" />
      
      <style dangerouslySetInnerHTML={{__html: `
        @page { size: A4; margin: 0; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
          .print-page { padding: 10mm 15mm; width: 210mm; min-height: 297mm; box-sizing: border-box; margin: 0 auto; page-break-after: always; }
        }
        @media screen {
          .print-page { max-width: 210mm; min-height: 297mm; margin: 20px auto; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); padding: 10mm 15mm; }
        }
      `}} />

      <div className="print-page print-area">
        <FormHeader patient={patientInfo} settings={settings} hidePatientDetails={true} />
        
        <div className="text-center mb-4 mt-2">
          <h2 className="text-xl font-bold uppercase tracking-widest text-black inline-block border-b-2 border-black pb-1">
            OPERATION NOTES
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs font-medium text-black border-b border-black pb-4 mb-4">
          <div className="flex gap-2">
            <span className="font-bold w-24">Patient Name:</span>
            <span>{surgery.patient.user?.name}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-24">Date:</span>
            <span>{format(new Date(surgery.scheduledDate), "dd/MM/yyyy")}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-24">Age / Sex:</span>
            <span>{patientInfo.ageSex}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-24">Regd No:</span>
            <span>{patientInfo.regdNo}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="border border-black p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-medium text-black">
            <div><span className="font-bold w-36 inline-block">Surgeon:</span> Dr. {surgery.leadSurgeon?.user?.name}</div>
            <div><span className="font-bold w-36 inline-block">Anesthetist:</span> {surgery.anesthetistName ? `Dr. ${surgery.anesthetistName}` : "________________"}</div>
            <div><span className="font-bold w-36 inline-block">Assistant(s):</span> {assistants || "________________"}</div>
            <div><span className="font-bold w-36 inline-block">Type of Anesthesia:</span> ________________</div>
            <div><span className="font-bold w-36 inline-block">Surgery Start:</span> {surgery.actualStartTime ? format(new Date(surgery.actualStartTime), 'hh:mm a') : '_______'}</div>
            <div><span className="font-bold w-36 inline-block">Surgery End:</span> {surgery.actualEndTime ? format(new Date(surgery.actualEndTime), 'hh:mm a') : '_______'}</div>
          </div>

          <div className="border border-black p-3 flex flex-col min-h-[3.5rem]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black border-b border-black pb-1 mb-1">Pre-Operative Diagnosis</span>
            <div className="text-xs">{surgery.diagnosis || "________________"}</div>
          </div>
          
          <div className="border border-black p-3 flex flex-col min-h-[3.5rem]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black border-b border-black pb-1 mb-1">Post-Operative Diagnosis</span>
            <div className="flex-1"></div>
          </div>

          <div className="border border-black p-3 flex flex-col min-h-[5rem]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black border-b border-black pb-1 mb-1">Operative Findings</span>
            <div className="flex-1 text-xs">{surgery.findings}</div>
          </div>

          <div className="border border-black p-3 flex flex-col min-h-[14rem]">
            <span className="text-[10px] font-bold uppercase tracking-widest text-black border-b border-black pb-1 mb-1">Procedure Details / Technique</span>
            <div className="flex-1 text-xs">{surgery.procedureNotes}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="border border-black p-3 min-h-[4rem] flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black border-b border-black pb-1 mb-1">Specimen Sent for Biopsy</span>
            </div>
            <div className="border border-black p-3 min-h-[4rem] flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-black border-b border-black pb-1 mb-1">Estimated Blood Loss / Transfusion</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end items-end">
          <div className="text-center">
            <div className="border-t border-black w-64 pt-2 font-bold text-black text-sm">Signature of Lead Surgeon</div>
            <div className="text-xs text-black mt-1">Name: Dr. {surgery.leadSurgeon?.user?.name}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormHeader({ patient, settings, hidePatientDetails }: { patient: any, settings?: any, hidePatientDetails?: boolean }) {
  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className={`flex items-end justify-between ${!hidePatientDetails ? 'border-b-[2px] border-blue-900/15 pb-4' : ''}`}>
        <div className="flex items-center gap-5">
          {settings?.logoUrl && (
            <div className="w-16 h-16 rounded-[14px] bg-white border-[1.5px] border-slate-100 shadow-sm flex items-center justify-center p-2.5 shrink-0 relative">
              <div className="absolute inset-0 rounded-[12px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] pointer-events-none"></div>
              <img src={settings.logoUrl} alt="Logo" className="max-h-full object-contain" />
            </div>
          )}
          <div className="flex flex-col justify-center">
            <h1 className="text-3xl font-black tracking-tight text-blue-950 uppercase leading-none mb-1">
              {settings?.name || "Shree Kamal Hospital"}
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {settings?.address || "Multi-Speciality Hospital & Diagnostic Centre • Odisha"}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 text-[9px] font-bold text-slate-400 text-right uppercase tracking-[0.15em]">
           <div className="flex items-center gap-2.5">
              <span>{settings?.phone || "+91 XXXXX XXXXX"}</span>
              <span className="w-[3px] h-[3px] rounded-full bg-blue-500/40"></span>
              <span>{settings?.email || "info@shreekamal.com"}</span>
           </div>
           {settings?.website && <div>{settings.website}</div>}
        </div>
      </div>
      
      {!hidePatientDetails && (
        <div className="rounded-xl border-[1.5px] border-blue-900/10 p-[5px] bg-slate-50">
          <div className="rounded-lg border-[1.5px] border-blue-900/5 bg-white overflow-hidden shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
            <table className="w-full text-left text-[11px] border-collapse !border-0">
              <tbody>
                <tr className="border-b-[1.5px] border-slate-100">
                  <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] w-[14%] border-r-[1.5px] border-slate-100/80">Regd. No.</th>
                  <td className="!border-0 py-2.5 px-4 font-bold text-slate-900 w-[18%] border-r-[1.5px] border-slate-100/80">{patient.regdNo}</td>
                  <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] w-[11%] border-r-[1.5px] border-slate-100/80">Name</th>
                  <td className="!border-0 py-2.5 px-4 font-black text-blue-950 text-[12px] w-[28%] border-r-[1.5px] border-slate-100/80">{patient.name}</td>
                  <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] w-[11%] border-r-[1.5px] border-slate-100/80">Bed No.</th>
                  <td className="!border-0 py-2.5 px-4 font-bold text-slate-900 w-[18%]">{patient.bedNo}</td>
                </tr>
                <tr className="border-b-[1.5px] border-slate-100">
                  <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] border-r-[1.5px] border-slate-100/80">Age / Sex</th>
                  <td className="!border-0 py-2.5 px-4 font-bold text-slate-900 border-r-[1.5px] border-slate-100/80">{patient.ageSex}</td>
                  <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] border-r-[1.5px] border-slate-100/80">Doctor</th>
                  <td className="!border-0 py-2.5 px-4 font-bold text-slate-900 border-r-[1.5px] border-slate-100/80">{patient.doctor}</td>
                  <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] border-r-[1.5px] border-slate-100/80">Date of Adm.</th>
                  <td className="!border-0 py-2.5 px-4 font-bold text-slate-900">{patient.doa}</td>
                </tr>
                <tr>
                  <th className="!border-0 py-2.5 px-4 bg-slate-50/50 font-extrabold text-blue-900/60 uppercase tracking-[0.1em] border-r-[1.5px] border-slate-100/80">Diagnosis</th>
                  <td colSpan={5} className="!border-0 py-2.5 px-4 font-bold text-slate-900">{patient.diagnosis}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
