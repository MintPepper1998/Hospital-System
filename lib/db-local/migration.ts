import { PrismaClient, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { localStore } from "./store"
import { getAllPrismaModelNames } from "./sync"

export interface MigrationOptions {
  /**
   * Source of data:
   * - "local": Read from local_database/tables/
   * - "database" | connection URL: Read from source PostgreSQL database
   */
  source: "local" | "database" | string

  /**
   * Target for data:
   * - "local": Write to local_database/tables/
   * - "database" | connection URL: Write to target PostgreSQL database
   */
  target: "local" | "database" | string

  /**
   * Optional specific models to migrate. If omitted, migrates all models.
   */
  models?: string[]

  /**
   * Batch size for insertion chunks (default: 200)
   */
  batchSize?: number

  /**
   * Dry run: only inspect and count, do not insert or modify target
   */
  dryRun?: boolean

  /**
   * If true, truncates/clears existing records in target before inserting
   */
  truncateTarget?: boolean

  /**
   * Progress callback
   */
  onProgress?: (progress: {
    model: string
    current: number
    total: number
    recordsProcessed: number
    status: "reading" | "writing" | "done" | "skipped" | "error"
    message?: string
  }) => void
}

export interface MigrationReport {
  success: boolean
  source: string
  target: string
  isDryRun: boolean
  totalModelsProcessed: number
  totalRecordsMigrated: number
  durationMs: number
  results: Record<
    string,
    {
      sourceCount: number
      targetCount: number
      status: "SUCCESS" | "SKIPPED" | "ERROR"
      error?: string
    }
  >
  error?: string
}

/**
 * Ordered list of models to respect foreign key hierarchies when replicating
 */
const DEPENDENCY_ORDERED_MODELS = [
  // 1. Independent Core & Lookups
  "User",
  "Department",
  "RoleTemplate",
  "TariffMaster",
  "IcdCode",
  "HospitalSettings",
  "PrintSettings",
  "PrintTemplateSettings",
  "Shift",
  "GeofenceConfig",
  "FiscalYear",
  "CostCenter",
  "FinancialAccount",
  "AccountGroup",
  "InsuranceProvider",
  "MedicineCustomType",
  "DischargeTypeConfig",
  "CanteenMealSlot",
  "CanteenDietPlan",
  "CanteenMenuItem",
  "Ambulance",
  "AmbulanceBillingConfig",
  "Investor",
  "HRDepartment",

  // 2. Staff, Doctors, Suppliers & Customers
  "Staff",
  "Employee",
  "Supplier",
  "PharmacyCustomer",
  "DoctorSchedule",
  "ERDoctorShift",
  "Patient",
  "GeneralItem",
  "Medicine",
  "Ward",
  "OperationTheater",
  "AmbulanceEquipment",

  // 3. Profiles, Batches, Policies, Beds
  "StaffAttendance",
  "SalaryRecord",
  "TemporaryPermission",
  "Account",
  "Session",
  "VerificationToken",
  "PatientDocument",
  "PatientFeedback",
  "Bed",
  "InventoryBatch",
  "InsurancePolicy",
  "ProviderTariff",
  "SurgeryProcedure",
  "CanteenDailyMenu",
  "CanteenInventoryItem",
  "MarketingContact",

  // 4. Clinical Encounters & Orders
  "Appointment",
  "MedicalRecord",
  "EmergencyVisit",
  "CasualtyVisit",
  "IPDAdmission",
  "Operation",
  "Surgery",
  "PurchaseOrder",
  "PurchaseInvoice",
  "Challan",
  "Voucher",
  "ExpenseRequest",

  // 5. Clinical Details & Sub-items
  "Prescription",
  "PrescriptionItem",
  "CasualtyProcedure",
  "ClinicalNote",
  "IPDPrescription",
  "IPDLabRequest",
  "IPDNurseAssignment",
  "IPDAdmissionDoctor",
  "BedTransferHistory",
  "PatientTimelineEvent",
  "PatientVital",
  "IPDCustomCharge",
  "IPDEquipmentItem",
  "IPDEquipmentUsage",
  "Discharge",
  "DischargeMedicine",
  "SurgeryStaffAssignment",
  "SurgeryChargeComponent",
  "SurgeryProcedureMedicine",
  "OTSchedule",
  "PurchaseOrderItem",
  "PurchaseItem",
  "ChallanItem",
  "SupplierPayment",
  "VoucherEntry",
  "ExpenseApproval",
  "ApprovalPolicy",
  "CostAllocation",
  "Budget",
  "BudgetItem",

  // 6. Diagnostics & Lab
  "LabTestCatalog",
  "LabRequest",
  "LabOrder",
  "LabTest",
  "LabResult",

  // 7. Billing, Payments & Cash Ledger
  "Billing",
  "BillingItem",
  "Payment",
  "InsuranceClaim",
  "PreAuthorization",
  "Transaction",
  "PharmacyDayClose",
  "HospitalDayClose",
  "CreditEntry",
  "CreditPayment",
  "PharmacyVoucher",
  "StockAdjustment",
  "StockAdjustmentItem",
  "PurchaseReturn",
  "PurchaseReturnItem",
  "SalesReturn",
  "SalesReturnItem",

  // 8. Auxiliary & Logistics
  "CanteenPatientDiet",
  "CanteenMealOrder",
  "CanteenMealOrderItem",
  "CanteenToken",
  "CanteenTokenItem",
  "CanteenStockEntry",
  "AmbulanceStaffAssignment",
  "AmbulanceTrip",
  "AmbulanceBilling",
  "InvestmentInflow",
  "CapitalExpense",
  "HospitalFee",
  "MedicalCamp",
  "AuditLog",
  "Notification",
  "Roster",
  "WhatsAppLog",
  "WhatsAppTemplate",
  "WhatsAppConversation",
  "WhatsAppMessage",
  "WhatsAppAutomationRule",
]

/**
 * Resolves the execution order of models, ensuring any unlisted models are still included.
 */
function getOrderedModels(filterModels?: string[]): string[] {
  const allKnown = getAllPrismaModelNames()
  const ordered: string[] = []

  // Add recognized models in dependency order
  for (const m of DEPENDENCY_ORDERED_MODELS) {
    if (allKnown.includes(m)) {
      if (!filterModels || filterModels.includes(m)) {
        ordered.push(m)
      }
    }
  }

  // Add any remaining models in the schema that weren't in the static list
  for (const m of allKnown) {
    if (!ordered.includes(m)) {
      if (!filterModels || filterModels.includes(m)) {
        ordered.push(m)
      }
    }
  }

  return ordered
}

/**
 * Creates a connected PrismaClient instance for a given connection string
 */
function createClientForUrl(url: string): PrismaClient {
  return new PrismaClient({
    datasourceUrl: url,
    log: ["error"],
  })
}

/**
 * Execute Database Data Migration
 */
export async function migrateDatabaseData(options: MigrationOptions): Promise<MigrationReport> {
  const startTime = Date.now()
  const orderedModels = getOrderedModels(options.models)
  const batchSize = options.batchSize || 200
  const isDryRun = !!options.dryRun

  console.log(`[DatabaseMigration] Initializing migration: ${options.source} -> ${options.target} (Dry Run: ${isDryRun})`)
  console.log(`[DatabaseMigration] Models to process: ${orderedModels.length}`)

  let sourceClient: PrismaClient | null = null
  let targetClient: PrismaClient | null = null
  let shouldDisconnectSource = false
  let shouldDisconnectTarget = false

  // Set up Source Client if reading from DB
  if (options.source === "database") {
    sourceClient = prisma
  } else if (options.source !== "local") {
    sourceClient = createClientForUrl(options.source)
    shouldDisconnectSource = true
  }

  // Set up Target Client if writing to DB
  if (options.target === "database") {
    targetClient = prisma
  } else if (options.target !== "local") {
    targetClient = createClientForUrl(options.target)
    shouldDisconnectTarget = true
  }

  const report: MigrationReport = {
    success: true,
    source: typeof options.source === "string" && options.source.startsWith("postgresql://") ? "custom-db" : options.source,
    target: typeof options.target === "string" && options.target.startsWith("postgresql://") ? "custom-db" : options.target,
    isDryRun,
    totalModelsProcessed: 0,
    totalRecordsMigrated: 0,
    durationMs: 0,
    results: {},
  }

  try {
    // If target is a PostgreSQL database, disable foreign key triggers temporarily during migration
    if (targetClient && !isDryRun) {
      try {
        await targetClient.$executeRawUnsafe("SET session_replication_role = 'replica';")
        console.log("[DatabaseMigration] Disabled foreign key triggers on target database (session_replication_role = 'replica')")
      } catch (err: any) {
        console.warn("[DatabaseMigration] Warning: Could not set session_replication_role (may require superuser or standard constraint handling):", err?.message)
      }
    }

    // Process each model in dependency order
    for (let i = 0; i < orderedModels.length; i++) {
      const modelName = orderedModels[i]
      const delegateName = modelName.charAt(0).toLowerCase() + modelName.slice(1)

      if (options.onProgress) {
        options.onProgress({
          model: modelName,
          current: i + 1,
          total: orderedModels.length,
          recordsProcessed: 0,
          status: "reading",
        })
      }

      // 1. Fetch Source Records
      let sourceRecords: any[] = []
      try {
        if (options.source === "local") {
          sourceRecords = localStore.getLocalModelRecords(modelName)
        } else if (sourceClient) {
          const delegate = (sourceClient as any)[delegateName]
          if (delegate && typeof delegate.findMany === "function") {
            sourceRecords = await delegate.findMany()
          }
        }
      } catch (err: any) {
        console.error(`[DatabaseMigration] Failed to read source for ${modelName}:`, err?.message)
        report.results[modelName] = {
          sourceCount: 0,
          targetCount: 0,
          status: "ERROR",
          error: `Source read failed: ${err?.message}`,
        }
        continue
      }

      const sourceCount = sourceRecords.length

      // 2. If writing to local:
      if (options.target === "local") {
        if (!isDryRun) {
          localStore.saveFullTable(modelName, sourceRecords)
        }
        report.results[modelName] = {
          sourceCount,
          targetCount: sourceCount,
          status: "SUCCESS",
        }
        report.totalRecordsMigrated += sourceCount
        report.totalModelsProcessed++
        continue
      }

      // 3. If writing to a PostgreSQL database:
      if (targetClient) {
        const targetDelegate = (targetClient as any)[delegateName]
        if (!targetDelegate) {
          report.results[modelName] = {
            sourceCount,
            targetCount: 0,
            status: "SKIPPED",
            error: `Target client does not have model delegate ${delegateName}`,
          }
          continue
        }

        if (sourceCount === 0) {
          report.results[modelName] = {
            sourceCount: 0,
            targetCount: 0,
            status: "SUCCESS",
          }
          report.totalModelsProcessed++
          continue
        }

        if (isDryRun) {
          report.results[modelName] = {
            sourceCount,
            targetCount: sourceCount,
            status: "SUCCESS",
          }
          report.totalRecordsMigrated += sourceCount
          report.totalModelsProcessed++
          continue
        }

        // Optional truncate
        if (options.truncateTarget && typeof targetDelegate.deleteMany === "function") {
          try {
            await targetDelegate.deleteMany()
          } catch (e) {}
        }

        // Insert in batches using createMany or single creates
        let insertedCount = 0
        try {
          for (let start = 0; start < sourceRecords.length; start += batchSize) {
            const chunk = sourceRecords.slice(start, start + batchSize)

            if (typeof targetDelegate.createMany === "function") {
              const res = await targetDelegate.createMany({
                data: chunk,
                skipDuplicates: true,
              })
              insertedCount += res.count || chunk.length
            } else {
              // Model does not support createMany, insert individually
              for (const record of chunk) {
                try {
                  await targetDelegate.upsert({
                    where: { id: record.id },
                    create: record,
                    update: record,
                  })
                  insertedCount++
                } catch (e: any) {
                  // If id is not unique, try create
                  try {
                    await targetDelegate.create({ data: record })
                    insertedCount++
                  } catch (err2) {}
                }
              }
            }
          }

          report.results[modelName] = {
            sourceCount,
            targetCount: insertedCount,
            status: "SUCCESS",
          }
          report.totalRecordsMigrated += insertedCount
          report.totalModelsProcessed++

          if (options.onProgress) {
            options.onProgress({
              model: modelName,
              current: i + 1,
              total: orderedModels.length,
              recordsProcessed: insertedCount,
              status: "done",
            })
          }
        } catch (err: any) {
          console.error(`[DatabaseMigration] Failed to insert into target for ${modelName}:`, err?.message)
          report.results[modelName] = {
            sourceCount,
            targetCount: insertedCount,
            status: "ERROR",
            error: err?.message,
          }
        }
      }
    }

    // Re-enable foreign key triggers on target database
    if (targetClient && !isDryRun) {
      try {
        await targetClient.$executeRawUnsafe("SET session_replication_role = 'origin';")
        console.log("[DatabaseMigration] Re-enabled foreign key triggers on target database (session_replication_role = 'origin')")
      } catch (err: any) {
        console.warn("[DatabaseMigration] Warning: Could not reset session_replication_role:", err?.message)
      }
    }
  } catch (err: any) {
    report.success = false
    report.error = err?.message || String(err)
    console.error("[DatabaseMigration] Fatal error during migration:", err)
  } finally {
    if (shouldDisconnectSource && sourceClient) {
      await sourceClient.$disconnect().catch(() => {})
    }
    if (shouldDisconnectTarget && targetClient) {
      await targetClient.$disconnect().catch(() => {})
    }
  }

  report.durationMs = Date.now() - startTime
  console.log(`[DatabaseMigration] Finished. Migrated ${report.totalRecordsMigrated} records in ${(report.durationMs / 1000).toFixed(2)}s`)
  return report
}

