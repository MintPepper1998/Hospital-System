import { prisma } from "@/lib/prisma"
import { format } from "date-fns"
import { AuditLogClient } from "@/components/admin/audit-log-client"

const ALL_MODULES = [
  "AccountTransfer", "AMBULANCE", "Appointment", "Bed", "Billing", "BSKYClaimSettlement",
  "BulkShiftAssignment", "CANTEEN", "CapitalExpense", "CashlessClaim", "CLINICAL", "ClinicalNote",
  "Consultation", "CreditEntry", "CreditPayment", "Department", "DiagnosticPayment", "Discharge",
  "DischargeSummary", "DischargeTypeConfig", "EmergencyVisit", "Employee", "EmployeeLeave",
  "Equipment", "EquipmentAssignment", "EquipmentReturn", "EquipmentUsage", "ERDischarge",
  "ERToIPDTransfer", "FinalBill", "FinancialAccount", "GeneralItem", "HospitalFee",
  "HospitalSettings", "InsuranceClaim", "InsurancePolicy", "InsuranceProvider", "Inventory",
  "InventoryBatch", "Investment", "Investor", "Invoice", "InvoiceMerge", "IPD", "IPDAdmission",
  "IPDLabRequest", "IPDLabResult", "IPDLabSample", "IPDPrescription", "LAB", "LabResult",
  "LabSample", "LabTest", "Medicine", "MedicineType", "OnlineBooking", "OPD", "OPDBilling",
  "OPDVitals", "OperationNote", "OperationTheater", "OTConsumables", "OTDocument", "OTMedia",
  "PAC", "Patient", "PatientDocument", "PatientInsurance", "Payment", "Permission", "PHARMACY",
  "PharmacyBill", "PharmacyCustomer", "PharmacyRefund", "PharmacySale", "PreAuthEnhancement",
  "PreAuthorization", "Prescription", "PrintSettings", "PrintTemplateSettings", "ProviderTariff",
  "PurchaseInvoice", "PurchasePayment", "PurchaseReturn", "ReimbursementClaim", "RoleTemplate",
  "Salary", "SalesReturn", "Shift", "ShiftAssignment", "Staff", "StaffAttendance", "Stock",
  "Supplier", "Surgery", "SurgeryProcedure", "Transaction", "User", "UserPassword", "UserProfile", "Ward"
].sort()

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    action?: string
    module?: string
    user?: string
    q?: string
    page?: string
  }>
}) {
  const params = await searchParams
  const actionFilter = params.action
  const moduleFilter = params.module
  const userFilter = params.user
  const searchQuery = params.q
  const currentPage = parseInt(params.page || "1", 10)
  const pageSize = 50

  // Build where clause
  const where: Record<string, unknown> = {}

  if (actionFilter && actionFilter !== "ALL") {
    where.action = actionFilter
  }
  if (moduleFilter && moduleFilter !== "ALL") {
    where.module = moduleFilter
  }
  if (userFilter && userFilter !== "ALL") {
    where.userId = userFilter
  }
  if (searchQuery) {
    where.OR = [
      { module: { contains: searchQuery, mode: "insensitive" } },
      { recordId: { contains: searchQuery, mode: "insensitive" } },
      { user: { name: { contains: searchQuery, mode: "insensitive" } } },
      { user: { email: { contains: searchQuery, mode: "insensitive" } } },
    ]
  }

  // Count for pagination
  const totalCount = await prisma.auditLog.count({ where })
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  // Fetch logs
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: "desc" },
    take: pageSize,
    skip: (currentPage - 1) * pageSize,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
    },
  })

  // Get distinct modules from DB (in case there are legacy ones not in ALL_MODULES)
  const distinctModules = await prisma.auditLog.findMany({
    distinct: ["module"],
    select: { module: true },
  })

  // Combine DB modules with ALL_MODULES to ensure everything is listed
  const combinedModules = new Set(ALL_MODULES)
  distinctModules.forEach(m => combinedModules.add(m.module))
  const moduleOptions = Array.from(combinedModules).sort()

  // Fetch ALL users for the user dropdown instead of just those who have audit logs
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  })

  // Stats
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [todayCount, weekCount] = await Promise.all([
    prisma.auditLog.count({ where: { timestamp: { gte: todayStart } } }),
    prisma.auditLog.count({
      where: {
        timestamp: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  // Serialize for client
  const serializedLogs = logs.map((log) => ({
    id: log.id,
    action: log.action,
    module: log.module,
    recordId: log.recordId,
    changes: log.changes as Record<string, unknown> | null,
    timestamp: log.timestamp.toISOString(),
    ipAddress: log.ipAddress,
    user: {
      id: log.user.id,
      name: log.user.name,
      email: log.user.email,
      role: log.user.role,
    },
  }))

  // moduleOptions already defined above
  const userOptions = allUsers.map((u) => ({
    id: u.id,
    name: u.name || u.email,
    role: u.role,
  }))

  return (
    <AuditLogClient
      logs={serializedLogs}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={currentPage}
      todayCount={todayCount}
      weekCount={weekCount}
      moduleOptions={moduleOptions}
      userOptions={userOptions}
      filters={{
        action: actionFilter || "ALL",
        module: moduleFilter || "ALL",
        user: userFilter || "ALL",
        q: searchQuery || "",
      }}
    />
  )
}
