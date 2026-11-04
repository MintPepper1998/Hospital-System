# 🏥 Hospital ERP Database Seeding Guide

## Overview

This guide explains how to populate your Hospital ERP database with realistic demo data simulating a busy Indian hospital operating at full capacity.

## What Gets Created

The seed script (`prisma/seed.ts`) populates your database with:

### 👥 **Staff & Users**
- **1 Admin** - Full system access
- **10 Doctors** across specializations:
  - 3 General Physicians (₹300)
  - 2 Cardiologists (₹600)
  - 2 Orthopedic Surgeons (₹500)
  - 1 Gynecologist (₹500)
  - 1 Pediatrician (₹400)
  - 1 ENT Specialist (₹450)
- **2 Receptionists** - Front desk staff
- **2 Pharmacists** - Pharmacy management

### 🏨 **IPD Infrastructure**
- **4 Wards**:
  - General Ward (Male) - 15 beds @ ₹800/day
  - General Ward (Female) - 15 beds @ ₹800/day
  - Private AC Ward - 10 beds @ ₹2,000/day
  - ICU (Intensive Care) - 8 beds @ ₹5,000/day
- **Total: 48 Beds** across all wards

### 💊 **Pharmacy**
- **3 Suppliers**:
  - Apollo Pharma Distributors
  - Sun Pharma Agencies
  - Cipla Medical Supplies
- **15 Medicines** (Common Indian brands):
  - Dolo 650, Augmentin 625, Pan-D
  - Citralka, Azithromycin, Crocin
  - Combiflam, Cetrizine, Montek LC
  - And more...
- **Stock Batches**: 2-3 batches per medicine (100-500 units each)

### 🔬 **Laboratory**
- **13 Lab Tests**:
  - CBC (₹300), Widal (₹200), Lipid Profile (₹800)
  - LFT, KFT, Blood Sugar (Fasting & PP)
  - HbA1c, Dengue NS1, Urine Routine
  - X-Ray Chest, ECG, Thyroid Profile

### 👨‍👩‍👧‍👦 **Patients & OPD**
- **50 Patients** with realistic Indian names
- **30 Past Appointments** (Last 7 days, COMPLETED status)
- **Today's OPD Queue**:
  - 10 PENDING (Waiting in lobby)
  - 5 IN_PROGRESS (Consulting doctor)
  - 5 COMPLETED (Just finished)

### 🛏️ **IPD Admissions**
- **5 Active Admissions**:
  - Patients admitted to ICU and Private AC wards
  - Beds marked as OCCUPIED
  - Initial deposits: ₹10,000 - ₹30,000

---

## 🚀 How to Run the Seed Script

### Prerequisites

1. Ensure your database is set up and Prisma schema is pushed:
   ```bash
   npx prisma db push
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

### Run the Seed Script

**Option 1: Using npm script (Recommended)**
```bash
npm run db:seed
```

**Option 2: Using Prisma CLI**
```bash
npx prisma db seed
```

**Option 3: Direct execution**
```bash
npx tsx prisma/seed.ts
```

### Expected Output

You should see progress logs like:
```
🏥 Starting Hospital ERP Database Seeding...

👤 Creating Admin User...
✅ Admin created: admin@hospital.com

👨‍⚕️ Creating Doctors...
   ✓ Dr. Rajesh Kumar - General Physician (₹300)
   ✓ Dr. Priya Sharma - Cardiologist (₹600)
   ...
✅ Created 10 doctors

👥 Creating Support Staff...
   ✓ Receptionist: Amit Singh
   ...
✅ Support staff created

🏨 Creating Wards & Beds...
   ✓ General Ward (Male): 15 beds @ ₹800/day
   ...
✅ Created 4 wards with 48 beds

💊 Creating Pharmacy Inventory...
   ✓ Supplier: Apollo Pharma Distributors
   ✓ Medicine: Dolo 650 (TABLET) - ₹2.5
   ...
✅ Created 15 medicines with stock batches

🔬 Creating Lab Test Catalog...
   ✓ Complete Blood Count (CBC) (CBC001) - ₹300
   ...
✅ Created 13 lab tests

👨‍👩‍👧‍👦 Creating Patients...
✅ Created 50 patients

📋 Creating Past Appointments (Last 7 Days)...
✅ Created 30 completed appointments

🚦 Creating Today's OPD Queue...
   ✓ 10 patients PENDING (in waiting area)
   ✓ 5 patients IN_PROGRESS (consulting doctor)
   ✓ 5 patients COMPLETED (finished today)
✅ Today's OPD queue created

🏥 Creating IPD Admissions...
   ✓ PAT0023 admitted to ICU-01 (ICU (Intensive Care))
   ...
✅ Created 5 IPD admissions

