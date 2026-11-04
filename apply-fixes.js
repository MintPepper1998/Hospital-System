const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'lib/actions.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add fatherSpouseName and motherName
content = content.replace(
  'const fatherOrHusbandName = formData.get("fatherOrHusbandName") as string',
  'const fatherOrHusbandName = formData.get("fatherOrHusbandName") as string\n    const fatherSpouseName = formData.get("fatherSpouseName") as string\n    const motherName = formData.get("motherName") as string'
);

content = content.replace(
  'fatherOrHusbandName: fatherOrHusbandName || null,',
  'fatherOrHusbandName: fatherOrHusbandName || null,\n          fatherSpouseName: fatherSpouseName || null,\n          motherName: motherName || null,'
);

// 2. Fix prisma.billing.count() to findFirst logic globally for lib/actions.ts
const regex = /const billCount = await (tx|prisma)\.billing\.count\(\)\s+const billNumber = `(OPD|BILL|OT|IPD)-\$\{([^}]+)\}-\$\{String\(billCount \+ 1\)\.padStart\(4, "0"\)\}`/g;

content = content.replace(regex, (match, context, prefix, yearVar) => {
  return `const lastBill = await ${context}.billing.findFirst({
      where: { billNumber: { startsWith: \`${prefix}-\${${yearVar}}-\` } },
      orderBy: { billNumber: 'desc' }
    })
    const lastSeq = lastBill?.billNumber ? parseInt(lastBill.billNumber.split('-')[2]) || 0 : 0
    const billNumber = \`${prefix}-\${${yearVar}}-\${String(lastSeq + 1).padStart(4, "0")}\``;
});

fs.writeFileSync(filePath, content);
console.log('actions.ts successfully patched');
