const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

async function deletePatientUsers() {
  const count = await p.user.count({ where: { role: "PATIENT" } });
  console.log("Patient user accounts to delete:", count);

  if (count === 0) {
    console.log("No patient users found.");
    return;
  }

  // Delete related sessions and accounts first
  const patientUserIds = (await p.user.findMany({ where: { role: "PATIENT" }, select: { id: true } })).map(u => u.id);

  console.log("1. Deleting sessions...");
  const r1 = await p.session.deleteMany({ where: { userId: { in: patientUserIds } } });
  console.log("   Deleted:", r1.count);

  console.log("2. Deleting accounts...");
  const r2 = await p.account.deleteMany({ where: { userId: { in: patientUserIds } } });
  console.log("   Deleted:", r2.count);

  console.log("3. Deleting patient user records...");
  const r3 = await p.user.deleteMany({ where: { role: "PATIENT" } });
  console.log("   Deleted:", r3.count);

  const remaining = await p.user.count();
  const staffRemaining = await p.user.count({ where: { role: { not: "PATIENT" } } });
  console.log("\nUsers remaining:", remaining, "(all staff/admin)");
}

deletePatientUsers().finally(() => p.$disconnect());
