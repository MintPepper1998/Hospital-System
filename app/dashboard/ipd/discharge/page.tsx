import { getAdmittedPatientsWithBillStatus } from "@/app/actions/discharge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Bed,
  Calendar,
  IndianRupee,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
} from "lucide-react"
import { format } from "date-fns"
import { DischargeListClient } from "@/components/ipd/discharge-list-client"

export default async function DischargeListPage() {
  const result = await getAdmittedPatientsWithBillStatus()
  const patients = result.success ? (result.data ?? []) : []

  // Stats
  const total = patients.length
  const clearCount = patients.filter((p) => p.billStatus === "CLEAR").length
  const insuranceCount = patients.filter((p) => p.billStatus === "INSURANCE_PENDING").length
  const pendingCount = patients.filter((p) => p.billStatus === "PENDING").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-blue-600">
          Patient Discharge
        </h2>
        <p className="text-muted-foreground mt-1">
          Review admitted patients, verify bill status, and process discharges
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admitted Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
            <p className="text-xs text-muted-foreground">Currently in-patient</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bills Clear</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{clearCount}</div>
            <p className="text-xs text-muted-foreground">Ready for discharge</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Insurance Pending</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{insuranceCount}</div>
            <p className="text-xs text-muted-foreground">Covered by insurance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dues Pending</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Must clear before discharge</p>
          </CardContent>
        </Card>
      </div>

      {/* Patient List */}
      {patients.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <ClipboardList className="h-16 w-16 mx-auto text-muted-foreground opacity-40" />
              <h3 className="mt-4 text-lg font-semibold">No Admitted Patients</h3>
              <p className="text-muted-foreground mt-2">
                There are currently no patients admitted in the IPD.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DischargeListClient patients={patients} />
      )}
    </div>
  )
}
