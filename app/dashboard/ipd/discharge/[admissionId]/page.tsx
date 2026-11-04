import { calculateFinalBill } from "@/app/actions/billing"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  AlertCircle,
  User,
  BedDouble,
  Calendar,
  IndianRupee,
  FileText,
  Stethoscope,
  Clock,
  ShieldCheck,
} from "lucide-react"
import { format } from "date-fns"
import { DischargeBillingForm } from "@/components/ipd/discharge-billing-form"
import { notFound } from "next/navigation"
import { getActiveDischargeTypes } from "@/app/actions/discharge-types"

// Next.js 15: params is now a Promise
interface PageProps {
  params: Promise<{ admissionId: string }>
}

export default async function DischargeSummaryPage({ params }: PageProps) {
  const { admissionId } = await params

  if (!admissionId) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-600">Invalid Admission ID</h2>
          <p className="text-muted-foreground mt-2">
            The admission ID is missing or invalid. Please check the URL.
          </p>
        </div>
      </div>
    )
  }

  const result = await calculateFinalBill(admissionId)

  if (!result.success || !result.data) {
    notFound()
  }

  const bill = result.data

  const admission = await prisma.iPDAdmission.findUnique({
    where: { id: admissionId },
    select: {
      dischargeTypeCode: true,
      customDischargeData: true,
      finalDiagnosis: true,
      proceduresDone: true,
      courseInHospital: true,
      treatmentGiven: true,
      conditionAtDischarge: true,
      adviceOnDischarge: true,
      followUpDate: true,
    }
  })

  const dischargeTypesRaw = await getActiveDischargeTypes()
  const dischargeTypes = JSON.parse(JSON.stringify(dischargeTypesRaw))

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">IPD Discharge & Settlement</h2>
        <p className="text-muted-foreground">
          Final bill summary and settlement for patient discharge
        </p>
      </div>

      {/* Patient Details Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-blue-600" />
            Patient Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Patient Name</p>
              <p className="text-base font-semibold mt-0.5">{bill.patientName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Patient ID</p>
              <p className="text-base font-semibold mt-0.5">{bill.patientId}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Primary Doctor</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Stethoscope className="h-4 w-4 text-blue-500" />
                <p className="text-base font-semibold">Dr. {bill.doctorName}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Bed / Ward</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <BedDouble className="h-4 w-4 text-indigo-500" />
                <p className="text-base font-semibold">
                  {bill.bedNumber} / {bill.wardName}
                </p>
                <Badge variant="outline" className="text-xs">
                  {bill.wardType}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Admission Date</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Calendar className="h-4 w-4 text-green-500" />
                <p className="text-base font-semibold">
                  {format(new Date(bill.admissionDate), "dd MMM yyyy, hh:mm a")}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Duration of Stay</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Clock className="h-4 w-4 text-orange-500" />
                <p className="text-base font-semibold">
                  {bill.daysAdmitted} {bill.daysAdmitted === 1 ? "day" : "days"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BSKY Alert */}
      {bill.isBsky && (
        <Alert className="border-green-300 bg-green-50">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>BSKY Beneficiary — Cashless Discharge.</strong> The final bill will be forwarded to the Government for settlement. No payment is required from the patient.
          </AlertDescription>
        </Alert>
      )}

      {/* Alert */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Important:</strong> Once discharged, the bed will be automatically released. Ensure all reports and files are handed over to the patient.
        </AlertDescription>
      </Alert>

      {/* Cost Breakdown Table */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <IndianRupee className="h-5 w-5 text-green-600" />
            Cost Breakdown
          </CardTitle>
          <CardDescription>
            Itemized manual charges and billing breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-gray-50 px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">
              <div className="col-span-1">#</div>
              <div className="col-span-6">Description</div>
              <div className="col-span-2 text-right">Rate</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>

            {/* Row 1: Room / Bed Charges */}
            <div className="grid grid-cols-12 px-4 py-3 border-t items-center bg-blue-50/20">
              <div className="col-span-1 text-sm text-gray-500">1</div>
              <div className="col-span-6">
                <p className="text-sm font-medium">Room / Bed Charges</p>
                <p className="text-xs text-muted-foreground">
                  {bill.wardName} ({bill.bedNumber}) • {bill.bedCharges?.length || 0} item(s)
                </p>
              </div>
              <div className="col-span-2 text-right text-sm">₹{bill.bedRatePerDay.toLocaleString("en-IN")}/day</div>
              <div className="col-span-1 text-center text-sm">{bill.bedCharges?.reduce((s, b) => s + b.days, 0) || 0}</div>
              <div className="col-span-2 text-right text-sm font-semibold">
                ₹{bill.roomRent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            {bill.bedCharges?.map((bed, idx) => (
              <div key={`bed-${idx}`} className="grid grid-cols-12 px-4 py-1.5 border-t border-dashed border-gray-200 items-center bg-blue-50/10">
                <div className="col-span-1 text-xs text-gray-400 pl-3">•</div>
                <div className="col-span-6">
                  <p className="text-xs text-gray-700">{bed.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {bed.date ? new Date(bed.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </p>
                </div>
                <div className="col-span-2 text-right text-xs text-gray-500">₹{bed.ratePerDay.toLocaleString("en-IN")}</div>
                <div className="col-span-1 text-center text-xs text-gray-500">{bed.days}</div>
                <div className="col-span-2 text-right text-xs font-medium">
                  ₹{bed.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}

            {/* Row 2: Doctor Fees */}
            <div className="grid grid-cols-12 px-4 py-3 border-t items-center bg-emerald-50/20">
              <div className="col-span-1 text-sm text-gray-500">2</div>
              <div className="col-span-6">
                <p className="text-sm font-medium">Doctor Visit Charges</p>
                <p className="text-xs text-muted-foreground">
                  Dr. {bill.doctorName} • {bill.doctorVisits?.length || 0} visit(s)
                </p>
              </div>
              <div className="col-span-2 text-right text-sm">—</div>
              <div className="col-span-1 text-center text-sm">{bill.doctorVisits?.reduce((s, d) => s + (d.visits || 1), 0) || 0}</div>
              <div className="col-span-2 text-right text-sm font-semibold">
                ₹{bill.doctorFees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            {bill.doctorVisits?.map((doc, idx) => (
              <div key={`doc-${idx}`} className="grid grid-cols-12 px-4 py-1.5 border-t border-dashed border-gray-200 items-center bg-emerald-50/10">
                <div className="col-span-1 text-xs text-gray-400 pl-3">•</div>
                <div className="col-span-6">
                  <p className="text-xs text-gray-700">{doc.doctorName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {doc.date ? new Date(doc.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </p>
                </div>
                <div className="col-span-2 text-right text-xs text-gray-500">₹{(doc.rate || doc.fee).toLocaleString("en-IN")}</div>
                <div className="col-span-1 text-center text-xs text-gray-500">{doc.visits || 1}</div>
                <div className="col-span-2 text-right text-xs font-medium">
                  ₹{doc.fee.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}

            {/* Row 3: Lab Charges (Itemized) */}
            <div className="grid grid-cols-12 px-4 py-3 border-t items-center bg-purple-50/30">
              <div className="col-span-1 text-sm text-gray-500">3</div>
              <div className="col-span-6">
                <p className="text-sm font-medium">Laboratory Investigations</p>
                <p className="text-xs text-muted-foreground">
                  {bill.labTests.length} test(s) ordered
                </p>
              </div>
              <div className="col-span-2 text-right text-sm">—</div>
              <div className="col-span-1 text-center text-sm">{bill.labTests.length}</div>
              <div className="col-span-2 text-right text-sm font-semibold">
                ₹{bill.labTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            {bill.labTests.map((test, idx) => (
              <div key={`lab-${idx}`} className="grid grid-cols-12 px-4 py-1.5 border-t border-dashed border-gray-200 items-center bg-purple-50/10">
                <div className="col-span-1 text-xs text-gray-400 pl-3">•</div>
                <div className="col-span-6">
                  <p className="text-xs text-gray-700">{test.name}</p>
                  <p className="text-[10px] text-muted-foreground">{test.type} — {test.status}</p>
                </div>
                <div className="col-span-2 text-right text-xs text-gray-500">₹{test.price.toLocaleString("en-IN")}</div>
                <div className="col-span-1 text-center text-xs text-gray-500">1</div>
                <div className="col-span-2 text-right text-xs font-medium">
                  ₹{test.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}

            {/* Row 4: Pharmacy Charges (Itemized) */}
            <div className="grid grid-cols-12 px-4 py-3 border-t items-center bg-green-50/30">
              <div className="col-span-1 text-sm text-gray-500">4</div>
              <div className="col-span-6">
                <p className="text-sm font-medium">Medicines & Consumables</p>
                <p className="text-xs text-muted-foreground">
                  {bill.medicines.length} medicine(s) dispensed
                </p>
              </div>
              <div className="col-span-2 text-right text-sm">—</div>
              <div className="col-span-1 text-center text-sm">{bill.medicines.length}</div>
              <div className="col-span-2 text-right text-sm font-semibold">
                ₹{bill.pharmacyTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>
            {bill.medicines.map((med, idx) => (
              <div key={`med-${idx}`} className="grid grid-cols-12 px-4 py-1.5 border-t border-dashed border-gray-200 items-center bg-green-50/10">
                <div className="col-span-1 text-xs text-gray-400 pl-3">•</div>
                <div className="col-span-6">
                  <p className="text-xs text-gray-700">{med.name} ({med.dosage})</p>
                  <p className="text-[10px] text-muted-foreground">{med.frequency} × {med.duration}</p>
                </div>
                <div className="col-span-2 text-right text-xs text-gray-500">₹{med.unitPrice.toLocaleString("en-IN")}/unit</div>
                <div className="col-span-1 text-center text-xs text-gray-500">{med.quantity}</div>
                <div className="col-span-2 text-right text-xs font-medium">
                  ₹{med.totalPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}

            {/* Row 5: Surgery Charges (if any) */}
            {bill.surgeryTotal > 0 && (
              <>
                <div className="grid grid-cols-12 px-4 py-3 border-t items-center bg-red-50/30">
                  <div className="col-span-1 text-sm text-gray-500">5</div>
                  <div className="col-span-6">
                    <p className="text-sm font-medium">Surgery / Procedures</p>
                    <p className="text-xs text-muted-foreground">
                      {bill.surgeries.length} procedure(s)
                    </p>
                  </div>
                  <div className="col-span-2 text-right text-sm">—</div>
                  <div className="col-span-1 text-center text-sm">{bill.surgeries.length}</div>
                  <div className="col-span-2 text-right text-sm font-semibold">
                    ₹{bill.surgeryTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {bill.surgeries.map((surgery: any, idx: number) => (
                  <div key={`surgery-${idx}`} className="grid grid-cols-12 px-4 py-1.5 border-t border-dashed border-gray-200 items-center bg-red-50/10">
                    <div className="col-span-1 text-xs text-gray-400 pl-3">•</div>
                    <div className="col-span-6">
                      <p className="text-xs text-gray-700">{surgery.procedureName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {surgery.surgeonName} — {new Date(surgery.date).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                    <div className="col-span-2 text-right text-xs text-gray-500">—</div>
                    <div className="col-span-1 text-center text-xs text-gray-500">1</div>
                    <div className="col-span-2 text-right text-xs font-medium">
                      ₹{surgery.charge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Row 6: Nursing Charges (if any) */}
            {bill.nursingTotal > 0 && (
              <>
                <div className="grid grid-cols-12 px-4 py-3 border-t items-center bg-pink-50/30">
                  <div className="col-span-1 text-sm text-gray-500">6</div>
                  <div className="col-span-6">
                    <p className="text-sm font-medium">Nursing Charges</p>
                    <p className="text-xs text-muted-foreground">
                      {bill.nurseAssignments.length} nurse assignment(s)
                    </p>
                  </div>
                  <div className="col-span-2 text-right text-sm">—</div>
                  <div className="col-span-1 text-center text-sm">{bill.nurseAssignments.length}</div>
                  <div className="col-span-2 text-right text-sm font-semibold">
                    ₹{bill.nursingTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {bill.nurseAssignments.map((na: any, idx: number) => (
                  <div key={`nurse-${idx}`} className="grid grid-cols-12 px-4 py-1.5 border-t border-dashed border-gray-200 items-center bg-pink-50/10">
                    <div className="col-span-1 text-xs text-gray-400 pl-3">•</div>
                    <div className="col-span-6">
                      <p className="text-xs text-gray-700">{na.nurseName} ({na.shift})</p>
                      <p className="text-[10px] text-muted-foreground">₹{na.cost}/day × {na.days} days</p>
                    </div>
                    <div className="col-span-2 text-right text-xs text-gray-500">₹{na.cost}/day</div>
                    <div className="col-span-1 text-center text-xs text-gray-500">{na.days}</div>
                    <div className="col-span-2 text-right text-xs font-medium">
                      ₹{na.totalCost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Equipment Charges (if any) */}
            {bill.equipmentTotal > 0 && (
              <>
                <div className="grid grid-cols-12 px-4 py-3 border-t items-center bg-cyan-50/30">
                  <div className="col-span-1 text-sm text-gray-500">E</div>
                  <div className="col-span-6">
                    <p className="text-sm font-medium">Equipment Charges</p>
                    <p className="text-xs text-muted-foreground">
                      {bill.equipments?.length || 0} equipment item(s)
                    </p>
                  </div>
                  <div className="col-span-2 text-right text-sm">—</div>
                  <div className="col-span-1 text-center text-sm">{bill.equipments?.length || 0}</div>
                  <div className="col-span-2 text-right text-sm font-semibold">
                    ₹{bill.equipmentTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {bill.equipments?.map((eq: any, idx: number) => (
                  <div key={`equipment-${idx}`} className="grid grid-cols-12 px-4 py-1.5 border-t border-dashed border-gray-200 items-center bg-cyan-50/10">
                    <div className="col-span-1 text-xs text-gray-400 pl-3">•</div>
                    <div className="col-span-6">
                      <p className="text-xs text-gray-700">{eq.name} {eq.code ? `(${eq.code})` : ""}</p>
                      <p className="text-[10px] text-muted-foreground">
                        ₹{eq.ratePerUnit}/{eq.chargeType === "HOURLY" ? "hr" : "day"} • {eq.duration} • {eq.status}
                      </p>
                    </div>
                    <div className="col-span-2 text-right text-xs text-gray-500">₹{eq.ratePerUnit.toLocaleString("en-IN")}</div>
                    <div className="col-span-1 text-center text-xs text-gray-500">{eq.quantity}</div>
                    <div className="col-span-2 text-right text-xs font-medium">
                      ₹{eq.totalCharge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Row 7: Custom / Addon Charges (if any) */}
            {bill.customChargesTotal > 0 && (
              <>
                <div className="grid grid-cols-12 px-4 py-3 border-t items-center bg-indigo-50/30">
                  <div className="col-span-1 text-sm text-gray-500">7</div>
                  <div className="col-span-6">
                    <p className="text-sm font-medium">Custom / Addon Charges</p>
                    <p className="text-xs text-muted-foreground">
                      {bill.customCharges.length} addon(s)
                    </p>
                  </div>
                  <div className="col-span-2 text-right text-sm">—</div>
                  <div className="col-span-1 text-center text-sm">{bill.customCharges.length}</div>
                  <div className="col-span-2 text-right text-sm font-semibold">
                    ₹{bill.customChargesTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {bill.customCharges.map((charge: any, idx: number) => (
                  <div key={`custom-${idx}`} className="grid grid-cols-12 px-4 py-1.5 border-t border-dashed border-gray-200 items-center bg-indigo-50/10">
                    <div className="col-span-1 text-xs text-gray-400 pl-3">•</div>
                    <div className="col-span-6">
                      <p className="text-xs text-gray-700">{charge.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(charge.date).toLocaleDateString("en-IN")} • Qty: {charge.quantity}
                      </p>
                    </div>
                    <div className="col-span-2 text-right text-xs text-gray-500">₹{charge.amount.toLocaleString("en-IN")}</div>
                    <div className="col-span-1 text-center text-xs text-gray-500">{charge.quantity}</div>
                    <div className="col-span-2 text-right text-xs font-medium">
                      ₹{charge.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Row 8: Canteen Charges (if any) */}
            {bill.canteenTotal > 0 && (
              <>
                <div className="grid grid-cols-12 px-4 py-3 border-t items-center bg-orange-50/30">
                  <div className="col-span-1 text-sm text-gray-500">8</div>
                  <div className="col-span-6">
                    <p className="text-sm font-medium">Canteen / Meals</p>
                    <p className="text-xs text-muted-foreground">
                      {bill.canteenOrders.length} meal(s) served during stay
                    </p>
                  </div>
                  <div className="col-span-2 text-right text-sm">—</div>
                  <div className="col-span-1 text-center text-sm">{bill.canteenOrders.length}</div>
                  <div className="col-span-2 text-right text-sm font-semibold">
                    ₹{bill.canteenTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {bill.canteenOrders.map((order, idx) => (
                  <div key={`canteen-${idx}`} className="grid grid-cols-12 px-4 py-1.5 border-t border-dashed border-gray-200 items-center bg-orange-50/10">
                    <div className="col-span-1 text-xs text-gray-400 pl-3">•</div>
                    <div className="col-span-6">
                      <p className="text-xs text-gray-700">{order.mealSlot} — {order.orderNumber}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(order.date).toLocaleDateString("en-IN")} • {order.itemCount} item(s)
                      </p>
                    </div>
                    <div className="col-span-2 text-right text-xs text-gray-500">—</div>
                    <div className="col-span-1 text-center text-xs text-gray-500">1</div>
                    <div className="col-span-2 text-right text-xs font-medium">
                      ₹{order.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Row 9: Other Charges (if any) */}
            {bill.otherCharges > 0 && (
              <div className="grid grid-cols-12 px-4 py-3 border-t items-center">
                <div className="col-span-1 text-sm text-gray-500">9</div>
                <div className="col-span-6">
                  <p className="text-sm font-medium">Other Charges</p>
                  <p className="text-xs text-muted-foreground">
                    Miscellaneous / Procedures
                  </p>
                </div>
                <div className="col-span-2 text-right text-sm">—</div>
                <div className="col-span-1 text-center text-sm">—</div>
                <div className="col-span-2 text-right text-sm font-semibold">
                  ₹{bill.otherCharges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}

            {/* Discount (if any) */}
            {bill.discountAmount > 0 && (
              <div className="grid grid-cols-12 px-4 py-3 border-t items-center bg-emerald-50/40">
                <div className="col-span-1 text-sm text-gray-500">—</div>
                <div className="col-span-6">
                  <p className="text-sm font-medium text-emerald-700">Discount Applied</p>
                  <p className="text-xs text-muted-foreground">
                    {bill.discountType === "PERCENTAGE" ? `${bill.discountPercent}%` : "Flat"}{bill.discountReason ? ` — ${bill.discountReason}` : ""}
                  </p>
                </div>
                <div className="col-span-2 text-right text-sm">—</div>
                <div className="col-span-1 text-center text-sm">—</div>
                <div className="col-span-2 text-right text-sm font-semibold text-emerald-700">
                  -₹{bill.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}

            {/* Subtotal */}
            <div className="grid grid-cols-12 px-4 py-3 border-t-2 border-gray-300 bg-gray-50 items-center">
              <div className="col-span-7">
                <p className="text-sm font-bold text-gray-700">Subtotal</p>
              </div>
              <div className="col-span-3 text-right text-sm">—</div>
              <div className="col-span-2 text-right text-base font-bold">
                ₹{bill.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* GST on Medicines */}
            {bill.pharmacyTax > 0 && (
              <div className="grid grid-cols-12 px-4 py-2 border-t items-center bg-amber-50/60">
                <div className="col-span-7">
                  <p className="text-sm font-semibold text-amber-700">GST on Medicines (18%)</p>
                  <p className="text-[10px] text-amber-600">Applied on pharmacy charges only</p>
                </div>
                <div className="col-span-3 text-right text-sm">—</div>
                <div className="col-span-2 text-right text-sm font-semibold text-amber-700">
                  +₹{bill.pharmacyTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
              </div>
            )}

            {/* Insurance Deductions (if applicable) */}
            {bill.hasInsuranceCoverage && bill.insuranceApprovedAmount !== undefined && (
              <>
                <div className="grid grid-cols-12 px-4 py-2 border-t items-center bg-blue-50/60">
                  <div className="col-span-7">
                    <p className="text-sm font-semibold text-blue-700">Insurance Approved Budget</p>
                  </div>
                  <div className="col-span-3 text-right text-sm">—</div>
                  <div className="col-span-2 text-right text-sm font-semibold text-blue-600">
                    ₹{(bill.insuranceApprovedAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="grid grid-cols-12 px-4 py-2 border-t items-center bg-blue-100/60">
                  <div className="col-span-7">
                    <p className="text-sm font-semibold text-blue-800">Less: Covered by Insurance</p>
                  </div>
                  <div className="col-span-3 text-right text-sm">—</div>
                  <div className="col-span-2 text-right text-sm font-bold text-blue-700">
                    -₹{(bill.insuranceCoveredAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="grid grid-cols-12 px-4 py-3 border-t-2 border-orange-200 bg-orange-50 items-center">
                  <div className="col-span-7">
                    <p className="text-sm font-bold text-orange-800">Patient Liability</p>
                  </div>
                  <div className="col-span-3 text-right text-sm">—</div>
                  <div className="col-span-2 text-right text-base font-bold text-orange-700">
                    ₹{(bill.patientLiability || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </>
            )}

            {/* Less: Advance Deposit */}
            <div className="grid grid-cols-12 px-4 py-3 border-t items-center bg-red-50/60">
              <div className="col-span-7">
                <p className="text-sm font-semibold text-red-700">Less: Advance Deposit</p>
              </div>
              <div className="col-span-3 text-right text-sm">—</div>
              <div className="col-span-2 text-right text-base font-bold text-red-600">
                -₹{bill.advanceDeposit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Grand Total Payable */}
            <div className="grid grid-cols-12 px-4 py-4 border-t-2 border-blue-500 bg-blue-50 items-center">
              <div className="col-span-7">
                <p className="text-base font-bold text-blue-900">
                  {bill.balanceDue >= 0 ? "Grand Total Payable / Balance Due" : "Refund to Patient"}
                </p>
              </div>
              <div className="col-span-3 text-right">—</div>
              <div className="col-span-2 text-right">
                <span className={`text-xl font-black ${
                  bill.balanceDue >= 0 ? "text-blue-900" : "text-green-700"
                }`}>
                  ₹{Math.abs(bill.balanceDue).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Insurance notice */}
          {bill.hasInsuranceCoverage && bill.netPayable > 0 && (
            <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                <strong>Insurance Active:</strong> This patient has an active insurance claim. Discharge is permitted even with a pending balance.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discharge & Settlement Form */}
      <DischargeBillingForm
        admissionId={admissionId}
        patientName={bill.patientName}
        subtotal={bill.subtotal}
        advanceDeposit={bill.advanceDeposit}
        netPayable={bill.netPayable}
        balanceDue={bill.balanceDue}
        patientLiability={bill.patientLiability || 0}
        insuranceCoveredAmount={bill.insuranceCoveredAmount || 0}
        pharmacyTax={bill.pharmacyTax}
        bedNumber={bill.bedNumber}
        wardName={bill.wardName}
        doctorName={bill.doctorName}
        daysAdmitted={bill.daysAdmitted}
        admissionDate={bill.admissionDate}
        roomRent={bill.roomRent}
        labTotal={bill.labTotal}
        pharmacyTotal={bill.pharmacyTotal}
        doctorFees={bill.doctorFees}
        hasInsuranceCoverage={bill.hasInsuranceCoverage}
        isBsky={bill.isBsky}
        dischargeTypes={dischargeTypes}
        initialData={{
          dischargeTypeCode: admission?.dischargeTypeCode,
          customDischargeData: admission?.customDischargeData,
          finalDiagnosis: admission?.finalDiagnosis,
          proceduresDone: admission?.proceduresDone,
          courseInHospital: admission?.courseInHospital,
          treatmentGiven: admission?.treatmentGiven,
          conditionAtDischarge: admission?.conditionAtDischarge,
          adviceOnDischarge: admission?.adviceOnDischarge,
          followUpDate: admission?.followUpDate?.toISOString(),
        }}
      />
    </div>
  )
}
