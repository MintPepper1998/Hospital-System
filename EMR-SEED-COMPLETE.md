# ✅ EMR Queue Seed Script - Complete!

## 🎯 What Was Created

A quick seed script that populates the EMR Doctor's Queue with **live test data** for immediate testing.

---

## 📦 Files Created

1. ✅ `prisma/seed-queue.ts` - Main seed script
2. ✅ `EMR-QUEUE-SEED-GUIDE.md` - Comprehensive guide (13 pages)
3. ✅ `QUICK-EMR-SEED.md` - Quick reference card (1 page)

---

## 🚀 Quick Start

### **Step 1: Run the Script**

```bash
npx ts-node prisma/seed-queue.ts
```

**Expected Output:**
```
🏥 Starting EMR Queue Seed Script...

👨‍⚕️ Finding doctor...
   ✅ Found doctor: Dr. Rajesh Kumar

👥 Creating patients and appointments...

   1. Creating Rahul Sharma...
      ✅ Patient: PAT-TEST-001
      ✅ Appointment: 09:00 | Status: PENDING
      ✅ Reason: Fever & Cold since 3 days

   ... (creates 5 patients)

✅ EMR Queue Seed Complete!

📊 Summary:
   - Doctor: Dr. Rajesh Kumar
   - Patients Created: 5
   - Appointments Created: 5
   - PENDING (Waiting): 3
   - IN_PROGRESS (Active): 2
```

---

### **Step 2: Restart Dev Server**

```bash
npm run dev
```

---

### **Step 3: Test the EMR**

```
Navigate to: /dashboard/clinical/emr
```

**You'll see:**
- 3 patients waiting (orange badges)
- 2 patients in progress (blue badges)
- 5 total appointments for TODAY

---

## 📋 Test Data Created

### **1 Doctor:**
- **Name:** Dr. Rajesh Kumar
- **Email:** doctor.test@hospital.com
- **Password:** doctor123
- **Specialization:** General Physician
- **Consultation Fee:** ₹500

### **5 Patients:**

| # | Name | Age | Gender | Phone | Blood Group |
|---|------|-----|--------|-------|-------------|
| 1 | Rahul Sharma | 35 | Male | 9876543210 | O+ |
| 2 | Priya Patel | 28 | Female | 9876543211 | A+ |
| 3 | Amit Verma | 42 | Male | 9876543212 | B+ |
| 4 | Sneha Gupta | 31 | Female | 9876543213 | AB+ |
| 5 | Vikram Singh | 50 | Male | 9876543214 | O+ |

### **5 Appointments (TODAY):**

| Token | Patient | Time | Complaint | Status |
|-------|---------|------|-----------|--------|
| #1 | Rahul Sharma | 09:00 | Fever & Cold since 3 days | 🟠 PENDING |
| #2 | Priya Patel | 10:00 | Stomach Pain and Nausea | 🟠 PENDING |
| #3 | Amit Verma | 11:00 | Follow-up for Diabetes | 🟠 PENDING |
| #4 | Sneha Gupta | 12:00 | Severe Headache & Dizziness | 🔵 IN_PROGRESS |
| #5 | Vikram Singh | 13:00 | General Health Checkup | 🔵 IN_PROGRESS |

---

## 🧪 Complete Testing Workflow

### **Test 1: Start New Consultation (PENDING)**

1. Navigate to `/dashboard/clinical/emr`
2. Click "Start Consultation" for **Rahul Sharma**
3. EMR page loads with:
   - Patient details (Name: Rahul Sharma, Age: 35, Gender: Male)
   - Blood Group: O+
   - Empty vitals form
   - Empty prescription pad
4. Fill Vitals:
   - BP: 120/80
   - Pulse: 72
   - Temp: 99.2
   - Weight: 70
   - SpO2: 98
5. Fill Clinical Details:
   - Chief Complaint: "Fever & Cold since 3 days"
   - Diagnosis: "Upper Respiratory Tract Infection"
6. Add Prescription:
   - Click "Add Medicine"
   - Medicine: Dolo 650
   - Dosage: 650mg
   - Frequency: 1-0-1
   - Duration: 3 Days
   - Quantity: 9
   - Instructions: SOS if fever
7. Add Lab Tests:
   - Check: CBC (₹300)
8. Set Follow-up:
   - Date: 3 days from today
9. Click "Save & Complete"
10. Verify:
    - Success toast appears
    - Redirects to print page
    - Prescription displays correctly
11. Click "Print Prescription"
12. Verify professional prescription prints

### **Test 2: Continue Consultation (IN_PROGRESS)**

