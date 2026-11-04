import React from "react"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { getHospitalSettings } from "@/app/actions/settings"
import { OTPrintClient } from "@/components/ot/ot-print-client"

export default async function AnesthesiaRecordPrintPage(props: { params: Promise<{ surgeryId: string }> }) {
  const params = await props.params;
  const surgery = await prisma.surgery.findUnique({
    where: { id: params.surgeryId },
    include: {
      patient: { include: { user: true } },
      leadSurgeon: { include: { user: true } },
      theater: true,
      staffAssignments: {
        include: { staff: { include: { user: true } } }
      },
    }
  })

  if (!surgery) return notFound()

  const settings = await getHospitalSettings()

  const patientAge = surgery.patient.dateOfBirth
    ? Math.abs(new Date(Date.now() - new Date(surgery.patient.dateOfBirth).getTime()).getUTCFullYear() - 1970)
    : null

  // Resolve anesthetist name: prefer direct field, then staff assignment with role "Anesthetist"
  const anesthetistAssignment = surgery.staffAssignments?.find(
    (a: any) => a.role?.toLowerCase().includes("anesthetist") || a.role?.toLowerCase().includes("anaesthetist")
  )
  const anesthetistName = surgery.anesthetistName
    || anesthetistAssignment?.staff?.user?.name
    || ""

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
      <OTPrintClient surgeryId={surgery.id} title="Pre-Anesthesia Record" />
      
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
            ANAESTHESIA RECORD
          </h2>
        </div>

        <div className="space-y-2 text-xs text-black font-medium leading-relaxed">
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Patient's Name</span>
            <span className="flex-1 border-b border-black text-center">{surgery.patient.user?.name}</span>
            <span className="whitespace-nowrap">Age/Sex</span>
            <span className="w-24 border-b border-black text-center">{patientInfo.ageSex}</span>
            <span className="whitespace-nowrap">Date</span>
            <span className="w-24 border-b border-black text-center">{format(new Date(surgery.scheduledDate), "dd/MM/yyyy")}</span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Surgeon</span>
            <span className="flex-1 border-b border-black text-center">{surgery.leadSurgeon?.user?.name ? `Dr. ${surgery.leadSurgeon.user.name}` : ""}</span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Anaesthetist</span>
            <span className="flex-1 border-b border-black text-center">{anesthetistName ? `Dr. ${anesthetistName}` : ""}</span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Time Started</span>
            <span className="flex-1 border-b border-black text-center">{surgery.actualStartTime ? format(new Date(surgery.actualStartTime), "hh:mm a") : ""}</span>
            <span className="whitespace-nowrap">Time finshed</span>
            <span className="flex-1 border-b border-black text-center">{surgery.actualEndTime ? format(new Date(surgery.actualEndTime), "hh:mm a") : ""}</span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Proposed Opertion</span>
            <span className="flex-1 border-b border-black text-center">{patientInfo.diagnosis}</span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Anaesthesia General/spinal/Regional/local</span>
            <span className="flex-1 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">Weight</span>
            <span className="w-32 border-b border-black text-center"></span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">History related to anaesthesia</span>
            <span className="flex-1 border-b border-black text-center"></span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="whitespace-nowrap">Other illness, DM</span>
            <span className="flex-1 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">HT</span>
            <span className="flex-1 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">IHD</span>
            <span className="flex-1 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">Infarct</span>
            <span className="flex-1 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">Asthma Kochs</span>
            <span className="flex-1 border-b border-black text-center"></span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="w-[120px]"></span>
            <span className="whitespace-nowrap">Allergy</span>
            <span className="flex-1 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">Alcohol</span>
            <span className="flex-1 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">Smoking</span>
            <span className="flex-1 border-b border-black text-center"></span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Investigataion .</span>
            <span className="ml-2 whitespace-nowrap">WNL \</span>
            <span className="flex-1 border-b border-black text-center"></span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">ASA Risk grade</span>
            <span className="ml-6 whitespace-nowrap">I / II / III / IV / V / Emergency</span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Premedication .</span>
            <span className="ml-4 whitespace-nowrap">Atropine / pyrolate / fortwin / phenergan / Dizpam</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="whitespace-nowrap">immediat pre p. pulse</span>
            <span className="w-24 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">/ Min BP</span>
            <span className="w-24 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">mm Hg / p 02</span>
            <span className="w-16 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">% Hb</span>
            <span className="w-16 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">Gm%</span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">position: supine/prone/lithotomy/latral</span>
            <span className="flex-1 border-b border-black text-center"></span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="whitespace-nowrap">Induction</span>
            <span className="flex-1 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">Tube size</span>
            <span className="w-32 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">cuff/pack</span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Maintaince.02/N2O/AIR/Flutin/Trilenne</span>
            <span className="flex-1 border-b border-black text-center"></span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Relaxnt: Tracrium/Pancurrium/Vcuronium</span>
            <span className="flex-1 border-b border-black text-center"></span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="whitespace-nowrap">Revesal Atropine</span>
            <span className="flex-1 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">Pyrolate</span>
            <span className="w-24 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">mg / Neostigmine</span>
            <span className="w-24 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">mg</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="whitespace-nowrap">Post- operative : pulse</span>
            <span className="w-32 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">/Min, Bp</span>
            <span className="w-32 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">mm Hg pa02</span>
            <span className="w-24 border-b border-black text-center"></span>
            <span className="whitespace-nowrap">%</span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Consciu / Extubated</span>
            <span className="flex-1 border-b border-black text-center"></span>
          </div>
        </div>

        <div className="mt-2 border border-black text-[11px] text-black">
          <div className="text-center font-bold border-b border-black py-0.5">
            DRUGS USED IN THEATRE
          </div>
          <div className="grid grid-cols-4 divide-x divide-black font-semibold">
            <div className="text-center py-0.5 border-b border-black col-span-1">IV FLUIDS</div>
            <div className="text-center py-0.5 border-b border-black col-span-2"></div>
            <div className="text-center py-0.5 border-b border-black col-span-1">MEDICINES</div>
          </div>
          <div className="grid grid-cols-4 divide-x divide-black min-h-[120px]">
            <div className="flex flex-col divide-y divide-black">
              <div className="px-2 py-0.5 h-6 flex items-center">DEXTROSE%</div>
              <div className="px-2 py-0.5 h-6 flex items-center">RINGRLAC</div>
              <div className="px-2 py-0.5 h-6 flex items-center">DNS</div>
              <div className="px-2 py-0.5 h-6 flex items-center">NS</div>
              <div className="px-2 py-0.5 h-6 flex items-center">BLOOD</div>
              <div className="px-2 py-0.5 h-6 flex items-center flex-1">HMCCEL</div>
            </div>
            <div className="flex flex-col divide-y divide-black">
              <div className="px-2 py-0.5 h-6 flex items-center">ATROPINE</div>
              <div className="px-2 py-0.5 h-6 flex items-center">PENTAZOCIN</div>
              <div className="px-2 py-0.5 h-6 flex items-center">PENTAZONIC</div>
              <div className="px-2 py-0.5 h-6 flex items-center">DIAZPAM</div>
              <div className="px-2 py-0.5 h-6 flex items-center">RANNITIDINE</div>
              <div className="px-2 py-0.5 h-6 flex items-center flex-1">PERINORM</div>
            </div>
            <div className="flex flex-col divide-y divide-black">
              <div className="px-2 py-0.5 h-6 flex items-center">VOMESET</div>
              <div className="px-2 py-0.5 h-6 flex items-center">DXONA</div>
              <div className="px-2 py-0.5 h-6 flex items-center">HYDROCORTISONE</div>
              <div className="px-2 py-0.5 h-6 flex items-center">LASIX</div>
              <div className="px-2 py-0.5 h-6 flex items-center">DERIPHYLINE</div>
              <div className="px-2 py-0.5 h-6 flex items-center flex-1">MEPHENTINE</div>
            </div>
            <div className="flex flex-col divide-y divide-black">
              <div className="px-2 py-0.5 h-6 flex items-center">NITROGLYCERING</div>
              <div className="px-2 py-0.5 h-6 flex items-center">DEPIN/NTG PATCH</div>
              <div className="px-2 py-0.5 h-6 flex items-center">INSILIN</div>
              <div className="px-2 py-0.5 h-6 flex items-center">AVIL</div>
              <div className="px-2 py-0.5 h-6 flex items-center">PHENERGAN</div>
              <div className="px-2 py-0.5 h-6 flex items-center flex-1">DICLORAN</div>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs text-black font-medium mt-3">
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Antibiotic during surgery</span>
            <span className="flex-1 border-b border-black"></span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Ryles tbe / Catheter / Cavafix</span>
            <span className="flex-1 border-b border-black"></span>
          </div>
          <div className="flex gap-2">
            <span className="whitespace-nowrap">Comments</span>
            <span className="flex-1 border-b border-black"></span>
          </div>
          
          <div className="flex justify-between items-end mt-8 pt-4 px-4">
            <div className="w-48 text-center pt-1 font-bold">
              Anaesthetist
            </div>
            <div className="w-48 text-center border-t border-black pt-1 font-bold italic">
              Signature
            </div>
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
