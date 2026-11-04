import { prisma } from "../lib/prisma";

async function main() {
  const templates = await prisma.whatsAppTemplate.findMany();
  console.log(templates);
}

main().catch(console.error).finally(() => prisma.$disconnect());
