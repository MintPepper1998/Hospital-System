# Hospital ERP — Documentation

Complete documentation for the Hospital ERP Management System.

All documentation files are in this single folder, numbered in reading order. Screenshots are in the `images/` subfolder.

---

## Getting Started

| # | File | Description |
|---|------|-------------|
| 03 | [System Requirements](03-system-requirements.md) | Hardware, software, and browser requirements |
| 04 | [Login](04-login.md) | How to log in and manage your account |
| 05 | [Dashboard Overview](05-dashboard-overview.md) | Navigate the main dashboard and sidebar |

---

## Insurance

| # | File | Description |
|---|------|-------------|
| 06 | [Overview](06-insurance-overview.md) | Insurance workflow — how it works in India |
| 07 | [Verify & Register](07-insurance-verify-register.md) | Insurance-first patient registration |
| 08 | [Active Policies](08-insurance-active-policies.md) | View and manage active insurance policies |
| 09 | [Cost Estimator](09-insurance-cost-estimator.md) | Estimate treatment cost vs insurance coverage |
| 10 | [Pre-Authorization](10-insurance-pre-authorization.md) | TPA pre-auth request workflow |
| 11 | [Cashless Claims](11-insurance-cashless-claims.md) | Submit and track cashless claims |
| 12 | [Reimbursement Claims](12-insurance-reimbursement-claims.md) | Reimbursement claim submission |
| 13 | [PMJAY Claims](13-insurance-pmjay-claims.md) | Ayushman Bharat / BSKY government scheme claims |
| 14 | [Tariff Master](14-insurance-tariff-master.md) | Hospital tariff rates for TPA agreements |
| 15 | [ICD-10 Codes](15-insurance-icd-codes.md) | Diagnosis codes used in insurance claims |

---

## Clinical

| # | File | Description |
|---|------|-------------|
| 16 | [OPD Queue](16-clinical-opd-queue.md) | Outpatient department queue and consultations |
| 17 | [EMR](17-clinical-emr.md) | Electronic Medical Records |
| 18 | [Operation Theatre](18-clinical-operation-theatre.md) | OT scheduling and management |

---

## IPD (Inpatient)

| # | File | Description |
|---|------|-------------|
| 19 | [Admission & Discharge](19-ipd-admission-discharge.md) | Patient admission, stay, and discharge workflow |
| 20 | [Bed Management](20-ipd-bed-management.md) | Ward and bed allocation |

---

## Diagnostics

| # | File | Description |
|---|------|-------------|
| 21 | [Pathology / Lab](21-diagnostics-pathology.md) | Lab test queue, results, and reports |
| 22 | [Radiology](22-diagnostics-radiology.md) | Imaging requests and radiology reports |

---

## Pharmacy

| # | File | Description |
|---|------|-------------|
| 23 | [POS Billing](23-pharmacy-pos-billing.md) | Point-of-sale medicine billing |
| 24 | [Inventory](24-pharmacy-inventory.md) | Stock management, purchase orders, expiry tracking |

---

## Finance & Billing

| # | File | Description |
|---|------|-------------|
| 25 | [Billing](25-finance-billing.md) | Patient billing and payment collection |
| 26 | [Purchases](26-finance-purchases.md) | Vendor management and purchase orders |
| 27 | [GST Reports](27-finance-gst-reports.md) | GST-compliant tax reports |

---

## HR & Payroll

| # | File | Description |
|---|------|-------------|
| 28 | [Staff Management](28-hr-staff-management.md) | Employee directory, departments, duty roster |
| 29 | [Payroll](29-hr-payroll.md) | Salary processing, payslips, statutory compliance |

---

## Admin & Settings

| # | File | Description |
|---|------|-------------|
| 30 | [User Management](30-admin-user-management.md) | User accounts, roles, and permissions |
| 31 | [Hospital Settings](31-admin-hospital-settings.md) | Hospital profile, departments, billing config |

---

## Quick Reference

| Module | Route | Sidebar Location |
|--------|-------|-----------------|
| Dashboard | `/dashboard` | Home |
| Insurance | `/dashboard/insurance` | Insurance |
| OPD | `/dashboard/clinical/opd` | Clinical |
| IPD | `/dashboard/clinical/ipd` | IPD & Beds |
| OT | `/dashboard/clinical/ot` | Clinical |
| EMR | `/dashboard/clinical/emr` | Clinical |
| Lab | `/dashboard/billing/diagnostics` | Pathology |
| Radiology | `/dashboard/billing/diagnostics` | Radiology |
| Pharmacy | `/dashboard/pharmacy` | Pharmacy |
| Billing | `/dashboard/finance/billing` | Finance |
| Purchases | `/dashboard/finance/purchases` | Finance |
| GST Reports | `/dashboard/finance/gst` | Finance |
| Staff | `/dashboard/hr/staff` | HR & Staff |
| Payroll | `/dashboard/hr/payroll` | HR & Staff |
| Users | `/dashboard/admin/users` | Admin |
| Settings | `/dashboard/admin` | Admin |
