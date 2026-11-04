const fs = require('fs');

function patchLabQueue(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /admission: \{[\s\S]*?\},/,
    `admission: { include: { patient: { include: { user: true } }, primaryDoctor: { include: { user: true } }, bed: { include: { ward: true } } } }, emergencyVisit: { include: { patient: { include: { user: true } }, assignedDoctor: { include: { user: true } }, bed: true } },`
  );
  
  content = content.replace(/req\.admission\.patient\.user\.name/g, "(req.admission?.patient?.user?.name || req.emergencyVisit?.patient?.user?.name)");
  content = content.replace(/req\.admission\.primaryDoctor\.user\.name/g, "(req.admission?.primaryDoctor?.user?.name || req.emergencyVisit?.assignedDoctor?.user?.name)");
  content = content.replace(/req\.admission\.bed\.ward\.name/g, "(req.admission?.bed?.ward?.name || 'ER')");
  content = content.replace(/req\.admission\.bed\.bedNumber/g, "(req.admission?.bed?.bedNumber || req.emergencyVisit?.bed?.bedNumber)");
  content = content.replace(/req\.admission\.admissionDate/g, "(req.admission?.admissionDate || req.emergencyVisit?.arrivalTime)");

  // For r.admission instead of req.admission (radiology queue)
  content = content.replace(/r\.admission\.patient\.user\.name/g, "(r.admission?.patient?.user?.name || r.emergencyVisit?.patient?.user?.name)");
  content = content.replace(/r\.admission\.primaryDoctor\.user\.name/g, "(r.admission?.primaryDoctor?.user?.name || r.emergencyVisit?.assignedDoctor?.user?.name)");
  content = content.replace(/r\.admission\.bed\.ward\.name/g, "(r.admission?.bed?.ward?.name || 'ER')");
  content = content.replace(/r\.admission\.bed\.bedNumber/g, "(r.admission?.bed?.bedNumber || r.emergencyVisit?.bed?.bedNumber)");
  content = content.replace(/r\.admission\.admissionDate/g, "(r.admission?.admissionDate || r.emergencyVisit?.arrivalTime)");

  fs.writeFileSync(path, content);
}

patchLabQueue('app/dashboard/lab/queue/page.tsx');
patchLabQueue('app/dashboard/lab/pathology/queue/page.tsx');
patchLabQueue('app/dashboard/lab/radiology/queue/page.tsx');

function patchPrint(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /admission: \{[\s\S]*?\},/,
    `admission: { include: { patient: { include: { user: true } }, primaryDoctor: { include: { user: true } }, bed: { include: { ward: true } } } }, emergencyVisit: { include: { patient: { include: { user: true } }, assignedDoctor: { include: { user: true } }, bed: true } },`
  );
  content = content.replace(/request\.admission\.patient\.user\.name/g, "(request.admission?.patient?.user?.name || request.emergencyVisit?.patient?.user?.name)");
  content = content.replace(/request\.admission\.patient\.patientId/g, "(request.admission?.patient?.patientId || request.emergencyVisit?.patient?.patientId)");
  content = content.replace(/request\.admission\.patient\.gender/g, "(request.admission?.patient?.gender || request.emergencyVisit?.patient?.gender)");
  content = content.replace(/request\.admission\.patient\.dateOfBirth/g, "(request.admission?.patient?.dateOfBirth || request.emergencyVisit?.patient?.dateOfBirth)");
  content = content.replace(/request\.admission\.primaryDoctor\.user\.name/g, "(request.admission?.primaryDoctor?.user?.name || request.emergencyVisit?.assignedDoctor?.user?.name)");
  content = content.replace(/request\.admission\.bed\.ward\.name/g, "(request.admission?.bed?.ward?.name || 'ER')");
  content = content.replace(/request\.admission\.bed\.bedNumber/g, "(request.admission?.bed?.bedNumber || request.emergencyVisit?.bed?.bedNumber)");
  fs.writeFileSync(path, content);
}

patchPrint('app/dashboard/lab/print/[requestId]/page.tsx');
patchPrint('app/dashboard/radiology/print/[requestId]/page.tsx');

