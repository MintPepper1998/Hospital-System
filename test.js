const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const req = await prisma.labRequest.findUnique({
    where: { id: 'cmt8xyhta0009ld1c9hvx3re3' }
  });
  console.log('req:', req);
  
  if (req) {
    if (req.testCatalogId) {
      console.log('Found testCatalogId:', req.testCatalogId);
      const cat = await prisma.labTestCatalog.findUnique({
        where: { id: req.testCatalogId }
      });
      console.log('Cat name:', cat?.name);
      console.log('Cat parameters:', cat?.parameters);
    } else {
      console.log('No testCatalogId, searching by name:', req.testName);
      const match = await prisma.labTestCatalog.findFirst({
        where: { name: req.testName }
      });
      console.log('Match name:', match?.name);
      console.log('Match parameters:', match?.parameters);
    }
  } else {
    console.log('No labRequest found. Maybe it is an IPD request?');
    const ipdReq = await prisma.iPDLabRequest.findUnique({
      where: { id: 'cmt8xyhta0009ld1c9hvx3re3' }
    });
    console.log('ipdReq:', ipdReq);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
