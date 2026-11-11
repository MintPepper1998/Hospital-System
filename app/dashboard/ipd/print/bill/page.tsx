import { prisma } from "@/lib/prisma"
import { calculateFinalBill } from "@/app/actions/billing"
import { format } from "date-fns"
import React from "react"
import { getSecureUrl } from "@/lib/s3-server"
import { PrintActions } from "./print-actions"

export default async function PrintBillPage(props: {
  searchParams: Promise<{ admissionId?: string }>
}) {
  const searchParams = await props.searchParams
  const admissionId = searchParams.admissionId

  if (!admissionId) {
    return <div className="p-8 text-center text-gray-500">No admission ID provided</div>
  }

  const billResult = await calculateFinalBill(admissionId)
  if (!billResult.success || !billResult.data) {
    return <div className="p-8 text-center text-red-500">Failed to load bill: {billResult.message}</div>
  }

  const b = billResult.data

  // Fetch hospital info
  const hospital = await prisma.hospitalSettings.findFirst()
  const logoUrl = hospital?.logoUrl ? await getSecureUrl(hospital.logoUrl) : null

  return (
    <>
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { margin: 0; size: auto; }
        }
      `}</style>

      <PrintActions />

      <div className="max-w-[210mm] mx-auto bg-white p-8 md:p-12 print:pt-4 print:pb-8 print:px-8 font-sans antialiased text-gray-900 text-sm leading-relaxed">
        
        {/* Hospital Header - Editorial Luxury */}
        <div className="border-b-[1.5px] border-black pb-8 mb-10">
          <div className="flex items-start justify-between">
            <div className="flex gap-6 items-center">
              {logoUrl && (
                <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] bg-black/5 ring-1 ring-black/5 flex items-center justify-center p-1.5 flex-shrink-0">
                  <div className="w-full h-full rounded-[calc(1.5rem-0.375rem)] bg-white overflow-hidden flex items-center justify-center relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl} alt="Hospital Logo" className="w-full h-full object-contain" />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <h1 className="text-3xl font-serif font-black tracking-tighter uppercase text-black">{hospital?.name || "Shree Kamal Hospital"}</h1>
                <p className="text-[11px] uppercase tracking-[0.15em] text-gray-500 font-bold">{hospital?.address || ""}</p>
                <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-800 font-semibold tracking-wide">
                  {hospital?.phone && <span><span className="text-gray-400 mr-1.5 font-bold">T</span>{hospital.phone}</span>}
                  {hospital?.phone && hospital?.email && <span className="text-gray-200">•</span>}
                  {hospital?.email && <span><span className="text-gray-400 mr-1.5 font-bold">E</span>{hospital.email}</span>}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="inline-flex flex-col items-end">
                <div className="px-4 py-1.5 bg-black text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full shadow-sm">
                  IPD Invoice
                </div>
                <div className="mt-4 text-xs font-serif italic text-gray-500">
                  Original Copy
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Details */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-xs">
          <div className="space-y-2">
            <Row label="Patient Name" value={b.patientName} />
            <Row label="Patient ID" value={b.patientId} />
            <Row label="Admission Date" value={format(new Date(b.admissionDate), "dd MMM yyyy, hh:mm a")} />
            {b.dischargeDate && (
              <Row label="Discharge Date" value={format(new Date(b.dischargeDate), "dd MMM yyyy, hh:mm a")} />
            )}
            <Row label="Days Admitted" value={`${b.daysAdmitted} day(s)`} />
          </div>
          <div className="space-y-2">
            <Row label="Ward" value={`${b.wardName} (${b.wardType})`} />
            <Row label="Bed" value={b.bedNumber} />
            <Row label="Primary Doctor" value={`Dr. ${b.doctorName}`} />
            <Row label="Invoice Date" value={b.dischargeDate ? format(new Date(b.dischargeDate), "dd MMM yyyy") : format(new Date(), "dd MMM yyyy")} />
          </div>
        </div>

        {/* ── ROOM CHARGES ── */}
        <SectionHeader title="Room / Bed Charges" />
        <table className="w-full text-xs mb-6">
          <thead><tr className="bg-gray-50 border-b"><Th>Description</Th><Th>Date</Th><Th>Rate/Day</Th><Th>Days</Th><ThR>Amount</ThR></tr></thead>
          <tbody>
            {b.bedCharges && b.bedCharges.length > 0 ? (
              b.bedCharges.map((bc, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <Td>{bc.name}</Td>
                  <Td>{format(new Date(bc.date), "dd MMM yyyy")}</Td>
                  <Td>₹{bc.ratePerDay?.toLocaleString("en-IN")}</Td>
                  <Td>{bc.days}</Td>
                  <TdR>₹{bc.total?.toLocaleString("en-IN")}</TdR>
                </tr>
              ))
            ) : (
              <tr className="border-b border-gray-100">
                <Td>{b.wardName} — Bed {b.bedNumber}</Td>
                <Td>—</Td>
                <Td>₹{b.bedRatePerDay?.toLocaleString("en-IN")}</Td>
                <Td>0</Td>
                <TdR>₹0</TdR>
              </tr>
            )}
          </tbody>
          <tfoot><tr><td colSpan={4} className="py-2 font-bold text-right pr-4">Subtotal</td><TdR className="font-bold">₹{b.roomRent?.toLocaleString("en-IN")}</TdR></tr></tfoot>
        </table>

        {/* ── DOCTOR FEES ── */}
        {b.doctorVisits && b.doctorVisits.length > 0 && (
          <>
            <SectionHeader title="Doctor Fees" />
            <table className="w-full text-xs mb-6">
              <thead><tr className="bg-gray-50 border-b"><Th>Doctor / Description</Th><Th>Date</Th><Th>Visits</Th><ThR>Amount</ThR></tr></thead>
              <tbody>
                {b.doctorVisits.map((d, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <Td>{d.doctorName}</Td>
                    <Td>{d.date ? format(new Date(d.date), "dd MMM yyyy") : "—"}</Td>
                    <Td>{d.visits || 1} visit(s)</Td>
                    <TdR>₹{d.fee?.toLocaleString("en-IN")}</TdR>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3} className="py-2 font-bold text-right pr-4">Subtotal</td><TdR className="font-bold">₹{b.doctorFees?.toLocaleString("en-IN")}</TdR></tr></tfoot>
            </table>
          </>
        )}

        {/* ── SURGERY CHARGES ── */}
        {b.surgeries?.length > 0 && (
          <>
            <SectionHeader title="Surgery / OT Charges" />
            <table className="w-full text-xs mb-6">
              <thead><tr className="bg-gray-50 border-b"><Th>Description</Th><Th>Type</Th><Th>Details</Th><ThR>Amount</ThR></tr></thead>
              <tbody>
                {b.surgeries.map((s, i) => (
                  <React.Fragment key={`surgery-group-${i}`}>
                    {/* Procedure header row */}
                    <tr key={`s-${i}`} className="border-b border-gray-200 bg-gray-50/50">
                      <Td><span className="font-bold">{s.procedureName}</span></Td>
                      <Td>Procedure</Td>
                      <Td>Dr. {s.surgeonName} · {format(new Date(s.date), "dd MMM yyyy")}</Td>
                      <TdR className="font-bold">₹{s.charge?.toLocaleString("en-IN")}</TdR>
                    </tr>
                    {/* Charge breakdown rows */}
                    {s.chargeBreakdown?.map((cb, j) => (
                      <tr key={`s-${i}-c-${j}`} className="border-b border-gray-50">
                        <Td><span className="pl-4 text-gray-600">↳ {cb.chargeLabel}</span></Td>
                        <Td><span className="text-gray-500">{cb.chargeType}</span></Td>
                        <Td>{" "}</Td>
                        <TdR>₹{cb.amount?.toLocaleString("en-IN")}</TdR>
                      </tr>
                    ))}
                    {/* OT Pharmacy medicines */}
                    {s.otMedicines?.map((med, j) => (
                      <tr key={`s-${i}-m-${j}`} className="border-b border-gray-50 bg-emerald-50/30">
                        <Td><span className="pl-4 text-gray-600">💊 {med.name}</span></Td>
                        <Td><span className="text-gray-500">OT Pharmacy</span></Td>
                        <Td>Qty: {med.quantity} × ₹{med.unitPrice}</Td>
                        <TdR>₹{med.total?.toLocaleString("en-IN")}</TdR>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3} className="py-2 font-bold text-right pr-4">Subtotal</td><TdR className="font-bold">₹{b.surgeryTotal?.toLocaleString("en-IN")}</TdR></tr></tfoot>
            </table>
          </>
        )}

        {/* ── NURSING CHARGES ── */}
        {b.nurseAssignments?.length > 0 && (
          <>
            <SectionHeader title="Nursing Charges" />
            <table className="w-full text-xs mb-6">
              <thead><tr className="bg-gray-50 border-b"><Th>Nurse / Description</Th><Th>Date</Th><Th>Shift</Th><Th>Days/Qty</Th><Th>Charge/Day</Th><ThR>Amount</ThR></tr></thead>
              <tbody>
                {b.nurseAssignments.map((n, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <Td>{n.nurseName}</Td>
                    <Td>{n.date ? format(new Date(n.date), "dd MMM yyyy") : "—"}</Td>
                    <Td>{n.shift}</Td>
                    <Td>{n.days}</Td>
                    <Td>₹{n.cost?.toLocaleString("en-IN")}</Td>
                    <TdR>₹{n.totalCost?.toLocaleString("en-IN")}</TdR>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={5} className="py-2 font-bold text-right pr-4">Subtotal</td><TdR className="font-bold">₹{b.nursingTotal?.toLocaleString("en-IN")}</TdR></tr></tfoot>
            </table>
          </>
        )}

        {/* ── EQUIPMENT CHARGES ── */}
        {b.equipments?.length > 0 && (
          <>
            <SectionHeader title="Equipment Charges" />
            <table className="w-full text-xs mb-6">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <Th>Equipment</Th>
                  <Th>Date</Th>
                  <Th>Rate</Th>
                  <Th>Qty</Th>
                  <ThR>Amount</ThR>
                </tr>
              </thead>
              <tbody>
                {b.equipments.map((eq, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <Td>
                      <span className="font-semibold">{eq.name}</span>
                      {eq.code && <span className="text-gray-400 ml-1 font-normal">({eq.code})</span>}
                      {eq.category && <span className="text-gray-400 block text-[10px]">{eq.category}</span>}
                    </Td>
                    <Td>{eq.date ? format(new Date(eq.date), "dd MMM yyyy") : "—"}</Td>
                    <Td>₹{eq.ratePerUnit?.toLocaleString("en-IN")}</Td>
                    <Td>{eq.quantity}</Td>
                    <TdR>
                      ₹{eq.totalCharge?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TdR>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="py-2 font-bold text-right pr-4">Subtotal</td>
                  <TdR className="font-bold">₹{b.equipmentTotal?.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TdR>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {/* ── PHARMACY ── */}
        {b.medicines?.length > 0 && (
          <>
            <SectionHeader title="Pharmacy / Medicines" />
            <table className="w-full text-xs mb-6">
              <thead><tr className="bg-gray-50 border-b"><Th>Medicine</Th><Th>Dosage</Th><Th>Qty</Th><Th>Unit Price</Th><ThR>Amount</ThR></tr></thead>
              <tbody>
                {b.medicines.map((m, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <Td>{m.name}</Td>
                    <Td>{m.dosage} · {m.frequency} · {m.duration}</Td>
                    <Td>{m.quantity}</Td>
                    <Td>₹{Number(m.unitPrice).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Td>
                    <TdR>₹{Number(m.totalPrice).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TdR>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4} className="py-2 font-bold text-right pr-4">Subtotal</td><TdR className="font-bold">₹{Number(b.pharmacyTotal).toLocaleString("en-IN", {minimumFractionDigits: 2, maximumFractionDigits: 2})}</TdR></tr></tfoot>
            </table>
          </>
        )}

        {/* ── LABORATORY ── */}
        {b.labTests?.length > 0 && (
          <>
            <SectionHeader title="Laboratory / Diagnostics" />
            <table className="w-full text-xs mb-6">
              <thead><tr className="bg-gray-50 border-b"><Th>Test Name</Th><Th>Type</Th><Th>Status</Th><ThR>Amount</ThR></tr></thead>
              <tbody>
                {b.labTests.map((t, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <Td>{t.name}</Td>
                    <Td>{t.type}</Td>
                    <Td>{t.status}</Td>
                    <TdR>₹{t.price?.toLocaleString("en-IN")}</TdR>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={3} className="py-2 font-bold text-right pr-4">Subtotal</td><TdR className="font-bold">₹{b.labTotal?.toLocaleString("en-IN")}</TdR></tr></tfoot>
            </table>
          </>
        )}

        {/* ── CUSTOM CHARGES / ADDONS ── */}
        {b.customCharges?.length > 0 && (
          <>
            <SectionHeader title="Addons / Custom Charges" />
            <table className="w-full text-xs mb-6">
              <thead><tr className="bg-gray-50 border-b"><Th>Description</Th><Th>Date</Th><Th>Unit Price</Th><Th>Qty</Th><Th>Discount</Th><ThR>Amount</ThR></tr></thead>
              <tbody>
                {b.customCharges.map((c, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <Td>{c.name}</Td>
                    <Td>{c.date ? format(new Date(c.date), "dd MMM yyyy") : "—"}</Td>
                    <Td>₹{c.amount?.toLocaleString("en-IN")}</Td>
                    <Td>{c.quantity}</Td>
                    <Td>{c.discountAmount > 0 ? `-₹${c.discountAmount.toLocaleString("en-IN")}` : c.discountPercent > 0 ? `${c.discountPercent}%` : "-"}</Td>
                    <TdR>₹{c.totalAmount?.toLocaleString("en-IN")}</TdR>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={5} className="py-2 font-bold text-right pr-4">Subtotal</td><TdR className="font-bold">₹{b.customChargesTotal?.toLocaleString("en-IN")}</TdR></tr></tfoot>
            </table>
          </>
        )}

        {/* ── CANTEEN ── */}
        {b.canteenOrders?.length > 0 && (
          <>
            <SectionHeader title="Canteen / Meals" />
            <table className="w-full text-xs mb-6">
              <thead><tr className="bg-gray-50 border-b"><Th>Order #</Th><Th>Meal</Th><Th>Date</Th><Th>Items</Th><ThR>Amount</ThR></tr></thead>
              <tbody>
                {b.canteenOrders.map((c, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <Td>{c.orderNumber}</Td>
                    <Td>{c.mealSlot}</Td>
                    <Td>{format(new Date(c.date), "dd MMM")}</Td>
                    <Td>{c.itemCount}</Td>
                    <TdR>₹{c.totalAmount?.toLocaleString("en-IN")}</TdR>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4} className="py-2 font-bold text-right pr-4">Subtotal</td><TdR className="font-bold">₹{b.canteenTotal?.toLocaleString("en-IN")}</TdR></tr></tfoot>
            </table>
          </>
        )}

        {/* ── GRAND TOTAL ── */}
        <div className="border-t-2 border-gray-900 pt-6 mt-8 space-y-2 text-xs">
          <TotalRow label="Room Charges" amount={b.roomRent} />
          <TotalRow label="Doctor Fees" amount={b.doctorFees} />
          {b.surgeryTotal > 0 && <TotalRow label="Surgery Charges" amount={b.surgeryTotal} />}
          {b.nursingTotal > 0 && <TotalRow label="Nursing Charges" amount={b.nursingTotal} />}
          {b.equipmentTotal > 0 && <TotalRow label="Equipment Charges" amount={b.equipmentTotal} />}
          {b.pharmacyTotal > 0 && <TotalRow label="Pharmacy" amount={b.pharmacyTotal} />}
          {b.labTotal > 0 && <TotalRow label="Laboratory" amount={b.labTotal} />}
          {b.canteenTotal > 0 && <TotalRow label="Canteen" amount={b.canteenTotal} />}
          {b.otherCharges > 0 && <TotalRow label="Other Charges" amount={b.otherCharges} />}

          <div className="border-t border-gray-300 pt-2">
            <TotalRow label="Gross Subtotal" amount={b.subtotal + (b.discountAmount || 0)} bold />
          </div>

          {b.discountAmount > 0 && (
            <div className="flex justify-between text-amber-700">
              <span>Discount ({b.discountType === "PERCENTAGE" ? `${b.discountPercent}%` : "Flat"}{b.discountReason ? ` — ${b.discountReason}` : ""})</span>
              <span>- ₹{b.discountAmount?.toLocaleString("en-IN")}</span>
            </div>
          )}

          {b.pharmacyTax > 0 && <TotalRow label="Pharmacy GST (18%)" amount={b.pharmacyTax} />}
          
          <div className="border-t-2 border-gray-900 pt-3 mt-3">
            <TotalRow label="TOTAL BILL AMOUNT" amount={b.totalBillAmount} bold large />
          </div>

          {b.hasInsuranceCoverage && (
            <div className="flex justify-between text-green-700 font-semibold">
              <span>Insurance / Scheme Coverage</span>
              <span>- ₹{((b.totalBillAmount || 0) - (b.patientLiability || 0)).toLocaleString("en-IN")}</span>
            </div>
          )}

          <TotalRow label="Advance Deposit" amount={b.advanceDeposit} prefix="- " />
          
          {/* Payment History */}
          {b.payments?.length > 0 && (
            <div className="pt-2.5 border-t border-gray-200 space-y-1">
              <div className="font-bold text-gray-900 uppercase text-[11px] tracking-wider mb-1">
                Payment History
              </div>
              {b.payments.map((p, i) => {
                const isSplit = p.mode === "SPLIT" || Boolean(p.splitDetails)
                const splitParts: { label: string; amount: number }[] = []
                if (p.splitDetails?.cash && p.splitDetails.cash > 0) {
                  splitParts.push({ label: "Cash", amount: p.splitDetails.cash })
                }
                if (p.splitDetails?.upi && p.splitDetails.upi > 0) {
                  splitParts.push({ label: "UPI", amount: p.splitDetails.upi })
                }
                if (p.splitDetails?.card && p.splitDetails.card > 0) {
                  splitParts.push({ label: "Card", amount: p.splitDetails.card })
                }

                // Fallback: parse split amounts from notes if splitDetails is empty
                if (isSplit && splitParts.length === 0 && p.notes) {
                  const cashM = p.notes.match(/Cash:\s*₹?([\d,.]+)/i)
                  const upiM = p.notes.match(/UPI:\s*₹?([\d,.]+)/i)
                  const cardM = p.notes.match(/Card:\s*₹?([\d,.]+)/i)
                  if (cashM) splitParts.push({ label: "Cash", amount: parseFloat(cashM[1].replace(/,/g, "")) })
                  if (upiM) splitParts.push({ label: "UPI", amount: parseFloat(upiM[1].replace(/,/g, "")) })
                  if (cardM) splitParts.push({ label: "Card", amount: parseFloat(cardM[1].replace(/,/g, "")) })
                }

                // Clean notes if notes only repeats the split description
                const cleanNotes = p.notes && !p.notes.toLowerCase().includes("split (") ? p.notes : null

                return (
                  <div key={i} className="py-1 border-b border-gray-100 last:border-b-0 text-xs">
                    <div className="flex justify-between items-center text-gray-700">
                      <div>
                        <span className="font-medium text-gray-900">
                          {format(new Date(p.date), "dd MMM yyyy")}
                        </span>
                        <span className="text-gray-400 mx-1.5">—</span>
                        <span className={isSplit ? "font-bold text-black uppercase tracking-wide" : "font-medium text-gray-800"}>
                          {isSplit ? "SPLIT" : p.mode}
                        </span>
                        {cleanNotes ? <span className="text-gray-500 font-normal italic ml-1">({cleanNotes})</span> : null}
                      </div>
                      <span className="font-semibold text-gray-900">
                        - ₹{p.amount?.toLocaleString("en-IN")}
                      </span>
                    </div>

                    {/* Split Mode Breakdown */}
                    {isSplit && splitParts.length > 0 && (
                      <div className="flex items-center gap-2 pl-3 mt-1 text-[11px] text-gray-600 font-medium">
                        <span className="text-gray-400">↳ Split Breakdown:</span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {splitParts.map((sp, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-900"
                            >
                              <span className="text-gray-500 font-normal mr-1">{sp.label}:</span>
                              <span className="font-bold">₹{sp.amount.toLocaleString("en-IN")}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="border-t-2 border-gray-900 pt-4 mt-4 flex justify-between items-center">
            <span className="text-lg font-black uppercase tracking-wide">Net Balance Due</span>
            <span className={`text-2xl font-black ${b.balanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>
              ₹{b.balanceDue?.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200 grid grid-cols-2 gap-12 text-xs text-gray-500">
          <div>
            <div className="font-bold text-gray-700 mb-1">Terms & Conditions</div>
            <ul className="list-disc list-inside space-y-0.5">
              <li>All amounts are in Indian Rupees (₹)</li>
              <li>This is a computer-generated invoice</li>
              <li>Discrepancies must be reported within 7 days</li>
            </ul>
          </div>
          <div className="text-right">
            <div className="mt-12 border-t border-gray-400 pt-2 inline-block px-8">
              <div className="font-bold text-gray-700">Authorized Signatory</div>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}

// ── Utility Components ──

function SectionHeader({ title }: { title: string }) {
  return <div className="text-xs font-black uppercase tracking-[0.15em] text-gray-500 mb-3 mt-6">{title}</div>
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  )
}

function TotalRow({ label, amount, bold, large, prefix }: { label: string; amount: number; bold?: boolean; large?: boolean; prefix?: string }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-bold' : 'font-medium'} ${large ? 'text-base' : ''}`}>
      <span>{label}</span>
      <span>{prefix || ""}₹{amount?.toLocaleString("en-IN")}</span>
    </div>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{children}</th>
}

function ThR({ children }: { children: React.ReactNode }) {
  return <th className="text-right py-2 px-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">{children}</th>
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-2 px-3 text-gray-700">{children}</td>
}

function TdR({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-2 px-3 text-right text-gray-900 ${className || ""}`}>{children}</td>
}
