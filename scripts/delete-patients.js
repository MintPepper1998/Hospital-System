const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function deletePatients() {
  // Check for remaining FK dependencies
  const [opCount, patCount] = await Promise.all([
    p.operation.count(),
    p.patient.count(),
  ]);
  console.log("Operations:", opCount);
  console.log("Patients:", patCount);

  // Delete operations first (they reference patients)
  if (opCount > 0) {
    console.log("Deleting operations...");
    const r = await p.operation.deleteMany({});
    console.log("  Deleted:", r.count);
  }

  // Now delete patients
  console.log("Deleting patients...");
  try {
    const r = await p.patient.deleteMany({});
    console.log("  Deleted:", r.count, "patients");
  } catch (err) {
    console.log("  FAILED:", err.message.substring(0, 500));
    
    // Try to find what's blocking via raw SQL
    const blockers = await p.$queryRaw`
      SELECT tc.table_name, tc.constraint_name, ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.constraint_column_usage AS ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'Patient'
    `;
    console.log("FK constraints pointing to Patient:", JSON.stringify(blockers, null, 2));
  }

  const remaining = await p.patient.count();
  console.log("\nPatients remaining:", remaining);
}

deletePatients().finally(() => p.$disconnect());
