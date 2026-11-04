const fs = require('fs');

function fixLabQueue(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  content = content.replace(/req\.admission/g, "(req.admission || req.emergencyVisit)");
  content = content.replace(/\(req\.admission \|\| req\.emergencyVisit\)\./g, "(req.admission || req.emergencyVisit)?.");
  
  content = content.replace(/rx\.admission/g, "(rx.admission || rx.emergencyVisit)");
  content = content.replace(/\(rx\.admission \|\| rx\.emergencyVisit\)\./g, "(rx.admission || rx.emergencyVisit)?.");
  
  content = content.replace(/r\.admission/g, "(r.admission || r.emergencyVisit)");
  content = content.replace(/\(r\.admission \|\| r\.emergencyVisit\)\./g, "(r.admission || r.emergencyVisit)?.");
  
  fs.writeFileSync(filePath, content);
}

[
 'app/dashboard/lab/pathology/queue/page.tsx', 
 'app/dashboard/lab/print/[requestId]/page.tsx',
 'app/dashboard/lab/queue/page.tsx',
 'app/dashboard/lab/radiology/queue/page.tsx',
 'app/dashboard/pharmacy/pos/page.tsx',
 'app/dashboard/pharmacy/queue/page.tsx',
 'app/dashboard/radiology/print/[requestId]/page.tsx',
 'app/dashboard/radiology/queue/page.tsx'
].forEach(fixLabQueue);

console.log('done');
