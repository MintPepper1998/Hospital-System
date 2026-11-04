const fs = require('fs');
const path = require('path');

const dirPath = path.join(__dirname, 'app/actions');
const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  const filePath = path.join(dirPath, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('.billing.count()')) {
    const regex = /const billCount = await (tx|prisma)\.billing\.count\(\)\s+const billNumber = `(INV-ER|IPD|BILL)-\$\{([^}]+)\}-\$\{([^}]+)\.toString\(\)\.padStart\([45], "0"\)\}`/g;
    
    content = content.replace(regex, (match, context, prefix, yearVar) => {
      return `const lastBill = await ${context}.billing.findFirst({
      where: { billNumber: { startsWith: \`${prefix}-\${${yearVar}}-\` } },
      orderBy: { billNumber: 'desc' }
    })
    const lastSeq = lastBill?.billNumber ? parseInt(lastBill.billNumber.split('-')[2]) || 0 : 0
    const billNumber = \`${prefix}-\${${yearVar}}-\${String(lastSeq + 1).padStart(5, "0")}\``;
    });
    fs.writeFileSync(filePath, content);
    console.log(file, 'updated');
  }
});
