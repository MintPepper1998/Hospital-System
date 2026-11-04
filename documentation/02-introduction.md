---
title: Shree Kamal Hospital ERP - Documentation
description: Complete user guide for the Hospital Enterprise Resource Planning system
---

# Shree Kamal Hospital ERP

Welcome to the official documentation for **Shree Kamal Hospital ERP** — a complete hospital management system built for Indian healthcare facilities.

---

## What is Shree Kamal Hospital ERP?

Shree Kamal Hospital ERP is a modern, web-based enterprise management platform designed to handle every aspect of hospital operations — from **insurance verification** and **patient registration** to **billing**, **diagnostics**, and **GST-compliant financial reporting**.

> **Built for Indian Hospitals** — Supports PMJAY (Ayushman Bharat), BSKY, private insurance TPAs, GST compliance, IRDAI standards, and ICD-10 coding out of the box.

---

## Key Highlights

| Feature | Description |
|---------|-------------|
| **Insurance-First Registration** | Verify insurance before patient registration — supports Private, PMJAY, BSKY |
| **Pre-Authorization Workflow** | Full TPA pre-auth lifecycle with ICD-10 coding and cost estimation |
| **Clinical Workflow** | OPD queues, Operation Theatre scheduling, Electronic Medical Records |
| **IPD Management** | Visual bed map, admission/discharge, nursing notes |
| **Diagnostics** | Pathology & Radiology with digital report generation |
| **Pharmacy POS** | Point-of-sale billing with batch-wise inventory tracking |
| **GST-Compliant Finance** | GSTR-1, GSTR-3B, HSN summaries, day book reports |
| **Role-Based Access** | 8 user roles with granular permissions |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| UI Components | shadcn/ui, Lucide Icons, Recharts |
| Backend | Next.js Server Actions, Server Components |
| Database | PostgreSQL with Prisma ORM |
| Authentication | NextAuth.js (Credentials Provider) |
| Cloud | AWS Amplify, S3, SNS |
| PDF & Print | jsPDF, html2canvas |

---

## Documentation Categories

### Getting Started
Everything you need to log in and navigate the system.

- [System Requirements](getting-started/system-requirements.md)
- [Login & First Steps](getting-started/login.md)
- [Dashboard Overview](getting-started/dashboard-overview.md)

### Insurance Management
The complete Indian insurance workflow — verification, pre-auth, claims, PMJAY.

- [Insurance Overview](insurance/overview.md)
- [Verify & Register Patient](insurance/verify-register.md)
- [Active Policies](insurance/active-policies.md)
- [Pre-Authorization](insurance/pre-authorization.md)
- [Cost Estimator](insurance/cost-estimator.md)
- [Cashless Claims](insurance/cashless-claims.md)
- [Reimbursement Claims](insurance/reimbursement-claims.md)
- [PMJAY Claims](insurance/pmjay-claims.md)
- [Tariff Master](insurance/tariff-master.md)
- [ICD-10 Codes](insurance/icd-codes.md)

### Clinical Module
OPD, Operation Theatre, and Electronic Medical Records.

- [OPD Queue Management](clinical/opd-queue.md)
- [Operation Theatre](clinical/operation-theatre.md)
- [Electronic Medical Records](clinical/emr.md)

### IPD (In-Patient)
Bed management, admissions, and discharge workflow.

- [Bed Management](ipd/bed-management.md)
- [Admission & Discharge](ipd/admission-discharge.md)

### Diagnostics
Pathology and Radiology departments.

- [Pathology / Lab](diagnostics/pathology.md)
- [Radiology](diagnostics/radiology.md)

### Pharmacy
Point-of-sale billing and inventory control.

- [POS Billing](pharmacy/pos-billing.md)
- [Inventory Management](pharmacy/inventory.md)

### Finance & Billing
Billing, purchases, GST compliance, and financial reports.

- [Billing](finance/billing.md)
- [Purchases & Suppliers](finance/purchases.md)
- [GST & Tax Reports](finance/gst-reports.md)

### HR & Staff
Staff directory, roster, and payroll.

- [Staff Management](hr/staff-management.md)
- [Payroll](hr/payroll.md)

### Administration
User management, roles, and hospital configuration.

- [User Management](admin/user-management.md)
- [Hospital Settings](admin/hospital-settings.md)

---

> **Need help?** Contact the development team for technical support or feature requests.
