# Hospital ERP - Project Documentation

## 📁 Complete Directory Structure

```
hospital-erp/
│
├── app/                                    # Next.js 14 App Router
│   ├── (auth)/                            # Auth Route Group (No Layout)
│   │   ├── login/
│   │   │   └── page.tsx                   # Login page
│   │   └── reset-password/
│   │       └── page.tsx                   # Password reset page
│   │
│   ├── (dashboard)/                       # Dashboard Route Group (Shared Layout)
│   │   ├── layout.tsx                     # Dashboard layout with sidebar
│   │   ├── page.tsx                       # Main dashboard
│   │   │
│   │   ├── clinical/                      # Clinical Management
│   │   │   ├── opd/
│   │   │   │   └── page.tsx              # Outpatient Department
│   │   │   ├── ipd/
│   │   │   │   └── page.tsx              # Inpatient Department (Ward Management)
│   │   │   ├── ot/
│   │   │   │   └── page.tsx              # Operation Theatre Management
│   │   │   └── emr/
│   │   │       └── page.tsx              # Electronic Medical Records
│   │   │
│   │   ├── finance/                       # Finance & Accounting
│   │   │   ├── billing/
│   │   │   │   └── page.tsx              # Billing & Invoicing
│   │   │   ├── insurance-tpa/
│   │   │   │   └── page.tsx              # Insurance/TPA Management
│   │   │   └── gst/
│   │   │       └── page.tsx              # GST Configuration
│   │   │
│   │   ├── pharmacy/                      # Pharmacy Management
│   │   │   ├── inventory/
│   │   │   │   └── page.tsx              # Medicine Inventory
│   │   │   └── pos/
│   │   │       └── page.tsx              # Point of Sale
│   │   │
│   │   ├── admin/                         # Administration
│   │   │   ├── users/
│   │   │   │   └── page.tsx              # User Management
│   │   │   ├── audit-logs/
│   │   │   │   └── page.tsx              # Audit Logs
│   │   │   └── geofencing-config/
│   │   │       └── page.tsx              # Geofencing Configuration
│   │   │
│   │   └── patient-portal/
│   │       └── page.tsx                   # Patient Self-Service Portal
│   │
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts               # NextAuth API handlers
│   │
│   ├── layout.tsx                         # Root layout
│   ├── page.tsx                           # Root page (redirects to dashboard)
│   └── globals.css                        # Global styles
│
├── components/
│   ├── ui/                                # Shadcn/ui components
│   │   ├── avatar.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── scroll-area.tsx
│   │   ├── separator.tsx
│   │   ├── sidebar.tsx
│   │   ├── skeleton.tsx
│   │   ├── sheet.tsx
│   │   └── tooltip.tsx
│   │
│   └── app-sidebar.tsx                    # Main application sidebar
│
├── lib/
│   ├── prisma.ts                          # Prisma client singleton
│   └── utils.ts                           # Utility functions (cn, etc.)
│
├── prisma/
│   └── schema.prisma                      # Database schema
│
├── types/
│   └── next-auth.d.ts                     # NextAuth type declarations
│
├── auth.ts                                # NextAuth v5 configuration
├── components.json                        # Shadcn/ui configuration
├── package.json                           # Dependencies
├── tsconfig.json                          # TypeScript configuration
├── next.config.ts                         # Next.js configuration
├── tailwind.config.ts                     # Tailwind CSS configuration
└── README.md                              # Project documentation
```

## 🗄️ Database Models

### Authentication & Users
- **User**: Core user model with role-based access
- **Account**: OAuth accounts
- **Session**: User sessions
- **VerificationToken**: Email verification
- **Staff**: Staff/employee details linked to User
- **Patient**: Patient profile linked to User

### Clinical Management
- **Appointment**: OPD appointments with status tracking
- **MedicalRecord**: EMR/EHR records
- **Prescription**: Prescriptions with items
- **PrescriptionItem**: Individual medicines
- **OTSchedule**: Operation theatre scheduling

### Laboratory
- **LabOrder**: Lab test orders
- **LabTest**: Individual test results

### Pharmacy
- **PharmacyItem**: Medicine inventory with expiry tracking

### Finance
- **Billing**: Bill/invoice management with GST
- **BillingItem**: Line items on bills
- **Payment**: Payment tracking
- **InsurancePolicy**: Patient insurance policies
- **InsuranceClaim**: TPA/Insurance claims