1. Return to queue: `/dashboard/clinical/emr`
2. Click "Continue Consultation" for **Sneha Gupta**
3. Complete consultation
4. Save and print

### **Test 3: Multiple Consultations**

- Complete all 5 consultations
- Verify queue empties
- Check stats: Completed = 5

### **Test 4: Database Verification**

```bash
npx prisma studio
```

Verify:
- All appointments status changed to COMPLETED
- MedicalRecords created (5 entries)
- Prescriptions created (5 entries)
- PrescriptionItems created (varies by test)
- LabRequests created (varies by test)

---

## 🎨 What You'll See in the EMR

### **Queue Page (`/dashboard/clinical/emr`):**

**Stats Cards:**
```
┌─────────────┬─────────────┬─────────────┐
│  Waiting    │ In Progress │  Completed  │
│     3       │      2      │      0      │
│  (Orange)   │   (Blue)    │   (Green)   │
└─────────────┴─────────────┴─────────────┘
```

**Appointments Table:**
```
┌───────┬──────────────┬──────────┬───────┬─────────────────┬────────────┬──────────────────┐
│ Token │ Patient Name │ Age/Gen  │ Time  │ Chief Complaint │   Status   │     Action       │
├───────┼──────────────┼──────────┼───────┼─────────────────┼────────────┼──────────────────┤
│  #1   │ Rahul Sharma │ 35/MALE  │ 09:00 │ Fever & Cold    │ 🟠 Waiting │ [Start Consult]  │
│  #2   │ Priya Patel  │ 28/FEMALE│ 10:00 │ Stomach Pain    │ 🟠 Waiting │ [Start Consult]  │
│  #3   │ Amit Verma   │ 42/MALE  │ 11:00 │ Diabetes F/up   │ 🟠 Waiting │ [Start Consult]  │
│  #4   │ Sneha Gupta  │ 31/FEMALE│ 12:00 │ Headache        │ 🔵 Active  │ [Continue]       │
│  #5   │ Vikram Singh │ 50/MALE  │ 13:00 │ Health Checkup  │ 🔵 Active  │ [Continue]       │
└───────┴──────────────┴──────────┴───────┴─────────────────┴────────────┴──────────────────┘
```

### **Consultation Page:**

**Patient Info Card:**
```
┌─────────────────────────────────────────┐
│ 👤 Patient Information                  │
├─────────────────────────────────────────┤
│ Name:        Rahul Sharma               │
│ Patient ID:  PAT-TEST-001               │
│ Age/Gender:  35 years / MALE            │
│ Blood Group: O+                         │
│ Medical Hx:  No significant history     │
│ Allergies:   None reported              │
└─────────────────────────────────────────┘
```

**Prescription Pad:**
```
┌────────────────────────────────────────────────────────────┐
│ 💊 Prescription Pad                      [+ Add Medicine]  │
├────────────────────────────────────────────────────────────┤
│ 1. Dolo 650 | 650mg | 1-0-1 | 3 Days | 9 | SOS if fever  │
│                                               [Remove]      │
├────────────────────────────────────────────────────────────┤
│ Total medications: 1                                       │
└────────────────────────────────────────────────────────────┘
```

---

## 💡 Pro Tips

### **Tip 1: Test Different Frequencies**
Try all Indian frequency codes:
- 1-0-1 (Morning-Afternoon-Night)
- 1-0-0 (Once daily - Morning)
- 0-0-1 (Once daily - Night)
- 1-1-1 (Three times daily)
- SOS (As needed)
- STAT (Immediately)

### **Tip 2: Test Multiple Medicines**
Add 3-5 medicines per prescription to test:
- Dynamic row addition
- Remove functionality
- Prescription printing with multiple medicines

### **Tip 3: Test Lab Orders**
Select multiple lab tests:
- CBC
- Lipid Profile
- Blood Sugar
- Thyroid Profile
- Verify they appear in print

### **Tip 4: Test Follow-up**
Set different follow-up dates:
- 3 days
- 1 week
- 2 weeks
- 1 month

### **Tip 5: Test Vitals Recording**
Record different vital ranges:
- Normal: BP 120/80, Pulse 72
- High BP: 140/90, Pulse 90
- Low SpO2: 94%
- High Temp: 101°F

---

## 🔄 Re-running the Script

**Q: Can I run the script multiple times?**

**A:** Yes, but it creates duplicate data.

**Best Practice:**

**Option 1: Clean Specific Test Data**
```bash
# Open Prisma Studio
npx prisma studio

# Delete:
# - Users with email containing "@test.com"
# - Patients with patientId starting with "PAT-TEST-"
# - Their appointments

# Then run script again
npx ts-node prisma/seed-queue.ts
```

