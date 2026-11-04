# Shree Kamal Hospital ERP - Complete User Guide

> **Version**: 2.0 | **Last Updated**: March 2026
> **Tech Stack**: Next.js 16 | React 19 | TypeScript | Tailwind CSS | PostgreSQL | Prisma ORM | NextAuth.js

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Dashboard](#2-dashboard)
3. [Clinical Module (OPD / OT / EMR)](#3-clinical-module)
4. [IPD & Bed Management](#4-ipd--bed-management)
5. [Pathology (Lab)](#5-pathology-lab)
6. [Radiology](#6-radiology)
7. [Pharmacy](#7-pharmacy)
8. [Insurance Management (NEW)](#8-insurance-management)
9. [Finance & Billing](#9-finance--billing)
10. [Reports](#10-reports)
11. [HR & Staff Management](#11-hr--staff-management)
12. [Admin & Settings](#12-admin--settings)
13. [User Roles & Permissions](#13-user-roles--permissions)
14. [Appendix: Indian Insurance Standards](#appendix-indian-insurance-standards)

---

## 1. System Overview

Shree Kamal Hospital ERP is a comprehensive hospital management system designed for Indian hospitals. It covers the entire patient lifecycle from insurance verification and registration through billing and discharge.

### Key Features
- **Insurance-First Registration**: Patients verify insurance BEFORE registration
- **Multi-Scheme Support**: Private Insurance, PMJAY (Ayushman Bharat), BSKY, CGHS, ECHS
- **Complete Clinical Workflow**: OPD queues, IPD admissions, OT scheduling, EMR
- **Diagnostic Integration**: Pathology & Radiology with digital reports
- **Pharmacy POS**: Medicine billing with inventory management
- **GST-Compliant Finance**: Billing, purchases, tax reports (GSTR-1, GSTR-3B)
- **Role-Based Access**: SUPER_ADMIN, ADMIN, DOCTOR, NURSE, RECEPTIONIST, ACCOUNTANT, PHARMACIST, LAB_TECHNICIAN

### System Architecture

```
Browser (React 19)
    |
Next.js 16 App Router (Server Components + Server Actions)
    |
Prisma ORM
    |
PostgreSQL Database
    |
AWS S3 (File Storage) + AWS SNS (Notifications)
```

---

## 2. Dashboard

**Route**: `/dashboard`

The main dashboard provides an at-a-glance overview of hospital operations.

![Dashboard Overview](screenshots/dashboard.png)
<!-- Screenshot: Navigate to /dashboard and capture the full page -->

### What You See
| Widget | Description |
|--------|-------------|
| **Revenue Summary** | Today's, this week's, and this month's revenue with trend charts |
| **Doctor Availability** | Real-time status of available doctors by specialization |
| **Patient Statistics** | Active OPD queue count, IPD occupancy, today's admissions/discharges |
| **Recent Visits** | Latest patient consultations and their status |
| **Specialization Distribution** | Pie/bar chart of patient visits by department |

### How to Use
1. Login with your credentials at `/login`
2. You are automatically redirected to the dashboard
3. Click any stat card to drill down into the relevant module

---

## 3. Clinical Module

### 3.1 OPD / Queue Management

**Route**: `/dashboard/clinical/opd`

![OPD Queue](screenshots/opd-queue.png)
<!-- Screenshot: Navigate to /dashboard/clinical/opd -->

**Purpose**: Manage outpatient department patient flow.

| Function | How To |
|----------|--------|
| **View Queue** | See all patients waiting, in-consultation, and completed |
| **Call Patient** | Click a patient from the queue to start consultation |
| **Add Vitals** | Enter BP, temperature, weight, SpO2 before doctor sees patient |
| **Prescribe** | Write prescriptions during consultation |
| **Refer** | Refer patient to specialist, lab, or radiology |

### 3.2 Operation Theatre (OT)

**Route**: `/dashboard/clinical/ot`

![Operation Theatre](screenshots/ot-schedule.png)
<!-- Screenshot: Navigate to /dashboard/clinical/ot -->

**Purpose**: Schedule and track surgeries.

| Function | How To |
|----------|--------|
| **Schedule Surgery** | Select patient, surgeon, anesthetist, OT room, date/time |
| **View OT Calendar** | See daily/weekly surgery schedule |
| **Surgery Notes** | Record intra-operative notes and findings |
| **Post-Op Orders** | Enter post-operative medication and monitoring orders |

### 3.3 EMR (Electronic Medical Records)

**Route**: `/dashboard/clinical/emr`

![EMR Records](screenshots/emr.png)
<!-- Screenshot: Navigate to /dashboard/clinical/emr -->

**Purpose**: Maintain complete digital patient records.

| Function | How To |
|----------|--------|
| **Patient History** | View all past consultations, diagnoses, prescriptions |
| **Consultation Notes** | Write SOAP notes (Subjective, Objective, Assessment, Plan) |
| **Attachments** | Upload and view patient documents, scans, reports |

---

## 4. IPD & Bed Management

**Route**: `/dashboard/ipd`

![IPD Bed Map](screenshots/ipd-bedmap.png)
<!-- Screenshot: Navigate to /dashboard/ipd -->

### 4.1 Visual Bed Map

A color-coded grid showing all beds across wards:
- **Green**: Available
- **Red**: Occupied
- **Yellow**: Reserved
- **Gray**: Under Maintenance

Click any bed to see patient details or assign a new patient.

### 4.2 Patient Admission

**Route**: `/dashboard/ipd/admission`

![IPD Admission](screenshots/ipd-admission.png)
<!-- Screenshot: Navigate to /dashboard/ipd/admission -->

| Step | Description |
|------|-------------|
| 1. **Select Patient** | Search by name, phone, or patient ID |
| 2. **Assign Bed** | Pick an available bed from the bed map |
| 3. **Assign Doctor** | Select treating physician |
| 4. **Enter Diagnosis** | Provisional diagnosis for admission |
| 5. **Insurance Link** | Link active insurance policy for cashless billing |
| 6. **Confirm** | Generate admission ID and print admission slip |

### 4.3 Discharge Summary

Generate comprehensive discharge summaries including:
- Diagnosis, treatment given, surgery details
- Discharge medications and follow-up instructions
- Final bill summary with insurance settlement details
- PDF export for patient records

---

## 5. Pathology (Lab)

### 5.1 Collection Queue

**Route**: `/dashboard/lab/queue`

![Lab Queue](screenshots/lab-queue.png)
<!-- Screenshot: Navigate to /dashboard/lab/queue -->

| Status | Meaning |
|--------|---------|
| **Pending** | Sample not yet collected |
| **Collected** | Sample received, awaiting processing |
| **Processing** | Test in progress |
| **Completed** | Results ready for review |
| **Verified** | Results verified by pathologist |

### 5.2 Lab Reports

**Route**: `/dashboard/lab/reports`

- View and enter test results
- Auto-flag abnormal values (out of reference range)
- Print or PDF export lab reports
- Digital signature by pathologist

---

## 6. Radiology

### 6.1 Imaging Queue

**Route**: `/dashboard/radiology/queue`

![Radiology Queue](screenshots/radiology-queue.png)
<!-- Screenshot: Navigate to /dashboard/radiology/queue -->

Manage X-Ray, CT Scan, MRI, Ultrasound, and ECG requests.

### 6.2 Radiology Reports

**Route**: `/dashboard/radiology/reports`

- Enter findings and impressions
- Upload DICOM images or scan documents
- Report verification by radiologist

---

## 7. Pharmacy

### 7.1 POS Billing

**Route**: `/dashboard/pharmacy/pos/billing`

![Pharmacy POS](screenshots/pharmacy-pos.png)
<!-- Screenshot: Navigate to /dashboard/pharmacy/pos/billing -->

| Function | Description |
|----------|-------------|
| **Quick Search** | Search medicines by name or generic name |
| **Add to Cart** | Select quantity, apply discounts |
| **Bill Generation** | Generate GST-compliant invoice |
| **Payment** | Accept Cash, Card, UPI, or Insurance |
| **Print Receipt** | Thermal printer compatible receipt |

### 7.2 Prescription Fulfillment

**Route**: `/dashboard/pharmacy/pos`

- View pending prescriptions from OPD/IPD
- Dispense medicines against prescriptions
- Track partial dispensing

### 7.3 Inventory Management

**Route**: `/dashboard/pharmacy/inventory`

![Pharmacy Inventory](screenshots/pharmacy-inventory.png)
<!-- Screenshot: Navigate to /dashboard/pharmacy/inventory -->

| Function | Description |
|----------|-------------|
| **Stock Overview** | Current stock with batch-wise details |
| **Low Stock Alerts** | Auto-alerts when stock falls below reorder level |
| **Expiry Tracking** | Medicines expiring within 30/60/90 days |
| **Purchase Orders** | Create POs to suppliers |
| **Stock Adjustment** | Record damages, returns, and transfers |

---

## 8. Insurance Management (NEW)

This is the comprehensive Indian insurance module supporting Private, PMJAY, and BSKY schemes.

### 8.1 Insurance Verification & Patient Registration

**Route**: `/dashboard/insurance/verify`

![Insurance Verification](screenshots/insurance-verify.png)
<!-- Screenshot: Navigate to /dashboard/insurance/verify -->

This is the **primary entry point** for new patients. Insurance is verified BEFORE registration.

#### Step 1: Select Insurance Scheme

Choose from 4 options:
| Scheme | Description | Coverage |
|--------|-------------|----------|
| **Private Insurance** | TPA-based private health insurance | Varies by policy |
| **Ayushman Bharat (PMJAY)** | Government scheme | Rs.5,00,000 per family/year |
| **BSKY** | Biju Swasthya Kalyan Yojana (Odisha) | Rs.5,00,000 (Rs.10L for women) |
| **Self-Pay** | No insurance | N/A |

#### Step 2: Enter Policy Details

**For Private Insurance:**
- Policy Number, Insurance Company (17 major Indian insurers)
- TPA Name (12 major TPAs: Medi Assist, FHPL, Paramount, etc.)
- Health Card Number, Policy Type (Individual/Family Floater/Group)
- Sum Insured, Balance Available
- Policy validity dates
- Sub-limits: Room Rent Cap, ICU Cap, Co-pay %, Deductible

**For PMJAY:**
- Ayushman Bharat ID (14-digit)
- ABHA Number (Ayushman Bharat Health Account)
- Aadhaar Number, Family ID

**For BSKY:**
- BSKY Card Number
- Aadhaar Number

#### Step 3: Review Coverage

![Coverage Summary](screenshots/coverage-summary.png)
<!-- Screenshot: Complete Step 2 to see coverage summary card -->

The Coverage Summary Card shows:
- **Sum Insured** - Total policy amount
- **Balance Available** - Remaining coverage after previous claims
- **Utilization Bar** - Visual percentage of coverage used
- **Warnings** - Co-pay, room rent cap, deductible alerts
- Insurer name, TPA name, policy number, validity

#### Step 4: Register Patient

Fill patient demographics:
- Name, Phone, Email, Gender, Date of Birth
- Blood Group, Aadhaar Number
- Address, City, State, Pincode

Patient is registered with insurance automatically linked.

---

### 8.2 Active Policies

**Route**: `/dashboard/insurance/policies`

![Active Policies](screenshots/insurance-policies.png)
<!-- Screenshot: Navigate to /dashboard/insurance/policies -->

| Column | Description |
|--------|-------------|
| Patient | Name and Patient ID |
| Policy No. | Insurance policy number |
| Scheme | PRIVATE / PMJAY / BSKY badge |
| Provider / TPA | Insurance company and TPA name |
| Sum Insured | Total coverage amount |
| Balance | Remaining balance (green) |
| Valid Until | Policy expiry date |
| Claims | Number of claims filed |

**Top Cards**: Count and total coverage grouped by scheme type.

---

### 8.3 Pre-Authorization

**Route**: `/dashboard/insurance/pre-auth`

![Pre-Auth List](screenshots/pre-auth-list.png)
<!-- Screenshot: Navigate to /dashboard/insurance/pre-auth -->

Pre-authorization is MANDATORY for cashless claims in Indian insurance.

#### Pre-Auth Workflow

```
DRAFT --> SUBMITTED --> [TPA Reviews] --> APPROVED / QUERY_RAISED / REJECTED
                                              |
                                     ENHANCEMENT_REQUESTED --> ENHANCEMENT_APPROVED
                                              |
                                     DISCHARGE_APPROVED --> Claim Settlement
```

#### Creating a New Pre-Auth

**Route**: `/dashboard/insurance/pre-auth/create`

![Pre-Auth Form](screenshots/pre-auth-create.png)
<!-- Screenshot: Navigate to /dashboard/insurance/pre-auth/create -->

| Section | Fields |
|---------|--------|
| **Patient & Policy** | Select active policy (shows patient name, insurer, balance) |
| **Diagnosis** | Provisional Diagnosis, ICD-10 Code (searchable), Treatment Type |
| **Treatment** | Proposed Treatment, Surgery Name, Admission Type (Emergency/Planned) |
| **Cost Estimation** | Room Rent, ICU Charges, Investigation, OT Charges, Professional Fees, Medicines, Implants, Other |
| **Doctor** | Treating Doctor Name, Registration Number |

#### Pre-Auth Detail View

**Route**: `/dashboard/insurance/pre-auth/[id]`

Shows complete pre-auth details with:
- Patient and policy information
- Diagnosis with ICD-10 codes
- Cost breakdown (8 categories)
- TPA response (approved amount, remarks, queries, rejection reason)
- Enhancement request details

---

### 8.4 Cost Estimator

**Route**: `/dashboard/insurance/estimate`

The cost estimator calculates how much insurance will cover based on:

| Factor | Impact |
|--------|--------|
| **Hospital Tariff** | Actual rates from Tariff Master |
| **Room Rent Cap** | If room rate exceeds cap, proportional deduction applies to ALL expenses |
| **Co-pay** | Percentage of approved amount patient must pay (e.g., 10%, 20%) |
| **Deductible** | Fixed amount patient pays before insurance kicks in |
| **Balance Available** | Coverage capped at remaining policy balance |

**Output**:
- Estimated Total Cost (blue)
- Insurance Covers (green) with percentage
- You Pay / Out-of-Pocket (red)
- Line-item breakdown with per-service coverage
- Deductions summary
- Warning messages for restrictions

---

### 8.5 Cashless Claims

**Route**: `/dashboard/insurance/claims/cashless`

![Cashless Claims](screenshots/cashless-claims.png)
<!-- Screenshot: Navigate to /dashboard/insurance/claims/cashless -->

| Status | Meaning |
|--------|---------|
| **SUBMITTED** | Claim sent to TPA |
| **UNDER_REVIEW** | TPA reviewing documents |
| **IN_PROCESS** | Claim being processed |
| **APPROVED** | Amount approved, pending settlement |
| **SETTLED** | Payment received from TPA |
| **QUERY_RAISED** | TPA needs more information |
| **REJECTED** | Claim denied |

**Dashboard Cards**: Total, Pending, Approved, Settled counts.

**Table Columns**: Claim No., Patient, Insurer/TPA, Claim Amount, Approved Amount, Status, Date.

---

### 8.6 Reimbursement Claims

**Route**: `/dashboard/insurance/claims/reimbursement`

![Reimbursement Claims](screenshots/reimbursement-claims.png)
<!-- Screenshot: Navigate to /dashboard/insurance/claims/reimbursement -->

For patients who paid upfront and want to claim from insurance later.

Additional fields compared to cashless:
- Bank Account Number
- Bank Name & IFSC Code
- PAN Number (mandatory for claims above Rs.1,00,000)

---

### 8.7 PMJAY Claims (Ayushman Bharat)

**Route**: `/dashboard/finance/pmjay-claims`

![PMJAY Claims](screenshots/pmjay-claims.png)
<!-- Screenshot: Navigate to /dashboard/finance/pmjay-claims -->

Dedicated dashboard for Pradhan Mantri Jan Arogya Yojana claims:
- Total Claims count
- Total Claimed amount
- Total Approved amount
- Pending claims count
- Table with Ayushman ID column

---

### 8.8 Tariff Master

**Route**: `/dashboard/insurance/tariff`

![Tariff Master](screenshots/tariff-master.png)
<!-- Screenshot: Navigate to /dashboard/insurance/tariff -->

Hospital rate card used for cost estimation and billing:

| Category | Examples |
|----------|----------|
| **ROOM** | General Ward (Rs.1,500), Semi-Private (Rs.3,000), Private (Rs.5,000), Deluxe (Rs.8,000) |
| **ICU** | ICU (Rs.10,000/day), NICU (Rs.12,000/day) |
| **OT** | Minor Surgery (Rs.5,000), Major (Rs.15,000), Super Specialty (Rs.30,000) |
| **INVESTIGATION** | CBC (Rs.300), X-Ray (Rs.400), CT Scan (Rs.3,000), MRI (Rs.5,000) |
| **SURGERY** | Appendectomy (Rs.45,000), CABG (Rs.3,00,000), Knee Replacement (Rs.2,00,000) |
| **CONSULTATION** | General (Rs.300), Specialist (Rs.500), Super Specialist (Rs.800) |
| **PROFESSIONAL_FEE** | Surgeon Minor (Rs.5,000), Major (Rs.15,000), Anaesthetist (Rs.5,000) |
| **MEDICINE** | Daily Meds (Rs.500), IV Antibiotics (Rs.1,500/day) |

Each item shows **Hospital Rate** and **PMJAY Rate** (government package rate).

---

### 8.9 ICD-10 Code Browser

**Route**: `/dashboard/insurance/icd-codes`

![ICD-10 Codes](screenshots/icd-codes.png)
<!-- Screenshot: Navigate to /dashboard/insurance/icd-codes -->

Browse 50 commonly used ICD-10 diagnosis codes organized by category:
- Infectious, Neoplasm, Blood, Endocrine, Nervous System
- Circulatory, Respiratory, Digestive, Skin, Musculoskeletal
- Genitourinary, Pregnancy, Symptoms, Injury, Eye

Common codes are tagged with a blue "Common" badge for quick access.

---

## 9. Finance & Billing

### 9.1 Finance Overview

**Route**: `/dashboard/finance`

![Finance Overview](screenshots/finance-overview.png)
<!-- Screenshot: Navigate to /dashboard/finance -->

- Revenue and expense summary
- Outstanding receivables
- General ledger entries
- Day-wise collection reports

### 9.2 Billing

**Route**: `/dashboard/finance/billing`

![Billing](screenshots/billing.png)
<!-- Screenshot: Navigate to /dashboard/finance/billing -->

| Feature | Description |
|---------|-------------|
| **IPD Billing** | Generate final bill at discharge with all charges |
| **OPD Billing** | Consultation and procedure billing |
| **Diagnostic Billing** | Lab and radiology test billing |
| **Payment Methods** | Cash, Card, UPI, Bank Transfer, Insurance, BSKY, PMJAY |
| **GST Handling** | Automatic GST calculation on pharmacy and services |
| **Print Invoice** | GST-compliant invoice with hospital letterhead |

### 9.3 Purchases & Suppliers

**Route**: `/dashboard/finance/purchases`

- Create and manage purchase orders
- Track supplier payments
- Record goods received notes (GRN)

### 9.4 Tax & Reports

**Route**: `/dashboard/finance/taxes`

GST compliance reports:
- GSTR-1 (Outward supplies)
- GSTR-3B (Summary return)
- HSN Summary
- Tax liability calculation

### 9.5 Insurance / TPA (Legacy)

**Route**: `/dashboard/finance/insurance-tpa`

Basic insurance claim tracking (legacy module, superseded by the new Insurance module).

### 9.6 BSKY Claims

**Route**: `/dashboard/finance/bsky-claims`

Track Biju Swasthya Kalyan Yojana claims specific to Odisha state.

---

## 10. Reports

**Route**: `/dashboard/reports`

![Reports](screenshots/reports.png)
<!-- Screenshot: Navigate to /dashboard/reports -->

| Report | Description |
|--------|-------------|
| **Day Book** | Daily transaction summary |
| **Revenue Report** | Revenue analysis by department, doctor, service |
| **Collection Report** | Payment collection by method (Cash/Card/UPI/Insurance) |
| **GST Reports** | GSTR-1, GSTR-3B, HSN summary |
| **Patient Statistics** | Admission/discharge/OPD visit trends |
| **Audit Logs** | Track all system activities |

Reports support:
- Date range filtering
- PDF and Excel export
- Departmental breakdown

---

## 11. HR & Staff Management

### 11.1 Staff Directory

**Route**: `/dashboard/hr/staff`

![Staff Directory](screenshots/hr-staff.png)
<!-- Screenshot: Navigate to /dashboard/hr/staff -->

- Complete staff profiles with qualifications
- Department and designation tracking
- Contact information management

### 11.2 Shift Roster

**Route**: `/dashboard/hr/roster`

- Create and manage duty schedules
- Morning, Evening, Night shift assignment
- Calendar view of roster

### 11.3 Payroll

**Route**: `/dashboard/hr/payroll`

- Monthly salary processing
- Allowances and deductions
- Payslip generation (PDF)

---

## 12. Admin & Settings

### 12.1 User Management

**Route**: `/dashboard/admin/users`

![User Management](screenshots/admin-users.png)
<!-- Screenshot: Navigate to /dashboard/admin/users -->

- Create/edit/deactivate user accounts
- Assign roles (see [User Roles](#13-user-roles--permissions))
- Password reset

### 12.2 Master Data Configuration

| Setting | Route |
|---------|-------|
| **Pathology Tests** | `/dashboard/admin/settings/lab-tests` |
| **Radiology Tests** | `/dashboard/admin/settings/radiology` |
| **Beds & Wards** | `/dashboard/admin/beds` |
| **OT Theaters** | `/dashboard/admin/theaters` |
| **Investments** | `/dashboard/admin/investments` |

### 12.3 Hospital Settings

**Route**: `/dashboard/settings/hospital`

| Field | Description |
|-------|-------------|
| Hospital Name | Shree Kamal Hospital |
| Address, Phone, Email | Contact details |
| GST Number | For tax compliance |
| Logo | Square logo for headers |
| Letterhead Header/Footer | Full-width banners for print |
| **ROHINI ID** | Registry of Hospitals in Network of Insurers |
| **NABH Accreditation** | National accreditation number |
| **PMJAY Hospital ID** | Ayushman Bharat empanelment ID |
| **PMJAY Hospital Type** | Category of PMJAY empanelment |

---

## 13. User Roles & Permissions

| Role | Access |
|------|--------|
| **SUPER_ADMIN** | Full access to all modules including Admin settings |
| **ADMIN** | All operational modules, limited admin settings |
| **DOCTOR** | Clinical (OPD, OT, EMR), IPD, Lab/Radiology reports |
| **NURSE** | IPD, Vitals entry, OT assistance, Medication administration |
| **RECEPTIONIST** | Insurance verification, Patient registration, Appointments, Billing |
| **ACCOUNTANT** | Finance, Billing, Insurance claims, Reports, Purchases |
| **PHARMACIST** | Pharmacy POS, Inventory, Prescriptions |
| **LAB_TECHNICIAN** | Pathology queue, Lab reports, Sample collection |

---

## Appendix: Indian Insurance Standards

### IRDAI Compliance

The insurance module follows IRDAI (Insurance Regulatory and Development Authority of India) guidelines:

- **Pre-authorization** is mandatory for cashless claims
- **ICD-10 coding** for all diagnoses
- **Sub-limit handling**: Room rent caps with proportional deduction (as per IRDAI norms)
- **Co-pay and Deductible** tracking
- **Claim status workflow** matches TPA processing stages

### Supported Insurance Companies (17)

Star Health, ICICI Lombard, HDFC ERGO, Bajaj Allianz, Niva Bupa, Care Health, New India Assurance, United India Insurance, National Insurance, Oriental Insurance, SBI General, Tata AIG, Reliance General, Aditya Birla Health, Manipal Cigna, Cholamandalam MS

### Supported TPAs (12)

Medi Assist, FHPL (Family Health Plan), Paramount Health, Vidal Health (TTK), Raksha TPA, MD India, Good Health TPA, Star Health TPA, Medsave Health TPA, Heritage Health TPA, United Health TPA

### Government Schemes

| Scheme | Coverage | Scope |
|--------|----------|-------|
| **PMJAY (Ayushman Bharat)** | Rs.5,00,000 per family/year | Pan-India, BPL families |
| **BSKY** | Rs.5,00,000 (Rs.10L for women) | Odisha state |

### Room Rent Proportional Deduction Rule

If the patient opts for a room category exceeding the policy's room rent cap:

```
Proportional Factor = Policy Room Rent Cap / Actual Room Rent
All expenses are reduced by this factor before calculating coverage.

Example:
- Policy cap: Rs.3,000/day, Actual room: Rs.5,000/day
- Factor: 3000/5000 = 0.60
- All expenses reduced to 60% for insurance coverage
- Patient bears the remaining 40% + co-pay + deductible
```

---

## How to Add Screenshots

To complete this documentation with screenshots:

1. Open the app at your deployed URL
2. Navigate to each page listed in the `<!-- Screenshot -->` comments
3. Take a screenshot (Windows: `Win + Shift + S`)
4. Save to `docs/screenshots/` with the filename indicated
5. The markdown will automatically display the images

### Screenshot File List

```
docs/screenshots/
  dashboard.png
  opd-queue.png
  ot-schedule.png
  emr.png
  ipd-bedmap.png
  ipd-admission.png
  lab-queue.png
  radiology-queue.png
  pharmacy-pos.png
  pharmacy-inventory.png
  insurance-verify.png
  coverage-summary.png
  insurance-policies.png
  pre-auth-list.png
  pre-auth-create.png
  cashless-claims.png
  reimbursement-claims.png
  pmjay-claims.png
  tariff-master.png
  icd-codes.png
  finance-overview.png
  billing.png
  reports.png
  hr-staff.png
  admin-users.png
```

---

*Document generated for Shree Kamal Hospital ERP. For technical support, contact the development team.*
