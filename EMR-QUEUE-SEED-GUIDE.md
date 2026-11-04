# 🏥 EMR Queue Seed Script - Quick Guide

## Purpose

This script creates **5 test appointments for TODAY** so you can immediately test the EMR Doctor's Queue without waiting for real patient data.

---

## 📦 What Gets Created

### **1 Doctor (if none exists):**
- Name: Dr. Rajesh Kumar
- Email: `doctor.test@hospital.com`
- Password: `doctor123`
- Specialization: General Physician
- Consultation Fee: ₹500

### **5 Patients with Appointments:**

| # | Patient Name | Age | Gender | Phone | Reason | Time | Status |
|---|--------------|-----|--------|-------|--------|------|--------|
| 1 | Rahul Sharma | 35 | Male | 9876543210 | Fever & Cold since 3 days | 09:00 | **PENDING** |
| 2 | Priya Patel | 28 | Female | 9876543211 | Stomach Pain and Nausea | 10:00 | **PENDING** |
| 3 | Amit Verma | 42 | Male | 9876543212 | Follow-up for Diabetes | 11:00 | **PENDING** |
| 4 | Sneha Gupta | 31 | Female | 9876543213 | Severe Headache & Dizziness | 12:00 | **IN_PROGRESS** |
| 5 | Vikram Singh | 50 | Male | 9876543214 | General Health Checkup | 13:00 | **IN_PROGRESS** |

**Result:** 3 waiting in queue, 2 currently with doctor

---

## 🚀 How to Run

### **Step 1: Run the Seed Script**

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

   2. Creating Priya Patel...
      ✅ Patient: PAT-TEST-002
      ✅ Appointment: 10:00 | Status: PENDING
      ✅ Reason: Stomach Pain and Nausea

   ... (continues for all 5 patients)

✅ EMR Queue Seed Complete!

📊 Summary:
   - Doctor: Dr. Rajesh Kumar
   - Patients Created: 5
   - Appointments Created: 5
   - PENDING (Waiting): 3
   - IN_PROGRESS (Active): 2

🎯 Next Steps:
   1. Restart your dev server: npm run dev
   2. Navigate to: /dashboard/clinical/emr
   3. You should see 5 appointments in the queue!

💡 Test Login:
   Email: doctor.test@hospital.com
   Password: doctor123
```

---

### **Step 2: Restart Dev Server (Important!)**

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

**Why?** The server needs to refresh to load the new data.

---

### **Step 3: Navigate to EMR Page**

```
URL: http://localhost:3000/dashboard/clinical/emr
Or: Dashboard → Clinical → EMR
```

---

## 🎯 What You Should See

### **Stats Cards:**
- **Waiting:** 3 patients (orange)
- **In Progress:** 2 patients (blue)
- **Completed:** 0 patients (green)

### **Appointments Table:**

| Token | Patient Name | Age/Gender | Time | Chief Complaint | Status | Action |
|-------|--------------|------------|------|-----------------|--------|--------|
| #1 | Rahul Sharma | 35 yrs / MALE | 09:00 | Fever & Cold since 3 days | 🟠 Waiting | [Start Consultation] |
| #2 | Priya Patel | 28 yrs / FEMALE | 10:00 | Stomach Pain and Nausea | 🟠 Waiting | [Start Consultation] |
| #3 | Amit Verma | 42 yrs / MALE | 11:00 | Follow-up for Diabetes | 🟠 Waiting | [Start Consultation] |
| #4 | Sneha Gupta | 31 yrs / FEMALE | 12:00 | Severe Headache & Dizziness | 🔵 In Progress | [Continue Consultation] |
| #5 | Vikram Singh | 50 yrs / MALE | 13:00 | General Health Checkup | 🔵 In Progress | [Continue Consultation] |

---

## 🧪 Testing the Complete Flow

### **Test 1: Start a New Consultation**
1. Click "Start Consultation" for Rahul Sharma
2. EMR page loads with patient details
3. Record vitals (BP: 120/80, Pulse: 72, Temp: 99.2)
4. Fill chief complaint: "Fever & Cold since 3 days"
5. Diagnosis: "Upper Respiratory Tract Infection"
6. Click "Add Medicine"
7. Add: Dolo 650, 650mg, 1-0-1, 3 Days
8. Select lab tests: CBC
9. Click "Save & Complete"
10. Verify redirect to print page
11. Print prescription

### **Test 2: Continue Existing Consultation**
1. Click "Continue Consultation" for Sneha Gupta
2. Her consultation should be IN_PROGRESS
3. Complete the consultation
4. Save and print

### **Test 3: Check Database Updates**
1. After completing a consultation, return to queue
2. Verify appointment moved from queue
3. Check "Completed" count increased
4. Verify appointment status changed in database

---

## 🔄 Running Multiple Times

**Can I run the script multiple times?**

**Answer:** Yes, but it will create duplicate patients each time.

**Best Practice:**
1. Run once to test
2. If you want fresh data, clear the test data first:

```bash
# Option 1: Clear only test appointments
npx prisma studio
# Delete appointments with patientId starting with "PAT-TEST-"

