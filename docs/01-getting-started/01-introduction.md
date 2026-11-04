# Introduction

Welcome to the **Hospital ERP Documentation**. This comprehensive documentation will help you understand, configure, and utilize the Hospital ERP system effectively.

## What is Hospital ERP?

Hospital ERP is a modern, full-stack, comprehensive web application designed to manage the end-to-end operations of a medium-to-large-sized hospital. From patient registration to complex surgical billing and Indian GST taxation, the system integrates every department into a single, cohesive interface.

The system is designed to completely replace legacy paper-based systems and fragmented software silos by providing:
- Real-time patient tracking (OPD and IPD).
- Granular financial tracking (Income vs Expenses).
- Streamlined inventory management.

![Dashboard Overview](../../assets/dashboard.png)

## Core Architecture

The ERP is built on a modern, robust, and highly scalable technology stack:

* **Frontend:** Next.js (App Router), React, Tailwind CSS, Lucide Icons.
* **Backend:** Next.js API Routes (Serverless ready).
* **Database:** PostgreSQL.
* **ORM:** Prisma ORM for type-safe database queries.
* **Authentication:** NextAuth.js (Custom Credentials and Role-based access control).

## Key Features

1. **Unified Patient Records**: A single source of truth for patient demographics, clinical notes, and billing history.
2. **Indian Taxation Support**: Built-in logic for handling 0%, 5%, and 18% GST slabs for pharmaceuticals and services, ensuring compliance with Indian tax laws.
3. **Advanced Pharmacy Management**: Batch-level inventory tracking, expiry alerts, and integrated point-of-sale.
4. **Comprehensive Financials**: Automated Profit & Loss generation, expense tracking, and salary disbursements.

## Who is this documentation for?

This documentation serves multiple audiences:
- **System Administrators**: For installation, configuration, and user management.
- **Doctors & Medical Staff**: For clinical workflows, appointments, and prescriptions.
- **Accountants & Pharmacists**: For billing, inventory management, and tax reporting.
