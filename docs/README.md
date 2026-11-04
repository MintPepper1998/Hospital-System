# Hospital ERP — Documentation

Complete documentation for the Hospital ERP Management System.

---

## Getting Started

| Page | Description |
|------|-------------|
| [System Requirements](getting-started/system-requirements.md) | Hardware, software, and browser requirements |
| [Login](getting-started/login.md) | How to log in and manage your account |
| [Dashboard Overview](getting-started/dashboard-overview.md) | Navigate the main dashboard and sidebar |

---

## Insurance

| Page | Description |
|------|-------------|
| [Overview](insurance/overview.md) | Insurance workflow — how it works in India |
| [Verify & Register](insurance/verify-register.md) | Insurance-first patient registration |
| [Active Policies](insurance/active-policies.md) | View and manage active insurance policies |
| [Cost Estimator](insurance/cost-estimator.md) | Estimate treatment cost vs insurance coverage |
| [Pre-Authorization](insurance/pre-authorization.md) | TPA pre-auth request workflow |
| [Cashless Claims](insurance/cashless-claims.md) | Submit and track cashless claims |
| [Reimbursement Claims](insurance/reimbursement-claims.md) | Reimbursement claim submission |
| [PMJAY Claims](insurance/pmjay-claims.md) | Ayushman Bharat / BSKY government scheme claims |
| [Tariff Master](insurance/tariff-master.md) | Hospital tariff rates for TPA agreements |
| [ICD-10 Codes](insurance/icd-codes.md) | Diagnosis codes used in insurance claims |

---

## Clinical

| Page | Description |
|------|-------------|
| [OPD Queue](clinical/opd-queue.md) | Outpatient department queue and consultations |
| [EMR](clinical/emr.md) | Electronic Medical Records |
| [Operation Theatre](clinical/operation-theatre.md) | OT scheduling and management |

---

## IPD (Inpatient)

| Page | Description |
|------|-------------|
| [Admission & Discharge](ipd/admission-discharge.md) | Patient admission, stay, and discharge workflow |
| [Bed Management](ipd/bed-management.md) | Ward and bed allocation |

---

## Diagnostics

| Page | Description |
|------|-------------|
| [Pathology / Lab](diagnostics/pathology.md) | Lab test queue, results, and reports |
| [Radiology](diagnostics/radiology.md) | Imaging requests and radiology reports |

---

## Pharmacy

| Page | Description |
|------|-------------|
| [POS Billing](pharmacy/pos-billing.md) | Point-of-sale medicine billing |
| [Inventory](pharmacy/inventory.md) | Stock management, purchase orders, expiry tracking |

---

## Finance & Billing

| Page | Description |
|------|-------------|
| [Billing](finance/billing.md) | Patient billing and payment collection |
| [Purchases](finance/purchases.md) | Vendor management and purchase orders |
| [GST Reports](finance/gst-reports.md) | GST-compliant tax reports |

---

## HR & Payroll

| Page | Description |
|------|-------------|
| [Staff Management](hr/staff-management.md) | Employee directory, departments, duty roster |
| [Payroll](hr/payroll.md) | Salary processing, payslips, statutory compliance |

---

## Admin & Settings

| Page | Description |
|------|-------------|
| [User Management](admin/user-management.md) | User accounts, roles, and permissions |
| [Hospital Settings](admin/hospital-settings.md) | Hospital profile, departments, billing config |

---

## Screenshots

All screenshot placeholders reference images in the `static/img/` folder. To add screenshots:

1. Navigate to each page in the application
2. Take a screenshot (use browser's built-in screenshot or Snipping Tool)
3. Save with the filename mentioned in each doc file (e.g., `login-page.png`)
4. Place in `docs/static/img/`

---

## Quick Reference

| Module | Route | Sidebar Location |
|--------|-------|-----------------|
| Dashboard | `/dashboard` | Home |
| Insurance | `/dashboard/insurance` | Insurance |
| OPD | `/dashboard/opd` | Clinical → OPD |
| IPD | `/dashboard/ipd` | Clinical → IPD |
| OT | `/dashboard/ot` | Clinical → OT |
| EMR | `/dashboard/emr` | Clinical → EMR |
| Lab | `/dashboard/lab` | Pathology |
| Radiology | `/dashboard/radiology` | Radiology |
| Pharmacy | `/dashboard/pharmacy` | Pharmacy |
| Billing | `/dashboard/billing` | Finance → Billing |
| Purchases | `/dashboard/purchases` | Finance → Purchases |
| GST Reports | `/dashboard/reports/gst` | Finance → GST Reports |
| Staff | `/dashboard/hr/staff` | HR → Staff |
| Payroll | `/dashboard/hr/payroll` | HR → Payroll |
| Users | `/dashboard/settings/users` | Settings → Users |
| Settings | `/dashboard/settings` | Settings |
