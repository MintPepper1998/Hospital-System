const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'lib/actions.ts');
let content = fs.readFileSync(filePath, 'utf8');

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
console.log('actions.ts updated');
