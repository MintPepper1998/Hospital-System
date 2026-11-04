const fs = require('fs');

function patchPosPage() {
  const path = 'app/dashboard/pharmacy/pos/page.tsx';
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /for \(const rx of ipdPrescriptions\) \{[\s\S]*?ipdByAdmission\.get\(key\)\!\.prescriptions\.push\(rx\)\n  \}/,
    `for (const rx of ipdPrescriptions) {
    const key = rx.admissionId || rx.emergencyVisitId || "unknown";
    if (!ipdByAdmission.has(key)) {
      const patientName = rx.admission?.patient?.user?.name || rx.emergencyVisit?.patient?.user?.name || "Unknown";
      ipdByAdmission.set(key, {
        admissionId: key,
        patientName,
        patientInitial: patientName.charAt(0).toUpperCase(),
        patientId: rx.admission?.patient?.patientId || rx.emergencyVisit?.patient?.patientId || "",
        doctorName: rx.admission?.primaryDoctor?.user?.name || rx.emergencyVisit?.assignedDoctor?.user?.name || "Unknown",
        bedInfo: rx.admission ? \`\${rx.admission.bed.ward.name} - Bed \${rx.admission.bed.bedNumber}\` : (rx.emergencyVisit?.bed ? \`ER Bed \${rx.emergencyVisit.bed.bedNumber}\` : "No Bed"),
        wardName: rx.admission?.bed?.ward?.name || "ER",
        admissionDate: rx.admission?.admissionDate || rx.emergencyVisit?.arrivalTime || new Date(),
        prescriptions: [],
      });
    }
    ipdByAdmission.get(key)!.prescriptions.push(rx);
  }`
  );
  // Also need to include emergencyVisit in the query
  content = content.replace(
    /admission: \{[\s\S]*?\},/,
    `admission: { include: { patient: { include: { user: true } }, primaryDoctor: { include: { user: true } }, bed: { include: { ward: true } } } }, emergencyVisit: { include: { patient: { include: { user: true } }, assignedDoctor: { include: { user: true } }, bed: true } },`
  );
  fs.writeFileSync(path, content);
}

function patchQueuePage() {
  const path = 'app/dashboard/pharmacy/queue/page.tsx';
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(
    /for \(const rx of ipdPrescriptions\) \{[\s\S]*?ipdByAdmission\.get\(key\)\!\.prescriptions\.push\(rx\)\n  \}/,
    `for (const rx of ipdPrescriptions) {
    const key = rx.admissionId || rx.emergencyVisitId || "unknown";
    if (!ipdByAdmission.has(key)) {
      ipdByAdmission.set(key, {
        admissionId: key,
        patientName: rx.admission?.patient?.user?.name || rx.emergencyVisit?.patient?.user?.name || "Unknown",
        doctorName: rx.admission?.primaryDoctor?.user?.name || rx.emergencyVisit?.assignedDoctor?.user?.name || "Unknown",
        bedInfo: rx.admission ? \`\${rx.admission.bed.ward.name} - \${rx.admission.bed.bedNumber}\` : (rx.emergencyVisit?.bed ? \`ER Bed \${rx.emergencyVisit.bed.bedNumber}\` : "No Bed"),
        prescriptions: [],
      });
    }
    ipdByAdmission.get(key)!.prescriptions.push(rx);
  }`
  );
  content = content.replace(
    /admission: \{[\s\S]*?\},/,
    `admission: { include: { patient: { include: { user: true } }, primaryDoctor: { include: { user: true } }, bed: { include: { ward: true } } } }, emergencyVisit: { include: { patient: { include: { user: true } }, assignedDoctor: { include: { user: true } }, bed: true } },`
  );
  // Fix console log
  content = content.replace(
    /patient: rx\.admission\.patient\.user\.name,/,
    `patient: rx.admission?.patient?.user?.name || rx.emergencyVisit?.patient?.user?.name,`
  );
  fs.writeFileSync(path, content);
}

patchPosPage();
patchQueuePage();
