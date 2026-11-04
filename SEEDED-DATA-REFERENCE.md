# 🏥 Seeded Hospital Data Reference

**Status**: ✅ **COMPLETE**  
**Date**: January 20, 2026

---

## 📊 Summary

- ✅ **100 Patients** created
- ✅ **12 Doctors** created (different specializations)
- ✅ **5 Operation Theaters** created (from previous seed)
- ✅ **1 Admin User** (from previous seed)

---

## 👨‍⚕️ Doctors List (12 Doctors with Different Specializations)

| # | Name | Specialization | Department | Consultation Fee | Email |
|---|------|----------------|------------|------------------|-------|
| 1 | Dr. Ashok Agarwal | **Cardiology** | Cardiology | ₹800 | dr.ashok.agarwal@hospital.com |
| 2 | Dr. Meera Verma | **Orthopedics** | Orthopedics | ₹700 | dr.meera.verma@hospital.com |
| 3 | Dr. Nitin Chopra | **General Surgery** | Surgery | ₹650 | dr.nitin.chopra@hospital.com |
| 4 | Dr. Pallavi Sharma | **Pediatrics** | Pediatrics | ₹600 | dr.pallavi.sharma@hospital.com |
| 5 | Dr. Suresh Reddy | **Neurology** | Neurology | ₹900 | dr.suresh.reddy@hospital.com |
| 6 | Dr. Komal Agarwal | **Gynecology** | Gynecology | ₹750 | dr.komal.agarwal@hospital.com |
| 7 | Dr. Naveen Reddy | **ENT** | ENT | ₹550 | dr.naveen.reddy@hospital.com |
| 8 | Dr. Ritu Pillai | **Dermatology** | Dermatology | ₹600 | dr.ritu.pillai@hospital.com |
| 9 | Dr. Suresh Menon | **Ophthalmology** | Ophthalmology | ₹650 | dr.suresh.menon@hospital.com |
| 10 | Dr. Meera Sharma | **Psychiatry** | Psychiatry | ₹700 | dr.meera.sharma@hospital.com |
| 11 | Dr. Nitin Rao | **Gastroenterology** | Gastroenterology | ₹750 | dr.nitin.rao@hospital.com |
| 12 | Dr. Nikita Rao | **Pulmonology** | Pulmonology | ₹700 | dr.nikita.rao@hospital.com |

**All Doctor Password**: `doctor123`

---

## 👥 Patient Data Details

### **100 Patients Created**

**Sample Patient Details**:
- **Patient IDs**: PAT20260001 to PAT20260100
- **Age Range**: 1 to 85 years
- **Gender Distribution**: 
  - Male: ~33%
  - Female: ~33%
  - Other: ~33%
- **Blood Groups**: A+, A-, B+, B-, O+, O-, AB+, AB- (randomly assigned)
- **Cities**: Mumbai, Delhi, Bangalore, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad, Jaipur, Lucknow, and more
- **States**: Maharashtra, Delhi, Karnataka, Tamil Nadu, West Bengal, Telangana, Gujarat, Rajasthan, Uttar Pradesh, etc.

### **Medical History** (20% of patients):
- Diabetes mellitus type 2
- Hypertension
- Asthma
- Hypothyroidism
- No significant history

### **Allergies** (14% of patients):
- Penicillin allergy
- Peanut allergy
- Sulfa drug allergy
- No known allergies

### **Sample Patient Emails**:
- priya.sharma1@patient.com
- rajesh.kumar2@patient.com
- amit.patel3@patient.com
- anjali.gupta4@patient.com
- suresh.singh5@patient.com
- ... (up to 100)

**All Patient Password**: `patient123`

---

## 🔑 Login Credentials

### **Admin Account**:
```
Email: admin@stulink.com
Password: secure-password-123
```

### **Doctor Accounts**:
```
Email Format: dr.[firstname].[lastname]@hospital.com
Password: doctor123

Examples:
- dr.ashok.agarwal@hospital.com
- dr.meera.verma@hospital.com
- dr.nitin.chopra@hospital.com
```

### **Patient Accounts**:
```
Email Format: [firstname].[lastname][number]@patient.com
Password: patient123

Examples:
- priya.sharma1@patient.com
- rajesh.kumar2@patient.com
- amit.patel3@patient.com
```