✨ DATABASE SEEDING COMPLETED SUCCESSFULLY! ✨
```

---

## 🔐 Login Credentials

After seeding, you can log in with these credentials:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@hospital.com` | `admin123` |
| **Doctor** | `doctor1@hospital.com` | `doctor123` |
| **Receptionist** | `reception1@hospital.com` | `reception123` |
| **Pharmacist** | `pharmacy1@hospital.com` | `pharmacy123` |

> **Note**: All doctor accounts follow the pattern `doctor1@hospital.com`, `doctor2@hospital.com`, etc.

---

## ✅ Testing Scenarios After Seeding

### 1. **OPD Workflow**
- Login as **Receptionist**
- View today's appointments (should see 20 entries)
- Book a new appointment (50 patients available)
- Call a PENDING patient to IN_PROGRESS

### 2. **Doctor Consultation**
- Login as **Doctor** (`doctor1@hospital.com`)
- View your appointments
- Complete consultation with diagnosis and prescription
- Order lab tests

### 3. **Laboratory**
- Navigate to Lab Dashboard
- View pending lab requests
- Mark samples as collected and update results

### 4. **Pharmacy POS**
- Login as **Pharmacist**
- Go to Pharmacy → POS Billing
- Select a patient and add medicines (stock available)
- Complete sale and print invoice

### 5. **IPD Management**
- View IPD Dashboard
- See 5 occupied beds (out of 48 total)
- View admission details
- Process discharge for a patient

### 6. **Patient 360 View**
- Navigate to any patient's history
- View past appointments, prescriptions, lab results
- Check timeline of visits

### 7. **Admin Functions**
- Login as **Admin**
- Manage lab test catalog (13 tests available)
- View and edit user accounts (16 staff members)
- Manage wards and bed pricing

---

## 🔄 Re-running the Seed Script

The script uses **`upsert`** operations for most data, making it **idempotent**. However:

⚠️ **Important Notes:**
- Appointments and admissions will be **duplicated** if run multiple times
- To start fresh, reset your database:
  ```bash
  npx prisma db push --force-reset
  npm run db:seed
  ```

---

## 🐛 Troubleshooting

### Error: "Password hashing failed"
**Solution**: Ensure `bcryptjs` is installed:
```bash
npm install bcryptjs @types/bcryptjs
```

### Error: "Cannot find module @prisma/client"
**Solution**: Generate Prisma Client:
```bash
npx prisma generate
```

### Error: "Foreign key constraint failed"
**Solution**: Reset and re-push schema:
```bash
npx prisma db push --force-reset
npm run db:seed
```

### Seed script runs but no data appears
**Solution**: Check your database connection in `.env`:
```env
DATABASE_URL="your-connection-string"
```

---

## 📊 Data Summary

After successful seeding:

| Category | Count | Details |
|----------|-------|---------|
| **Users** | 15 | 1 Admin, 10 Doctors, 2 Receptionists, 2 Pharmacists |
| **Patients** | 50 | Realistic Indian names and details |
| **Appointments** | 50 | 30 past + 20 today (10 pending, 5 in-progress, 5 completed) |
| **IPD Beds** | 48 | Across 4 wards (5 occupied, 43 available) |
| **Medicines** | 15 | With 30-45 stock batches total |
| **Lab Tests** | 13 | Common tests from ₹150 to ₹800 |
| **Suppliers** | 3 | Indian pharmaceutical distributors |

---

## 🎯 Next Steps

1. **Run the seed script** to populate your database
2. **Login** with the provided credentials
3. **Test each module** using the scenarios above
4. **Customize** the seed data by editing `prisma/seed.ts`
5. **Deploy** your hospital ERP with confidence!

---

## 📝 Customization

To customize the seed data, edit `prisma/seed.ts`:

- **Add more doctors**: Increase `count` in `DOCTOR_SPECIALIZATIONS`
- **Change consultation fees**: Modify `fee` values
- **Add more patients**: Change the loop count in patient creation
- **Add more medicines**: Extend the `MEDICINES` array
- **Adjust bed counts**: Modify `bedCount` in `WARDS` array

---

## 💡 Tips

- The seed script simulates a **realistic Indian hospital** with:
  - Indian names and addresses
  - Common local medicines (Dolo 650, Pan-D, etc.)
  - Typical consultation fees (₹300 - ₹800)
  - LAMA discharge type (common in India)
  - Advance deposits for IPD admissions

- All phone numbers are randomly generated (not real)
- All email addresses are dummy (`patient1@email.com`, etc.)
- Batch expiry dates are set 12-36 months in the future

---

## 🆘 Need Help?

If you encounter issues:
1. Check the console output for specific error messages
2. Verify your `.env` database connection
3. Ensure Prisma schema is up to date (`npx prisma db push`)
4. Reset and retry if needed

---

**Happy Testing! 🎉**
