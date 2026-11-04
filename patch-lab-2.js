const fs = require('fs');

function patchEntry(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /admission: \{[\s\S]*?\},/,
    `admission: { include: { patient: { include: { user: true } } } }, emergencyVisit: { include: { patient: { include: { user: true } } } },`
  );
  content = content.replace(/request\.admission\.patient\.user\.name/g, "(request.admission?.patient?.user?.name || request.emergencyVisit?.patient?.user?.name)");
  fs.writeFileSync(path, content);
}

patchEntry('app/dashboard/lab/entry/[requestId]/page.tsx');

function patchLabAction(path) {
  let content = fs.readFileSync(path, 'utf8');
  // admissionId is now string | null, but the function might return string. Let's fix that.
  content = content.replace(/admissionId: string/g, "admissionId: string | null");
  content = content.replace(/emergencyVisitId: string/g, "emergencyVisitId: string | null");
  fs.writeFileSync(path, content);
}

patchLabAction('lib/actions/lab.ts');

