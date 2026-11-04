const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function verify() {
  const [pat, appt, ipd, bill, surg, txn, user, ward, bed, lab, med, dt, sp] = await Promise.all([
    p.patient.count(), p.appointment.count(), p.iPDAdmission.count(),
    p.billing.count(), p.surgery.count(), p.transaction.count(),
    p.user.count(), p.ward.count(), p.bed.count(),
    p.labTestCatalog.count(), p.medicine.count(),
    p.dischargeTypeConfig.count(), p.surgeryProcedure.count(),
  ]);
  console.log("=== VERIFICATION ===");
  console.log("CLEARED (should be 0):");
  console.log("  Patients:", pat);
  console.log("  Appointments:", appt);
  console.log("  IPD Admissions:", ipd);
  console.log("  Billing:", bill);
  console.log("  Surgeries:", surg);
  console.log("  Transactions:", txn);
  console.log("PRESERVED (should be > 0):");
  console.log("  Users:", user);
  console.log("  Wards:", ward);
  console.log("  Beds:", bed);
  console.log("  Lab Catalogs:", lab);
  console.log("  Medicines:", med);
  console.log("  Discharge Types:", dt);
  console.log("  Surgery Procedures:", sp);
}
verify().finally(() => p.$disconnect());