# Option 2: Reset entire database (WARNING: Deletes ALL data)
npx prisma db push --force-reset
npm run db:seed  # Re-seed base data
npx ts-node prisma/seed-queue.ts  # Add queue data
```

---

## 🐛 Troubleshooting

### **Issue 1: "Doctor not found" error**
**Solution:** The script will auto-create a doctor. Just run again.

### **Issue 2: Queue is empty after running script**
**Solutions:**
1. Verify script ran successfully (check console output)
2. Restart dev server: `npm run dev`
3. Check database: `npx prisma studio`
4. Verify appointments have today's date
5. Check appointment status is PENDING or IN_PROGRESS

### **Issue 3: "Email already exists" error**
**Cause:** You ran the script before and the test users already exist.

**Solutions:**
```bash
# Option A: Use Prisma Studio to delete test users
npx prisma studio
# Find and delete users with email containing "@test.com"

# Option B: Modify script to use different emails
# Edit prisma/seed-queue.ts and change patient names
```

### **Issue 4: Appointments show wrong date**
**Cause:** Timezone issue or appointments from previous runs.

**Solution:**
```bash
# Delete old test appointments
npx prisma studio
# Filter appointments by patientId starting with "PAT-TEST-"
# Delete them
# Run seed script again
```

---

## 📊 Database Verification

### **Check via Prisma Studio:**

```bash
npx prisma studio
```

**What to verify:**
1. **Users table:** 6 new users (1 doctor + 5 patients)
2. **Staff table:** 1 doctor entry
3. **Patient table:** 5 patient entries with PAT-TEST-001 to PAT-TEST-005
4. **Appointment table:** 5 appointments with today's date
   - 3 with status: PENDING
   - 2 with status: IN_PROGRESS

---

## 🎯 Quick Commands Reference

```bash
# Run the seed script
npx ts-node prisma/seed-queue.ts

# Restart dev server
npm run dev

# Open database browser
npx prisma studio

# Check database
npx prisma db pull

# Reset and re-seed (WARNING: Deletes all data)
npx prisma db push --force-reset
npm run db:seed
npx ts-node prisma/seed-queue.ts
```

---

## 💡 Pro Tips

### **Tip 1: Test Different Scenarios**
Modify the script to test:
- All PENDING appointments
- All IN_PROGRESS appointments
- Different chief complaints
- Different times

### **Tip 2: Create Custom Patient Data**
Edit the `PATIENTS` array in `prisma/seed-queue.ts`:

```typescript
const PATIENTS = [
  {
    name: "Your Custom Name",
    gender: "MALE" as Gender,
    phone: "1234567890",
    age: 25,
    reason: "Your custom complaint"
  },
  // ... add more
]
```

### **Tip 3: Test Multiple Doctors**
Create appointments for different doctors to test doctor filtering:

```typescript
// In the script, create multiple doctors
// Assign different appointments to different doctors
```

### **Tip 4: Test Follow-up Dates**
Set some appointments as follow-ups from previous visits:

```typescript
// Add previousVisitDate to patient creation
// Set reason as "Follow-up for previous condition"
```

---

## ✅ Success Checklist

After running the script, verify:

- [ ] Console shows "✅ EMR Queue Seed Complete!"
- [ ] 5 patients created (PAT-TEST-001 to PAT-TEST-005)
- [ ] 5 appointments created
- [ ] 3 appointments with PENDING status
- [ ] 2 appointments with IN_PROGRESS status
- [ ] All appointments dated TODAY
- [ ] Dev server restarted
- [ ] EMR page loads successfully
- [ ] Stats cards show correct counts
- [ ] Table displays 5 appointments
- [ ] "Start Consultation" button visible for PENDING
- [ ] "Continue Consultation" button visible for IN_PROGRESS
- [ ] Clicking button redirects to consultation page

---

## 🎉 You're Ready!

Your EMR queue is now populated with test data. Start testing the complete consultation workflow!

**Next Actions:**
1. Click "Start Consultation" for any patient
2. Fill in the consultation form
3. Add prescriptions with Indian frequency codes (1-0-1)
4. Order lab tests
5. Save and print prescription
6. Repeat for all patients to test the complete flow

---

**Created:** January 25, 2026  
**Script:** `prisma/seed-queue.ts`  
**Purpose:** Quick EMR Queue Testing  
**Run Time:** ~5 seconds
