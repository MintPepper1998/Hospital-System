# Hospital ERP - Enterprise Management System

A comprehensive, scalable multi-specialty Hospital Management System (HMS) built with modern web technologies.

## 🏥 Overview

This is an enterprise-grade Hospital ERP system designed to manage all aspects of hospital operations including clinical management, financial operations, pharmacy, laboratory, and administrative functions.

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: Shadcn/ui (Strict usage)
- **Backend**: Next.js Server Actions, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js v5 with Role-Based Access Control (RBAC)

## 📋 Project Structure

```
hospital-erp/
├── app/
│   ├── (auth)/                    # Authentication routes
│   │   ├── login/
│   │   └── reset-password/
│   ├── (dashboard)/               # Protected dashboard routes
│   │   ├── clinical/
│   │   │   ├── opd/              # Outpatient Department
│   │   │   ├── ipd/              # Inpatient Department
│   │   │   ├── ot/               # Operation Theatre
│   │   │   └── emr/              # Electronic Medical Records
│   │   ├── finance/
│   │   │   ├── billing/
│   │   │   ├── insurance-tpa/
│   │   │   └── gst/
│   │   ├── pharmacy/
│   │   │   ├── inventory/
│   │   │   └── pos/
│   │   ├── admin/
│   │   │   ├── users/
│   │   │   ├── audit-logs/
│   │   │   └── geofencing-config/
│   │   └── patient-portal/
│   ├── api/
│   │   └── auth/                 # NextAuth API routes
│   └── layout.tsx
├── components/
│   ├── ui/                        # Shadcn/ui components
│   └── app-sidebar.tsx            # Main sidebar navigation
├── lib/
│   ├── prisma.ts                  # Prisma client
│   └── utils.ts
├── prisma/
│   └── schema.prisma              # Database schema
├── auth.ts                        # NextAuth configuration
└── types/
    └── next-auth.d.ts             # NextAuth TypeScript declarations
```

## 🎯 Core Modules

### Clinical Management
- **EMR/EHR**: Comprehensive electronic medical records
- **Ward & Nursing Station Management**: IPD patient tracking
- **Operation Theatre (OT) Management**: Scheduling and status tracking
- **Laboratory (LIS)**: Lab orders and test results
- **Specialty Modules**: Medical Camp & Diabetes Care, Daycare Treatment Planning

### Finance & Accounting
- **Billing**: Invoice generation with GST configuration
- **Revenue Cycle Management**: TPA/Insurance integration
- **Accounts Management**: Payable/Receivable & General Ledger

### Security & Operations
- **Geofencing**: Staff attendance tracking with location validation
- **Data Encryption**: Patient privacy and PHI protection
- **Audit Logs**: Comprehensive activity tracking for compliance
- **Supplier & Purchase Management**: Back-office operations

### Patient Engagement
- **Visitor Management**: Track hospital visitors
- **Patient Portal**: Self-service portal for patients
- **Communication**: WhatsApp/SMS integration (planned)

## 🔐 Role-Based Access Control

The system supports the following user roles:

- `SUPER_ADMIN`: Full system access
- `DOCTOR`: Clinical operations and patient records
- `NURSE`: Patient care and ward management
- `ACCOUNTANT`: Financial operations and billing
- `PHARMACIST`: Pharmacy and inventory management
- `PATIENT`: Patient portal access
- `RECEPTIONIST`: Front desk operations
- `LAB_TECHNICIAN`: Laboratory operations

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Git

### Installation

1. **Clone the repository**
   ```bash
   cd hospital-erp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/hospital_erp?schema=public"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"
   ```

4. **Initialize the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open the application**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

The Prisma schema includes the following core models:

- **Authentication**: User, Account, Session, VerificationToken
- **Staff Management**: Staff, StaffAttendance (with geofencing)
- **Patient Management**: Patient, Appointment, MedicalRecord
- **Clinical**: Prescription, OTSchedule, LabOrder, LabTest
- **Pharmacy**: PharmacyItem (inventory management)
- **Finance**: Billing, BillingItem, Payment, InsurancePolicy, InsuranceClaim
- **Specialty**: MedicalCamp (for medical camps and diabetes care)
- **Security**: AuditLog, GeofenceConfig

## 🎨 UI Components

All UI components are built using **Shadcn/ui**, ensuring:
- Consistent design system
- Accessibility compliance
- Dark mode support
- Responsive layouts

## 🔄 Development Workflow

1. **Make changes** to the code
2. **Update Prisma schema** if needed
   ```bash
   npx prisma generate
   npx prisma db push
   ```
3. **Test locally**
4. **Commit changes** with descriptive messages

## 📝 Next Steps

### Phase 2 - Implementation
- Implement authentication flows with NextAuth
- Build individual module UIs
- Create API routes and server actions
- Add form validation with Zod
- Implement role-based route protection

### Phase 3 - Advanced Features
- Real-time updates for critical workflows
- WhatsApp/SMS integration
- Payment gateway integration
- Report generation
- Data encryption for sensitive information

## 🤝 Contributing

This is an enterprise project. Follow the established patterns and conventions:
- Use TypeScript strictly
- Follow the domain-driven folder structure
- Use Shadcn/ui components exclusively
- Implement proper error handling
- Add audit logging for sensitive operations

## 📄 License

Proprietary - All rights reserved

## 🆘 Support

For technical support or questions, contact the development team.

---

**Built with ❤️ using Next.js 14 and modern web technologies**
