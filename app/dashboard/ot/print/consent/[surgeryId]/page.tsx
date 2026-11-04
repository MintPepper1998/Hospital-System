import React from "react"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { getHospitalSettings } from "@/app/actions/settings"
import { OTPrintClient } from "@/components/ot/ot-print-client"

export default async function ConsentFormPrintPage(props: { params: Promise<{ surgeryId: string }> }) {
  const params = await props.params;
  const surgery = await prisma.surgery.findUnique({
    where: { id: params.surgeryId },
    include: {
      patient: { include: { user: true } },
      leadSurgeon: { include: { user: true } },
      theater: true,
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

  return (
    <div className="bg-white min-h-screen text-black">
      <OTPrintClient surgeryId={surgery.id} title="Patient Consent Form" />
      
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
        <FormHeader patient={patientInfo} settings={settings} />
        
        <h2 className="text-center text-lg font-black uppercase tracking-widest text-slate-800 border-y-2 border-slate-200 py-2 my-6">
          Patient Consent Form for Surgery
        </h2>

        <div className="space-y-6 text-sm font-medium leading-relaxed text-slate-800 text-justify mt-8">
          <p>
            I, <span className="font-bold border-b border-black inline-block min-w-[200px] text-center">{surgery.patient.user?.name}</span> 
            (Age <span className="font-bold border-b border-black inline-block min-w-[50px] text-center">{patientAge ?? '--'}</span>), 
            resident of <span className="font-bold border-b border-black inline-block min-w-[250px] text-center">{surgery.patient.address || "__________________"}</span>, 
            do hereby give my full and informed consent to undergo the surgical procedure: 
            <span className="font-bold text-blue-900 mx-2">{surgery.procedureName}</span>
            under the supervision of Dr. <span className="font-bold">{surgery.leadSurgeon?.user?.name}</span> and their medical team.
          </p>

          <p>
            I have been explained the nature of the surgery, the anticipated benefits, the potential risks and complications, and the available alternative treatments. I acknowledge that no guarantees have been made to me regarding the results of the procedure.
          </p>

          <p>
            I also consent to the administration of such anesthetics as may be considered necessary by the Anesthetist. I understand that anesthesia carries its own risks and complications, which have been explained to me.
          </p>

          <p>
            I authorize the hospital to retain, preserve and use for scientific or teaching purposes, or dispose of any tissue or organ removed during the procedure.
          </p>
        </div>

        <div className="mt-32 flex justify-between items-end">
          <div className="text-center">
            <div className="border-t border-black w-48 pt-2 font-bold text-slate-800">Signature of Patient / Guardian</div>
            <div className="text-xs text-slate-500 mt-1">Date: _________________</div>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-48 pt-2 font-bold text-slate-800">Signature of Witness</div>
            <div className="text-xs text-slate-500 mt-1">Name: _________________</div>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-48 pt-2 font-bold text-slate-800">Signature of Surgeon</div>
            <div className="text-xs text-slate-500 mt-1">Date: _________________</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormHeader({ patient, settings }: { patient: any, settings?: any }) {
  return (
    <div className="mb-6 flex flex-col gap-4">
      {/* 1. EDITORIAL HOSPITAL HEADER */}
      <div className="flex items-end justify-between border-b-[2px] border-blue-900/15 pb-4">
        
        {/* Logo & Identity */}
        <div className="flex items-center gap-5">
          {settings?.logoUrl && (
            <div className="w-16 h-16 rounded-[14px] bg-white border-[1.5px] border-slate-100 shadow-sm flex items-center justify-center p-2.5 shrink-0 relative">
              <div className="absolute inset-0 rounded-[12px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] pointer-events-none"></div>
              <img 
                src={settings.logoUrl} 
                alt="Logo" 
                className="max-h-full object-contain" 
              />
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

        {/* Contact Module (Aligned Right) */}
        <div className="flex flex-col items-end gap-1.5 text-[9px] font-bold text-slate-400 text-right uppercase tracking-[0.15em]">
           <div className="flex items-center gap-2.5">
              <span>{settings?.phone || "+91 XXXXX XXXXX"}</span>
              <span className="w-[3px] h-[3px] rounded-full bg-blue-500/40"></span>
              <span>{settings?.email || "info@shreekamal.com"}</span>
           </div>
           {settings?.website && <div>{settings.website}</div>}
        </div>
      </div>

      {/* 2. DOUBLE-BEZEL PATIENT INFO GRID */}
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
    </div>
  )
}
