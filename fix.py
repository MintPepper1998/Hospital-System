import os
import re

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix the messed up Id
    content = content.replace('(req.admission || req.emergencyVisit)Id', 'req.admissionId')
    content = content.replace('(rx.admission || rx.emergencyVisit)Id', 'rx.admissionId')
    content = content.replace('(r.admission || r.emergencyVisit)Id', 'r.admissionId')
    
    # Wait, some places actually meant to fallback on emergencyVisitId?
    # Yes, we should probably change it to (req.admissionId || req.emergencyVisitId)
    content = content.replace('req.admissionId', '(req.admissionId || req.emergencyVisitId)')
    content = content.replace('rx.admissionId', '(rx.admissionId || rx.emergencyVisitId)')
    content = content.replace('r.admissionId', '(r.admissionId || r.emergencyVisitId)')
    
    # We also might have nested replaces like ((req.admissionId || req.emergencyVisitId) || req.emergencyVisitId). Let's be careful.
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

files = [
    'app/dashboard/lab/pathology/queue/page.tsx', 
    'app/dashboard/lab/print/[requestId]/page.tsx',
    'app/dashboard/lab/queue/page.tsx',
    'app/dashboard/lab/radiology/queue/page.tsx',
    'app/dashboard/pharmacy/pos/page.tsx',
    'app/dashboard/pharmacy/queue/page.tsx',
    'app/dashboard/radiology/print/[requestId]/page.tsx',
    'app/dashboard/radiology/queue/page.tsx'
]

for f in files:
    fix_file(f)
print("done")