### Specialty Modules
- **MedicalCamp**: Medical camps and diabetes care events

### Security & Administration
- **StaffAttendance**: Attendance with geofencing
- **AuditLog**: Comprehensive audit trail
- **GeofenceConfig**: Geofencing parameters

## 🎯 User Roles & Permissions

| Role | Access Level |
|------|-------------|
| SUPER_ADMIN | Full system access, configuration |
| DOCTOR | Clinical modules, patient records, prescriptions |
| NURSE | Ward management, patient care, EMR viewing |
| ACCOUNTANT | Finance, billing, insurance claims |
| PHARMACIST | Pharmacy inventory, POS |
| LAB_TECHNICIAN | Laboratory orders and results |
| RECEPTIONIST | OPD, appointments, patient registration |
| PATIENT | Patient portal, view own records |

## 🔐 Key Features

### Geofencing for Attendance
- Staff attendance tracked with GPS coordinates
- Configurable geofence radius
- Device IP and info logging
- Validation against configured locations

### Audit Logging
- All critical operations logged
- User action tracking
- Before/after data changes
- IP address and user agent capture

### Data Security
- Password hashing with bcrypt
- JWT-based sessions
- Role-based access control
- Encrypted sensitive data (to be implemented)

### GST-Compliant Billing
- GST rate configuration
- Tax calculation on bills
- Multiple payment methods
- Partial payment support

## 🧩 Next Development Phases

### Phase 2: Core Module Implementation
1. **Authentication**
   - Complete login/logout flows
   - Password reset functionality
   - Email verification
   - Role-based route protection

2. **Patient Management**
   - Registration form
   - Patient profile view/edit
   - Document upload
   - Medical history timeline

3. **Appointments**
   - Appointment booking
   - Calendar view
   - Doctor availability
   - Status management

4. **Billing**
   - Invoice generation
   - Payment processing
   - Receipt printing
   - Payment history

### Phase 3: Advanced Features
- Real-time notifications
- WhatsApp/SMS integration
- Report generation (PDF)
- Data analytics dashboard
- Multi-language support
- Dark mode (already supported in UI)

### Phase 4: Integrations
- Payment gateway (Razorpay/Stripe)
- TPA API integrations
- DICOM for medical imaging
- Lab equipment integration
- WhatsApp Business API

## 📊 API Structure (Planned)

```
/api/
├── auth/[...nextauth]/          # NextAuth handlers
├── patients/
│   ├── route.ts                 # GET, POST patients
│   └── [id]/route.ts            # GET, PUT, DELETE patient
├── appointments/
│   └── ...
├── billing/
│   └── ...
├── pharmacy/
│   └── ...
└── admin/
    └── ...
```

## 🛠️ Development Commands

```bash
# Development
npm run dev                      # Start dev server

# Database
npm run db:generate             # Generate Prisma client
npm run db:push                 # Push schema to database
npm run db:studio               # Open Prisma Studio
npm run db:seed                 # Seed database (to be created)

# Production
npm run build                   # Build for production
npm run start                   # Start production server

# Code Quality
npm run lint                    # Run ESLint
```

## 📝 Coding Standards

### TypeScript
- Strict mode enabled
- Explicit return types for functions
- Proper type definitions (no `any`)
- Use interfaces for object shapes

### Component Structure
- Use "use client" directive only when needed
- Server components by default
- Proper error boundaries
- Loading states for async operations

### Styling
- Tailwind CSS utility classes
- Shadcn/ui components only
- Responsive design (mobile-first)
- Consistent spacing (p-6, gap-4, etc.)

### File Naming
- Components: PascalCase (e.g., `PatientForm.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- Route files: lowercase (e.g., `page.tsx`, `layout.tsx`)

## 🔄 Git Workflow

1. Feature branches: `feature/module-name`
2. Bug fixes: `fix/issue-description`
3. Commit messages: Descriptive and clear
4. Pull request reviews required
5. Main branch protected

## 📞 Support & Documentation

- Technical Documentation: `docs/` folder (to be created)
- API Documentation: Swagger/OpenAPI (to be added)
- User Manual: To be created post-implementation
- Developer Guide: This document

---

**Last Updated**: January 12, 2026
