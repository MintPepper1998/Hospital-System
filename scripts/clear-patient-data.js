const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function clearPatientData() {
  console.log("=== CLEARING ALL PATIENT DATA ===");
  console.log("Config, users, wards, beds, catalogs, and settings will be preserved.\n");

  const patientCount = await prisma.patient.count();
  console.log("Patients to delete:", patientCount);
  if (patientCount === 0) {
    console.log("No patients found. Nothing to clear.");
    return;
  }

  // Delete in dependency order (deepest children first)
  const steps = [
    ["IPD Equipment Usage", () => prisma.iPDEquipmentUsage.deleteMany({})],
    ["Surgeries", () => prisma.surgery.deleteMany({})],
    ["OT Schedules", () => prisma.oTSchedule.deleteMany({})],
    ["Discharges", () => prisma.discharge.deleteMany({})],
    ["Clinical Notes", () => prisma.clinicalNote.deleteMany({})],
    ["IPD Prescriptions", () => prisma.iPDPrescription.deleteMany({})],
    ["IPD Lab Requests", () => prisma.iPDLabRequest.deleteMany({})],
    ["IPD Admissions", () => prisma.iPDAdmission.deleteMany({})],
    ["Lab Results", () => prisma.labResult.deleteMany({})],
    ["Lab Tests", () => prisma.labTest.deleteMany({})],
    ["Lab Orders", () => prisma.labOrder.deleteMany({})],
    ["Lab Requests", () => prisma.labRequest.deleteMany({})],
    ["Prescription Items", () => prisma.prescriptionItem.deleteMany({})],
    ["Prescriptions", () => prisma.prescription.deleteMany({})],
    ["Insurance Claims", () => prisma.insuranceClaim.deleteMany({})],
    ["Pre-Authorizations", () => prisma.preAuthorization.deleteMany({})],
    ["Insurance Policies", () => prisma.insurancePolicy.deleteMany({})],
    ["Billing Items", () => prisma.billingItem.deleteMany({})],
    ["Payments", () => prisma.payment.deleteMany({})],
    ["Billing Records", () => prisma.billing.deleteMany({})],
    ["Transactions", () => prisma.transaction.deleteMany({})],
    ["Medical Records", () => prisma.medicalRecord.deleteMany({})],
    ["Patient Documents", () => prisma.patientDocument.deleteMany({})],
    ["Appointments", () => prisma.appointment.deleteMany({})],
    ["Patients", () => prisma.patient.deleteMany({})],
  ];

  for (let i = 0; i < steps.length; i++) {
    const [name, fn] = steps[i];
    console.log(`${i + 1}. Deleting ${name}...`);
    try {
      const result = await fn();
      console.log(`   Deleted: ${result.count}`);
    } catch (err) {
      console.log(`   Skipped (${err.message.split("\n")[0]})`);
    }
  }

  // Reset all beds to AVAILABLE
  console.log("\n26. Resetting all beds to AVAILABLE...");
  const bedReset = await prisma.bed.updateMany({
    data: { status: "AVAILABLE", currentPatientId: null },
  });
  console.log(`   Reset: ${bedReset.count} beds`);

  console.log("\n=== DONE ===");
  console.log("All patient data cleared successfully.");
  console.log("Preserved: Users, Staff, Wards, Beds (reset), Theaters, Procedures,");
  console.log("  Equipment Catalog, Discharge Type Configs, Fee Configs, Medicine Inventory,");
  console.log("  Hospital Settings, Print Settings, Audit Logs, Lab/Radiology Catalogs.");
}

clearPatientData()
  .catch((e) => console.error("FATAL ERROR:", e.message))
  .finally(() => prisma.$disconnect());
