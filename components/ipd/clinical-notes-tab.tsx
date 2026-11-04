"use client"

import { useState } from "react"
import { format } from "date-fns"
import { User, FileText, Printer, Plus, Activity } from "lucide-react"
import { CardShell } from "./card-shell"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { addClinicalNote } from "@/lib/actions/clinical-notes"
import { toast } from "sonner"

export function ClinicalNotesTab({
  admission,
  allDoctors,
}: {
  admission: any
  allDoctors: any[]
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [doctorId, setDoctorId] = useState<string>("")
  const [note, setNote] = useState("")
  const [medications, setMedications] = useState("")
  const [labTests, setLabTests] = useState("")
  const [vitals, setVitals] = useState({
    bp: "",
    pulse: "",
    temperature: "",
    spO2: "",
    respiratoryRate: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    if (!doctorId) return toast.error("Please select a doctor")
    if (!note.trim()) return toast.error("Please enter a clinical note")

    setIsLoading(true)
    const result = await addClinicalNote({
      admissionId: admission.id,
      doctorId,
      note,
      medications,
      labTests,
      vitals,
    })
    setIsLoading(false)

    if (result.success) {
      toast.success("Note saved successfully")
      setIsAdding(false)
      setNote("")
      setMedications("")
      setLabTests("")
      setVitals({ bp: "", pulse: "", temperature: "", spO2: "", respiratoryRate: "" })
    } else {
      toast.error(result.error)
    }
  }

  const handlePrint = () => {
    if (!doctorId) return toast.error("Please select a doctor first to print their slip")
    
    const selectedDoctor = allDoctors.find(d => d.doctorId === doctorId)?.doctor
    
    // Using hidden iframe for native PWA printing

    const html = `
      <html>
        <head>
          <title>Clinical Note - ${admission.patient.user.name}</title>
          <style>
            @media print {
              @page { size: A4 portrait; margin: 0; }
              body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .page { width: 210mm; min-height: 297mm; }
              .no-print { display: none; }
            }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              margin: 0; 
              background: #fff; 
              color: #111827;
            }
            .page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              position: relative;
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }
            .watermark {
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
            .content-wrapper {
              position: relative;
              z-index: 1;
              display: flex;
              flex-direction: column;
              flex: 1;
              min-height: 297mm;
            }
            
            /* Header */
            .header { display: flex; align-items: center; padding: 16px 20px 4px; }
            .logo-left { width: 90px; height: 90px; object-fit: contain; flex-shrink: 0; }
            .header-center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 12px; }
            .divider-gradient { width: 100%; height: 2px; background: linear-gradient(to right, transparent, #14b8a6, transparent); }
            .contact-row { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #4b5563; margin-top: 6px; }
            .contact-row-2 { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #6b7280; margin-top: 2px; margin-bottom: 6px; }
            .logo-right { height: 62px; object-fit: contain; flex-shrink: 0; }

            /* Info Box */
            .info-box { display: grid; grid-template-columns: 1fr 1fr; margin: 8px 16px; border: 1px solid #9ca3af; font-size: 11px; }
            .info-left { border-right: 1px solid #9ca3af; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
            .info-right { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
            .info-row { display: flex; }
            .info-label { font-weight: bold; width: 105px; flex-shrink: 0; }
            .info-label-blue { color: #1d4ed8; font-weight: bold; width: 95px; flex-shrink: 0; }
            .info-label-red { color: #dc2626; font-weight: bold; width: 105px; flex-shrink: 0; }
            .info-val { flex: 1; border-bottom: 1px dotted #9ca3af; padding-left: 4px; color: #111827; }
            .info-val-bold { font-weight: 600; }
            
            /* Main Body */
            .main-body { display: flex; margin: 8px 16px; flex: 1; }
            .sidebar { width: 185px; flex-shrink: 0; padding-right: 4px; }
            
            /* Sidebar Sections */
            .side-section { margin-bottom: 4px; }
            .side-header-1 { background: linear-gradient(to right, #0d9488, #06b6d4); color: white; text-align: center; font-size: 10px; font-weight: bold; padding: 4px 0; border-radius: 2px 2px 0 0; }
            .side-header-2 { background: linear-gradient(to right, #f97316, #fbbf24); color: white; text-align: center; font-size: 10px; font-weight: bold; padding: 4px 0; border-radius: 2px 2px 0 0; }
            .side-header-3 { background: linear-gradient(to right, #ef4444, #fb7185); color: white; text-align: center; font-size: 10px; font-weight: bold; padding: 4px 0; border-radius: 2px 2px 0 0; }
            .side-content { border: 1px solid #d1d5db; border-top: none; padding: 4px 8px; }
            .side-item { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
            .side-item-top { align-items: flex-start; }
            .circle { width: 12px; height: 12px; border-radius: 50%; border: 1px solid #9ca3af; flex-shrink: 0; }
            .circle-mt { margin-top: 2px; }
            .side-text { font-size: 10px; color: #1f2937; }
            .side-text-multi { font-size: 10px; color: #1f2937; white-space: pre-line; line-height: 1.2; }
            
            /* Vitals specific */
            .vital-row { display: flex; align-items: center; font-size: 10px; margin-bottom: 4px; }
            .vital-label { font-weight: 600; color: #1f2937; width: 48px; flex-shrink: 0; }
            .vital-colon { color: #374151; margin-right: 4px; }
            .vital-val-blank { flex: 1; border-bottom: 1px dotted #9ca3af; }
            .vital-val-filled { flex: 1; font-weight: 600; color: #000; }

            /* Right Area */
            .rx-area { flex: 1; padding-left: 16px; display: flex; flex-direction: column; }
            .rx-symbol { margin-bottom: 8px; }
            .rx-r { font-size: 36px; font-family: serif; font-style: italic; font-weight: bold; color: #1e40af; }
            .rx-x { font-size: 18px; font-family: serif; color: #1e40af; vertical-align: sub; }
            
            /* Written Notes Sections */
            .written-section { margin-top: 15px; }
            .written-title { font-size: 12px; font-weight: bold; color: #1f2937; text-decoration: underline; margin-bottom: 4px; }
            .written-content { font-size: 13px; color: #111827; white-space: pre-wrap; line-height: 1.5; }

            /* Footer */
            .footer { margin-top: auto; padding: 0 32px 16px; display: flex; justify-content: flex-end; }
            .sig-box { text-align: center; }
            .sig-line { width: 192px; border-top: 1px solid #374151; padding-top: 4px; margin-top: 60px; }
            .sig-text { font-size: 11px; color: #0f766e; font-weight: 500; letter-spacing: 0.025em; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="page">
            
            <div class="watermark">
              <img src="/images/shreekamal-logo.png" style="width: 100%; height: 100%; object-fit: contain;" onerror="this.style.display='none'" />
            </div>

            <div class="content-wrapper">
              
              <!-- HEADER -->
              <div class="header">
                <img src="/images/shreekamal-logo.png" class="logo-left" onerror="this.style.display='none'" />
                <div class="header-center">
                  <div class="divider-gradient"></div>
                  <div class="contact-row">
                    <span style="color: #16a34a;">📞</span>
                    <span style="font-weight: 600;">+91 6712301234</span>
                  </div>
                  <div class="contact-row-2">
                    <span style="color: #ef4444;">📍</span>
                    <span>CHANDAPUR, PANIKOILI, JAJPUR, ODISHA, 755043</span>
                  </div>
                  <div class="divider-gradient"></div>
                </div>
                <img src="/logo-full.png" class="logo-right" onerror="this.style.display='none'" />
              </div>

              <!-- DOCTOR / PATIENT INFO -->
              <div class="info-box">
                <div class="info-left">
                  <div class="info-row">
                    <span class="info-label" style="color: #1f2937;">Doctor Name :</span>
                    <span class="info-val info-val-bold">Dr. ${selectedDoctor?.user?.name || '-'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label" style="color: #1f2937;">Qualification :</span>
                    <span class="info-val">${selectedDoctor?.specialization || 'Consultant'}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label-red">Reg. No.</span>
                    <span class="info-val">${selectedDoctor?.licenseNumber || ''}</span>
                  </div>
                </div>
                <div class="info-right">
                  <div class="info-row">
                    <span class="info-label-blue">Patient Name :</span>
                    <span class="info-val info-val-bold">${admission.patient.user.name}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label-blue">UHID No.</span>
                    <span class="info-val">${admission.patient.patientId}</span>
                  </div>
                  <div style="display: flex; gap: 12px;">
                    <div class="info-row" style="flex: 1;">
                      <span class="info-label-blue">Phone No.</span>
                      <span class="info-val">${admission.patient.phone || ''}</span>
                    </div>
                    <div class="info-row" style="flex-shrink: 0;">
                      <span class="info-label-blue" style="width: auto; margin-right: 4px;">Date :</span>
                      <span style="color: #111827; font-weight: 500;">${format(new Date(), "dd/MM/yyyy")}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- MAIN BODY -->
              <div class="main-body">
                
                <!-- LEFT SIDEBAR -->
                <div class="sidebar">
                  
                  <div class="side-section">
                    <div class="side-header-1">CLINICAL SERVICES</div>
                    <div class="side-content">
                      ${["Daily Round", "Follow-up", "Dressing", "Suture Removal", "Consultation", "Emergency", "Counseling"].map(s => 
                        '<div class="side-item">' +
                          '<div class="circle"></div>' +
                          '<span class="side-text">' + s + '</span>' +
                        '</div>'
                      ).join('')}
                    </div>
                  </div>

                  <div class="side-section">
                    <div class="side-header-2">WARD DETAILS</div>
                    <div class="side-content">
                      <div class="side-item side-item-top">
                        <div class="circle circle-mt"></div>
                        <span class="side-text-multi">Ward: ${admission.bed?.ward?.name || '-'}</span>
                      </div>
                      <div class="side-item side-item-top">
                        <div class="circle circle-mt"></div>
                        <span class="side-text-multi">Bed: ${admission.bed?.bedNumber || '-'}</span>
                      </div>
                      <div class="side-item side-item-top">
                        <div class="circle circle-mt"></div>
                        <span class="side-text-multi">Admitted On:\n${format(new Date(admission.admissionDate), "dd MMM yyyy")}</span>
                      </div>
                    </div>
                  </div>

                  <div class="side-section">
                    <div class="side-header-3">VITALS</div>
                    <div class="side-content" style="padding-top: 6px; padding-bottom: 6px;">
                      
                      <div class="vital-row">
                        <span class="vital-label">BP</span><span class="vital-colon">:</span>
                        <span class="${vitals.bp ? 'vital-val-filled' : 'vital-val-blank'}">${vitals.bp || ''}</span>
                      </div>
                      <div class="vital-row">
                        <span class="vital-label">Pulse</span><span class="vital-colon">:</span>
                        <span class="${vitals.pulse ? 'vital-val-filled' : 'vital-val-blank'}">${vitals.pulse || ''}</span>
                      </div>
                      <div class="vital-row">
                        <span class="vital-label">Temp</span><span class="vital-colon">:</span>
                        <span class="${vitals.temperature ? 'vital-val-filled' : 'vital-val-blank'}">${vitals.temperature || ''}</span>
                      </div>
                      <div class="vital-row">
                        <span class="vital-label">SpO₂</span><span class="vital-colon">:</span>
                        <span class="${vitals.spO2 ? 'vital-val-filled' : 'vital-val-blank'}">${vitals.spO2 || ''}</span>
                      </div>
                      <div class="vital-row">
                        <span class="vital-label">RR</span><span class="vital-colon">:</span>
                        <span class="${vitals.respiratoryRate ? 'vital-val-filled' : 'vital-val-blank'}">${vitals.respiratoryRate || ''}</span>
                      </div>

                    </div>
                  </div>

                </div>

                <!-- RIGHT RX AREA -->
                <div class="rx-area">
                  <div class="rx-symbol">
                    <span class="rx-r">R</span><sub class="rx-x">x</sub>
                  </div>
                  
                  ${note ? `
                    <div class="written-section">
                      <div class="written-title">Clinical Notes / Diagnosis</div>
                      <div class="written-content">${note}</div>
                    </div>
                  ` : ''}

                  ${medications ? `
                    <div class="written-section">
                      <div class="written-title">Medications</div>
                      <div class="written-content">${medications}</div>
                    </div>
                  ` : ''}

                  ${labTests ? `
                    <div class="written-section">
                      <div class="written-title">Lab Tests / Investigations</div>
                      <div class="written-content">${labTests}</div>
                    </div>
                  ` : ''}
                  
                </div>

              </div>

              <!-- FOOTER -->
              <div class="footer">
                <div class="sig-box">
                  <div class="sig-line"></div>
                  <p class="sig-text">Signature</p>
                </div>
              </div>

            </div>
          </div>
        </body>
      </html>
    `
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    
    if (iframe.contentDocument) {
      iframe.contentDocument.write(html)
      iframe.contentDocument.close()
    }

    setTimeout(() => {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe)
        }
      }, 1000)
    }, 250)
  }

  return (
    <div className="space-y-6 mt-6 animate-in fade-in duration-500">
      
      {!isAdding && (
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-500" />
            Clinical Notes
          </h2>
          <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700 rounded-xl">
            <Plus className="w-4 h-4 mr-1" />
            New Note
          </Button>
        </div>
      )}

      {isAdding && (
        <CardShell title="Add Doctor Visit Note" icon={Plus}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Visiting Doctor <span className="text-red-500">*</span></Label>
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue placeholder="Select doctor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allDoctors.map((doc: any) => (
                      <SelectItem key={doc.doctorId} value={doc.doctorId}>
                        Dr. {doc.doctor?.user?.name} ({doc.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                Vitals (Optional)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">BP</Label>
                  <Input value={vitals.bp} onChange={e => setVitals({...vitals, bp: e.target.value})} placeholder="120/80" className="bg-slate-50" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Pulse</Label>
                  <Input value={vitals.pulse} onChange={e => setVitals({...vitals, pulse: e.target.value})} placeholder="72" className="bg-slate-50" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Temp</Label>
                  <Input value={vitals.temperature} onChange={e => setVitals({...vitals, temperature: e.target.value})} placeholder="98.6" className="bg-slate-50" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">SpO2</Label>
                  <Input value={vitals.spO2} onChange={e => setVitals({...vitals, spO2: e.target.value})} placeholder="98%" className="bg-slate-50" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">RR</Label>
                  <Input value={vitals.respiratoryRate} onChange={e => setVitals({...vitals, respiratoryRate: e.target.value})} placeholder="16" className="bg-slate-50" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Clinical Notes / Diagnosis <span className="text-red-500">*</span></Label>
              <Textarea 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                placeholder="Patient condition, chief complaints, observations..." 
                className="min-h-[100px] bg-slate-50 border-slate-200" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Medications Changes</Label>
                <Textarea 
                  value={medications} 
                  onChange={e => setMedications(e.target.value)} 
                  placeholder="e.g. Add Paracetamol 500mg SOS" 
                  className="min-h-[80px] bg-slate-50 border-slate-200" 
                />
              </div>
              <div className="space-y-2">
                <Label>Lab Tests Ordered</Label>
                <Textarea 
                  value={labTests} 
                  onChange={e => setLabTests(e.target.value)} 
                  placeholder="e.g. CBC, LFT" 
                  className="min-h-[80px] bg-slate-50 border-slate-200" 
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button variant="secondary" onClick={handlePrint} className="bg-slate-100 hover:bg-slate-200 text-slate-700">
                  <Printer className="w-4 h-4 mr-2" />
                  Print Blank / Slip
                </Button>
              </div>
              <Button onClick={handleSave} disabled={isLoading || !doctorId || !note}>
                {isLoading ? "Saving..." : "Save Note"}
              </Button>
            </div>
          </div>
        </CardShell>
      )}

      {/* LIST OF PAST NOTES */}
      <div className="space-y-4">
        {admission.clinicalNotes?.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center bg-white/50 rounded-[2.5rem] border border-slate-100/50">
             <div className="p-5 bg-white border border-slate-100 shadow-sm rounded-full mb-4">
               <FileText className="w-8 h-8 text-slate-300 stroke-[1.5]" />
             </div>
             <h3 className="text-lg font-bold text-slate-800 tracking-tight mb-2">No Notes Yet</h3>
             <p className="text-sm text-slate-500 max-w-sm">There are no clinical notes recorded for this admission.</p>
          </div>
        ) : (
          admission.clinicalNotes?.map((cn: any) => (
            <CardShell key={cn.id} title={`Note by Dr. ${cn.authorName || 'Unknown'}`} icon={User} action={
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                {format(new Date(cn.date), "dd MMM yyyy, hh:mm a")}
              </span>
            }>
              <div className="space-y-4">
                
                {/* Vitals */}
                {(cn.bp || cn.pulse || cn.temperature || cn.spO2 || cn.respiratoryRate) && (
                  <div className="flex flex-wrap gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {cn.bp && <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-slate-400">BP</span><span className="text-sm font-bold text-slate-700">{cn.bp}</span></div>}
                    {cn.pulse && <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-slate-400">Pulse</span><span className="text-sm font-bold text-slate-700">{cn.pulse}</span></div>}
                    {cn.temperature && <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-slate-400">Temp</span><span className="text-sm font-bold text-slate-700">{cn.temperature}</span></div>}
                    {cn.spO2 && <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-slate-400">SpO2</span><span className="text-sm font-bold text-slate-700">{cn.spO2}</span></div>}
                    {cn.respiratoryRate && <div className="flex flex-col"><span className="text-[10px] uppercase font-bold text-slate-400">RR</span><span className="text-sm font-bold text-slate-700">{cn.respiratoryRate}</span></div>}
                  </div>
                )}

                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Clinical Note</h4>
                  <div className="p-4 bg-white border border-slate-100 rounded-xl text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                    {cn.note}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cn.medications && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Medications</h4>
                      <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-sm text-blue-900 whitespace-pre-wrap shadow-sm">
                        {cn.medications}
                      </div>
                    </div>
                  )}
                  {cn.labTests && (
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider">Lab Tests</h4>
                      <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl text-sm text-purple-900 whitespace-pre-wrap shadow-sm">
                        {cn.labTests}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </CardShell>
          ))
        )}
      </div>

    </div>
  )
}
