const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.bed.updateMany({ data: { status: "AVAILABLE" } })
  .then(r => { console.log("Beds reset to AVAILABLE:", r.count); })
  .finally(() => prisma.$disconnect());