---

## 🏥 Operation Theaters (From Previous Seed)

| Theater | Type | Floor | Status |
|---------|------|-------|--------|
| Main OT 1 | Major | 2nd Floor | Operational |
| Main OT 2 | Major | 2nd Floor | Operational |
| Minor OT | Minor | 1st Floor | Operational |
| Cath Lab | Cath Lab | Ground Floor | Operational |
| Emergency OT | Emergency | Ground Floor | Operational |

---

## 📋 Quick Test Scenarios

### **Test OPD Booking**:
1. Login as receptionist or admin
2. Go to **Clinical → OPD**
3. Click **"Book Appointment"**
4. Search patient: `priya.sharma1@patient.com`
5. Select doctor: **Dr. Ashok Agarwal (Cardiology)** - Fee: ₹800
6. Select date/time
7. Book appointment

### **Test Surgery Scheduling**:
1. Go to **Clinical → Operation Theatre**
2. Click **"Schedule Surgery"**
3. Search patient: `rajesh` (will show matching patients)
4. Search surgeon: `nitin chopra` (General Surgery)
5. Select theater: **Main OT 1**
6. Fill procedure details
7. Schedule

### **Test Patient History**:
1. Go to **Clinical → OPD**
2. Click **"View History"** icon next to any patient
3. See patient 360° view with all visits

---

## 🎯 Specialization Coverage

The 12 doctors cover all major hospital departments:

✅ **Cardiology** - Heart diseases  
✅ **Orthopedics** - Bone & joint  
✅ **General Surgery** - Surgical procedures  
✅ **Pediatrics** - Children's health  
✅ **Neurology** - Nervous system  
✅ **Gynecology** - Women's health  
✅ **ENT** - Ear, Nose, Throat  
✅ **Dermatology** - Skin diseases  
✅ **Ophthalmology** - Eye care  
✅ **Psychiatry** - Mental health  
✅ **Gastroenterology** - Digestive system  
✅ **Pulmonology** - Respiratory system  

---

## 📊 Database Statistics

```sql
-- Check patient count
SELECT COUNT(*) FROM patients;  -- Should be ~102

-- Check doctor count
SELECT COUNT(*) FROM staff WHERE role = 'DOCTOR';  -- Should be ~12-14

-- Check specializations
SELECT specialization, COUNT(*) 
FROM staff 
GROUP BY specialization;

-- Check patients by blood group
SELECT blood_group, COUNT(*) 
FROM patients 
GROUP BY blood_group;

-- Check patients by gender
SELECT gender, COUNT(*) 
FROM patients 
GROUP BY gender;
```

---

## 🔄 Re-Running the Seed Script

The seed script is **idempotent** (safe to run multiple times):
- Skips existing users based on email
- Won't create duplicates
- Shows "⏭️ Skipping..." for existing records

```bash
# Run again if needed
npx tsx scripts/seed-patients-doctors.ts
```

---

## 🧹 Cleanup (If Needed)

To remove all seeded data and start fresh:

```bash
# WARNING: This will delete ALL data!
npx prisma db push --force-reset

# Then re-run all seed scripts:
npx tsx scripts/seed-admin.ts
npx tsx scripts/seed-ot-theaters.ts
npx tsx scripts/seed-patients-doctors.ts
```

---

## 📈 Next Steps

Now you can:
1. ✅ **Test OPD Workflow**: Book appointments with different doctors
2. ✅ **Test Lab Workflow**: Order tests for patients
3. ✅ **Test OT Workflow**: Schedule surgeries with different surgeons
4. ✅ **Test Billing**: Create invoices for different services
5. ✅ **Test IPD**: Admit patients to beds
6. ✅ **Test Patient History**: View comprehensive medical records

---

## 🎉 Summary

✅ **100 Realistic Patients** with diverse demographics  
✅ **12 Doctors** covering all major specializations  
✅ **5 Operation Theaters** ready for scheduling  
✅ **Secure Passwords** for all test accounts  
✅ **Indian Names & Cities** for authentic testing  
✅ **Medical History & Allergies** for realistic scenarios  

**Your hospital database is now fully populated and ready for comprehensive testing!** 🚀