**Option 2: Full Database Reset** (WARNING: Deletes ALL data)
```bash
# Reset database
npx prisma db push --force-reset

# Re-seed base data
npm run db:seed

# Add queue data
npx ts-node prisma/seed-queue.ts
```

---

## 🐛 Common Issues & Solutions

### **Issue 1: "Email already exists"**
**Cause:** Script ran before, users already exist.

**Solution:**
```bash
# Option A: Delete test users in Prisma Studio
npx prisma studio
# Find users with "@test.com" emails and delete

# Option B: Edit script with new names
# Open prisma/seed-queue.ts
# Change patient names in PATIENTS array
```

### **Issue 2: Queue shows no appointments**
**Causes:**
- Dev server not restarted
- Script didn't run successfully
- Appointments have wrong date

**Solutions:**
```bash
# 1. Restart dev server
npm run dev

# 2. Check script output for errors
npx ts-node prisma/seed-queue.ts

# 3. Verify in database
npx prisma studio
# Check Appointment table for today's date
```

### **Issue 3: Appointment shows wrong date**
**Cause:** Timezone or old appointments.

**Solution:**
```bash
# Delete old test appointments
npx prisma studio
# Filter by patientId starting with "PAT-TEST-"
# Delete them
# Run script again
```

### **Issue 4: Stats cards show 0**
**Cause:** No appointments match PENDING/IN_PROGRESS status for TODAY.

**Solution:**
```bash
# Verify appointments exist for today
npx prisma studio
# Check Appointment table
# Ensure appointmentDate = today
# Ensure status = PENDING or IN_PROGRESS
```

---

## 📊 Verification Checklist

After running the script, verify:

### **Console Output:**
- [ ] "✅ EMR Queue Seed Complete!"
- [ ] "Patients Created: 5"
- [ ] "Appointments Created: 5"
- [ ] "PENDING (Waiting): 3"
- [ ] "IN_PROGRESS (Active): 2"

### **Database (Prisma Studio):**
- [ ] 6 new users (1 doctor + 5 patients)
- [ ] 1 doctor in Staff table
- [ ] 5 patients in Patient table
- [ ] 5 appointments with today's date
- [ ] 3 appointments with status PENDING
- [ ] 2 appointments with status IN_PROGRESS

### **EMR Page (`/dashboard/clinical/emr`):**
- [ ] Page loads successfully
- [ ] Stats cards show: Waiting: 3, In Progress: 2, Completed: 0
- [ ] Table displays 5 rows
- [ ] Token numbers #1 to #5
- [ ] Patient names visible
- [ ] Orange badges for PENDING
- [ ] Blue badges for IN_PROGRESS
- [ ] Green "Start Consultation" buttons
- [ ] Blue "Continue Consultation" buttons

### **Consultation Page:**
- [ ] Click button redirects correctly
- [ ] Patient details load
- [ ] Vitals inputs editable
- [ ] Lab test checkboxes work
- [ ] "Add Medicine" button works
- [ ] Frequency dropdown shows Indian codes
- [ ] "Save & Complete" works
- [ ] Redirects to print page

### **Print Page:**
- [ ] Prescription displays
- [ ] Patient details correct
- [ ] Medicines listed
- [ ] Lab tests listed (if ordered)
- [ ] "Print" button triggers print dialog
- [ ] Only prescription prints (no sidebar)

---

## 🎉 Success!

**Your EMR queue is now populated with 5 test appointments!**

### **Next Steps:**

1. ✅ Script ran successfully
2. ✅ Dev server restarted
3. ✅ Queue populated with 5 appointments
4. ✅ Ready to test complete consultation workflow

### **Start Testing:**

```
1. Go to: /dashboard/clinical/emr
2. Click "Start Consultation" for Rahul Sharma
3. Fill consultation form
4. Add medicines with Indian codes
5. Order lab tests
6. Save and print
7. Repeat for all 5 patients!
```

---

## 📚 Documentation Files

- **Complete Guide:** `EMR-QUEUE-SEED-GUIDE.md` (13 pages)
- **Quick Reference:** `QUICK-EMR-SEED.md` (1 page)
- **This Summary:** `EMR-SEED-COMPLETE.md`

---

**Created:** January 25, 2026  
**Script:** `prisma/seed-queue.ts`  
**Status:** ✅ Ready to Run  
**Run Time:** ~5 seconds  
**Data Created:** 1 doctor + 5 patients + 5 appointments
