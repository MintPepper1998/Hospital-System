import { prisma } from "../lib/prisma";

async function main() {
  const settings = await prisma.hospitalSettings.findUnique({
    where: { id: 1 },
  });
  console.log("Hospital Settings WhatsApp Config:", {
    whatsappEnabled: settings?.whatsappEnabled,
    whatsappAuthKey: settings?.whatsappAuthKey,
    whatsappBusinessNumber: settings?.whatsappBusinessNumber
  });
  console.log("ENV VARS:", {
    WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
