import { prisma } from "@/lib/prisma"
import { getHospitalSettings } from "@/app/actions/settings"
import { PrintHeader } from "@/components/print/print-header"
import { PrintFooter } from "@/components/print/print-footer"
import { notFound } from "next/navigation"
import { format, differenceInYears } from "date-fns"
import { OTPrintClient } from "./client"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ type?: string }>
}

export default async function OTPrintPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { type } = await searchParams

  const [surgery, settings] = await Promise.all([
    prisma.surgery.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: { select: { name: true } },
          },
        },
        leadSurgeon: {
          include: {
            user: { select: { name: true } },
          },
        },
        theater: true,
      },
    }),
    getHospitalSettings(),
  ])

  if (!surgery) notFound()

  // Fetch IPD admission for bed info (if patient is admitted)
  const ipdAdmission = await prisma.iPDAdmission.findFirst({
    where: {
      patientId: surgery.patientId,
      status: "ADMITTED",
    },
    include: {
      bed: { include: { ward: true } },
    },
    orderBy: { admissionDate: "desc" },
  })

  const patientName = surgery.patient?.user?.name || "—"
  const age = surgery.patient?.dateOfBirth
    ? `${differenceInYears(new Date(), new Date(surgery.patient.dateOfBirth))} years`
    : "—"
  const gender = surgery.patient?.gender || "—"
  const address = [
    surgery.patient?.address,
    surgery.patient?.city,
    surgery.patient?.state,
    surgery.patient?.pincode,
  ].filter(Boolean).join(", ") || "—"
  const surgeonName = surgery.leadSurgeon?.user?.name ? `Dr. ${surgery.leadSurgeon.user.name}` : "—"
  const opDate = format(new Date(surgery.scheduledDate), "dd MMM yyyy")
  const opTime = format(new Date(surgery.scheduledDate), "hh:mm a")
  const regNo = surgery.patient?.patientId || "—"
  const bedNo = ipdAdmission ? `${ipdAdmission.bed?.ward?.name || ""}-${ipdAdmission.bed?.bedNumber || ""}`.replace(/^-/, "") : "—"
  const theaterName = surgery.theater?.name || "—"
  const anesthetistName = surgery.anesthetistName || "—"
  const hospitalName = settings.name || "HOSPITAL"
  const durationMin = surgery.durationMinutes
  const procedureName = surgery.procedureName
  const diagnosis = surgery.diagnosis || ""
  const findings = surgery.findings || ""
  const procedureNotes = surgery.procedureNotes || ""
  const complications = surgery.complications || ""
  const bloodLoss = surgery.bloodLoss || ""
  const actualStart = surgery.actualStartTime ? format(new Date(surgery.actualStartTime), "hh:mm a") : ""
  const actualEnd = surgery.actualEndTime ? format(new Date(surgery.actualEndTime), "hh:mm a") : ""

  const otData = {
    patientName,
    age,
    gender,
    address,
    surgeonName,
    opDate,
    opTime,
    regNo,
    bedNo,
    theaterName,
    anesthetistName,
    hospitalName,
    durationMin,
    procedureName,
    diagnosis,
    findings,
    procedureNotes,
    complications,
    bloodLoss,
    actualStart,
    actualEnd,
  }

  const formType = type || "consent"

  return (
    <OTPrintClient formType={formType}>
      {formType === "consent" && (
        <div style={{ maxWidth: "210mm", margin: "0 auto", padding: "20px 24px", fontFamily: "serif", fontSize: "12px", lineHeight: 1.7, color: "#000" }}>
          <PrintHeader settings={settings} title="PATIENT CONSENT FORM" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 24px", marginTop: "16px", marginBottom: "16px", fontSize: "12px" }}>
            <p style={{ margin: 0 }}>Name of Patient: <strong>{otData.patientName}</strong></p>
            <p style={{ margin: 0 }}>Age / Sex: <strong>{otData.age} / {otData.gender}</strong></p>
            <p style={{ margin: 0 }}>Reg. No.: <strong>{otData.regNo}</strong></p>
            <p style={{ margin: 0 }}>Date of Admission: <strong>{otData.opDate}</strong></p>
            <p style={{ margin: 0, gridColumn: "1 / -1" }}>Address: <strong>{otData.address}</strong></p>
            <p style={{ margin: 0, gridColumn: "1 / -1" }}>
              Name of the Father/Husband: <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "300px" }}>&nbsp;</span>
            </p>
          </div>

          <p style={{ textAlign: "justify", marginBottom: "12px" }}>
            I (Name of the patient) <strong style={{ borderBottom: "1px solid #000", padding: "0 8px" }}>{otData.patientName}</strong> suffering from a condition requiring medical care hereby consent to the treatment of such case which may include routine diagnostic procedures and any such treatment as the attending physicians, surgeons, medical staff and others, consider to be necessary in this nursing home.
          </p>
          <p style={{ textAlign: "justify", marginBottom: "8px" }}>I have been explained all details of treatment procedures, and I am fully aware of the following points mentioned below:</p>

          <ol style={{ paddingLeft: "20px", textAlign: "justify", fontSize: "11px", lineHeight: 1.8 }}>
            <li style={{ marginBottom: "6px" }}>I understand that the practice of medicine surgery requiring diagnosis and treatment may involve risk of injury or even death. I Acknowledge that no guarantee has been made to me regarding the outcome of treatment in this medical centre.</li>
            <li style={{ marginBottom: "6px" }}>I understand that no procedure is performed upon a patient unless and until he/she has an opportunity to discuss them with the physician surgeon or other health professional to the patient&apos;s satisfaction.</li>
            <li style={{ marginBottom: "6px" }}>I understand that the physicians or the staff in this medical centre including the attending surgeons physicians are no employee or agent of this clinic rather independent contractors. Practioners who have been granted to the privilege of using its facilities for the care and treatment of the patients.</li>
            <li style={{ marginBottom: "6px" }}>I understand during the course of delivery it be normal vaginal delivery or a caesarean section, there is risk to the mother, child and both as well.</li>
            <li style={{ marginBottom: "6px" }}>I understand that there are life risks in medical treatment, may it be surgery (major or minor) under anaesthesia (general or local) or medical treatment further understand that hypersensitive reactions of different medicines on different individuals may occur which may even lead to death of the patient.</li>
            <li style={{ marginBottom: "6px" }}>I understand that none of the doctors and staff of this nursing home will be held responsible for any sort of mishap that may occur before during after any operative procedures and administration of anaesthesia further I understand that there is life risk and mishap may also occur due any sort of complication on the disease and its treatment and all the treatment papers are property of the nursing home. This form has been fully explained to me in my own language and I am satisfied that I understand its content and significance.</li>
            <li style={{ marginBottom: "6px" }}>I or attendant on behalf of the patient hereby authorise consulting medical personal to take independent decisions regarding investigations blood transfusion and choice of procedures for treatment of the patients.</li>
            <li style={{ marginBottom: "6px" }}>I or attendant on behalf of the patients hereby authorise the consulting medical personal that during the operations anaesthesia and treatment of the patient they can carry any modification of the operative procedure anaesthesia or treatment as required.</li>
          </ol>

          <div style={{ marginTop: "60px", display: "flex", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center", borderTop: "1px solid #000", width: "200px", paddingTop: "8px", fontSize: "11px" }}>Signature of Patient</div>
            <div style={{ textAlign: "center", borderTop: "1px solid #000", width: "200px", paddingTop: "8px", fontSize: "11px" }}>Signature of Witness</div>
          </div>

          <div style={{ marginTop: "30px" }}>
            <PrintFooter settings={settings} showElectronic={false} />
          </div>
        </div>
      )}

      {formType === "anaesthesia" && (
        <div style={{ maxWidth: "210mm", margin: "0 auto", padding: "20px 24px", fontFamily: "sans-serif", fontSize: "12px", lineHeight: 1.6, color: "#000" }}>
          <PrintHeader settings={settings} title="ANAESTHESIA RECORD" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px", marginTop: "14px", marginBottom: "12px", fontSize: "11px" }}>
            <p style={{ margin: 0 }}>Patient&apos;s Name: <strong style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "160px" }}>{otData.patientName}</strong></p>
            <p style={{ margin: 0 }}>Date: <strong style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "120px" }}>{otData.opDate}</strong></p>
            <p style={{ margin: 0 }}>Age / Sex: <strong style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "120px" }}>{otData.age} / {otData.gender}</strong></p>
            <p style={{ margin: 0 }}>Reg. No.: <strong style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "120px" }}>{otData.regNo}</strong></p>
            <p style={{ margin: 0, gridColumn: "1 / -1" }}>Surgeon: <strong style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "300px" }}>{otData.surgeonName}</strong></p>
            <p style={{ margin: 0 }}>Time Started: <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "120px" }}>{otData.actualStart}</span></p>
            <p style={{ margin: 0 }}>Time Finished: <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "120px" }}>{otData.actualEnd}</span></p>
            <p style={{ margin: 0, gridColumn: "1 / -1" }}>Proposed Operation: <strong style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "300px" }}>{otData.procedureName}</strong></p>
            <p style={{ margin: 0 }}>Anaesthesia (General/Spinal/Regional/Local): <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "120px" }}>&nbsp;</span></p>
            <p style={{ margin: 0 }}>Weight: <span style={{ borderBottom: "1px solid #000", display: "inline-block", minWidth: "80px" }}>&nbsp;</span> kg</p>
          </div>

          <div style={{ fontSize: "11px", marginBottom: "16px" }}>
            <p style={{ margin: "4px 0" }}>History related to anaesthesia: <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "100%" }}>&nbsp;</span></p>
            <p style={{ margin: "4px 0" }}>Other illness: DM__ HT__ IHD__ Infarct__ Asthma__ Kochs__ Allergy__ Alcohol__ Smoking__</p>
            <p style={{ margin: "4px 0" }}>Investigation: WNL \ <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "300px" }}>&nbsp;</span></p>
            <p style={{ margin: "4px 0" }}>ASA Risk Grade: I / II / III / IV / V / Emergency</p>
            <p style={{ margin: "4px 0" }}>Premedication: Atropine / Pyrolate / Fortwin / Phenergan / Diazepam</p>
            <p style={{ margin: "4px 0" }}>Immediate Pre-Op: Pulse _____ /Min &nbsp; BP _______ mm Hg &nbsp; SpO2 ______% &nbsp; Hb ______ Gm%</p>
            <p style={{ margin: "4px 0" }}>Position: Supine / Prone / Lithotomy / Lateral / <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "120px" }}>&nbsp;</span></p>
            <p style={{ margin: "4px 0" }}>Induction: <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "180px" }}>&nbsp;</span> Tube Size: <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "60px" }}>&nbsp;</span> Cuff/Pack: <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "60px" }}>&nbsp;</span></p>
            <p style={{ margin: "4px 0" }}>Maintenance: O2 / N2O / AIR / Fluothane / Trilene &nbsp; <span style={{ borderBottom: "1px solid #000", display: "inline-block", width: "200px" }}>&nbsp;</span></p>
          </div>

          {/* Drugs Used Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", marginBottom: "12px", textAlign: "center" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #000" }}>
                <th colSpan={4} style={{ padding: "4px", fontWeight: 700, fontSize: "11px", borderBottom: "1px solid #000", backgroundColor: "#f8f8f8" }}>DRUGS USED IN THEATRE</th>
              </tr>
              <tr style={{ borderBottom: "1px solid #000" }}>
                <th style={{ border: "1px solid #000", padding: "3px", width: "25%" }}>IV FLUIDS</th>
                <th style={{ border: "1px solid #000", padding: "3px", width: "25%" }}>&nbsp;</th>
                <th style={{ border: "1px solid #000", padding: "3px", width: "25%" }}>&nbsp;</th>
                <th style={{ border: "1px solid #000", padding: "3px", width: "25%" }}>MEDICINES</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["DEXTROSE %", "ATROPINE", "VOMESET", "NITROGLYCERIN"],
                ["RINGER LAC", "PENTAZOCIN", "DEXONA", "DEPIN / NTG PATCH"],
                ["DNS", "PENTAZOCIN", "HYDROCORTISONE", "INSULIN"],
                ["NS", "DIAZEPAM", "LASIX", "AVIL"],
                ["BLOOD", "RANITIDINE", "DERIPHYLLINE", "PHENERGAN"],
                ["HAEMACCEL", "PERINORM", "MEPHENTINE", "DICLORAN"],
              ].map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #000" }}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ border: "1px solid #000", padding: "3px", height: "22px" }}>{cell}</td>
                  ))}
                </tr>
              ))}
              {/* Empty rows for handwriting */}
              {[0, 1, 2].map((i) => (
                <tr key={`empty-${i}`} style={{ borderBottom: "1px solid #000" }}>
                  {[0, 1, 2, 3].map((j) => (
                    <td key={j} style={{ border: "1px solid #000", padding: "3px", height: "22px" }}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Vitals Monitoring Table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", marginBottom: "12px", textAlign: "center" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #000" }}>
                <th colSpan={13} style={{ padding: "4px", fontWeight: 700, fontSize: "11px", borderBottom: "1px solid #000", backgroundColor: "#f8f8f8" }}>VITAL SIGNS MONITORING (EVERY 15 MIN)</th>
              </tr>
              <tr style={{ borderBottom: "1px solid #000" }}>
                <th style={{ border: "1px solid #000", padding: "2px" }}>Time</th>
                {Array.from({ length: 12 }).map((_, i) => (
                  <th key={i} style={{ border: "1px solid #000", padding: "2px", width: "7%" }}>&nbsp;</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {["Pulse", "BP", "SpO2", "EtCO2", "Resp Rate"].map((label) => (
                <tr key={label} style={{ borderBottom: "1px solid #000" }}>
                  <td style={{ border: "1px solid #000", padding: "2px", fontWeight: 600, textAlign: "left", paddingLeft: "4px" }}>{label}</td>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <td key={i} style={{ border: "1px solid #000", padding: "2px", height: "20px" }}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "30px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
            <div style={{ textAlign: "center", borderTop: "1px solid #000", width: "200px", paddingTop: "6px" }}>Anaesthetist</div>
            <div style={{ textAlign: "center", borderTop: "1px solid #000", width: "200px", paddingTop: "6px" }}>Surgeon</div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <PrintFooter settings={settings} showElectronic={false} />
          </div>
        </div>
      )}

      {formType === "op_note" && (
        <div style={{ maxWidth: "210mm", margin: "0 auto", padding: "20px 24px", fontFamily: "sans-serif", fontSize: "12px", lineHeight: 1.6, color: "#000" }}>
          <PrintHeader settings={settings} title="OPERATION NOTE" />

          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: "4px 12px", marginTop: "16px", marginBottom: "20px", fontSize: "12px", fontWeight: 600, color: "#1e3a5f", textTransform: "uppercase" }}>
            <p style={{ margin: 0 }}>NAME</p>
            <p style={{ margin: 0 }}>: <span style={{ borderBottom: "2px solid #dbeafe", display: "inline-block", width: "calc(100% - 16px)", paddingLeft: "4px" }}>{otData.patientName}</span></p>
            <p style={{ margin: 0 }}>AGE</p>
            <p style={{ margin: 0 }}>: <span style={{ borderBottom: "2px solid #dbeafe", display: "inline-block", width: "calc(100% - 16px)", paddingLeft: "4px" }}>{otData.age}</span></p>
            <p style={{ margin: 0 }}>SEX</p>
            <p style={{ margin: 0 }}>: <span style={{ borderBottom: "2px solid #dbeafe", display: "inline-block", width: "calc(100% - 16px)", paddingLeft: "4px" }}>{otData.gender}</span></p>
            <p style={{ margin: 0 }}>REGD. NO.</p>
            <p style={{ margin: 0 }}>: <span style={{ borderBottom: "2px solid #dbeafe", display: "inline-block", width: "calc(100% - 16px)", paddingLeft: "4px" }}>{otData.regNo}</span></p>
            <p style={{ margin: 0 }}>BED NO.</p>
            <p style={{ margin: 0 }}>: <span style={{ borderBottom: "2px solid #dbeafe", display: "inline-block", width: "calc(100% - 16px)", paddingLeft: "4px" }}>{otData.bedNo}</span></p>
            <p style={{ margin: 0 }}>DATE &amp; DURATION</p>
            <p style={{ margin: 0 }}>: <span style={{ borderBottom: "2px solid #dbeafe", display: "inline-block", width: "calc(100% - 16px)", paddingLeft: "4px" }}>{otData.opDate} &nbsp;|&nbsp; {otData.durationMin} min</span></p>
            <p style={{ margin: 0 }}>OPERATING SURGEON</p>
            <p style={{ margin: 0 }}>: <span style={{ borderBottom: "2px solid #dbeafe", display: "inline-block", width: "calc(100% - 16px)", paddingLeft: "4px" }}>{otData.surgeonName}</span></p>
            <p style={{ margin: 0 }}>ANAESTHETIST</p>
            <p style={{ margin: 0 }}>: <span style={{ borderBottom: "2px solid #dbeafe", display: "inline-block", width: "calc(100% - 16px)", paddingLeft: "4px" }}>{otData.anesthetistName}</span></p>
            <p style={{ margin: 0 }}>ANAESTHESIA</p>
            <p style={{ margin: 0 }}>: <span style={{ borderBottom: "2px solid #dbeafe", display: "inline-block", width: "calc(100% - 16px)", paddingLeft: "4px" }}>&nbsp;</span></p>
            <p style={{ margin: 0 }}>OPERATION THEATRE</p>
            <p style={{ margin: 0 }}>: <span style={{ borderBottom: "2px solid #dbeafe", display: "inline-block", width: "calc(100% - 16px)", paddingLeft: "4px" }}>{otData.theaterName}</span></p>
          </div>

          {/* Pre-Operative Diagnosis */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a5f", textTransform: "uppercase", borderBottom: "1px solid #1e3a5f", paddingBottom: "4px", marginBottom: "6px" }}>PRE-OPERATIVE DIAGNOSIS</h3>
            <div style={{ minHeight: "40px", whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: 1.8 }}>
              {otData.diagnosis || <BlankLines count={2} />}
            </div>
          </div>

          {/* Operative Procedure */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a5f", textTransform: "uppercase", borderBottom: "1px solid #1e3a5f", paddingBottom: "4px", marginBottom: "6px" }}>OPERATIVE PROCEDURE</h3>
            <div style={{ minHeight: "80px", whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: 1.8 }}>
              {otData.procedureNotes || <BlankLines count={5} />}
            </div>
          </div>

          {/* Operative Findings */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a5f", textTransform: "uppercase", borderBottom: "1px solid #1e3a5f", paddingBottom: "4px", marginBottom: "6px" }}>OPERATIVE FINDINGS / PATHOLOGY</h3>
            <div style={{ minHeight: "60px", whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: 1.8 }}>
              {otData.findings || <BlankLines count={4} />}
            </div>
          </div>

          {/* Complications */}
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "12px", fontWeight: 700, color: "#1e3a5f", textTransform: "uppercase", borderBottom: "1px solid #1e3a5f", paddingBottom: "4px", marginBottom: "6px" }}>COMPLICATIONS / BLOOD LOSS</h3>
            <div style={{ minHeight: "30px", whiteSpace: "pre-wrap", fontSize: "12px", lineHeight: 1.8 }}>
              {otData.complications ? `${otData.complications}${otData.bloodLoss ? ` | Blood Loss: ${otData.bloodLoss}` : ""}` : otData.bloodLoss ? `Blood Loss: ${otData.bloodLoss}` : <BlankLines count={2} />}
            </div>
          </div>

          <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
            <div style={{ textAlign: "center", borderTop: "1px solid #000", width: "200px", paddingTop: "6px" }}>Anaesthetist</div>
            <div style={{ textAlign: "center", borderTop: "1px solid #000", width: "200px", paddingTop: "6px" }}>Operating Surgeon</div>
          </div>

          <div style={{ marginTop: "20px" }}>
            <PrintFooter settings={settings} doctorName={otData.surgeonName} showElectronic={false} />
          </div>
        </div>
      )}
    </OTPrintClient>
  )
}

function BlankLines({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ borderBottom: "1px solid #e0e0e0", height: "28px", width: "100%" }} />
      ))}
    </>
  )
}
