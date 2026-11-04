# 🐛 Patient Registration - Debug Guide

**Date**: January 13, 2026  
**Issue**: Generic error message on form submission

---

## ✅ Changes Applied

### **Enhanced Error Logging**

I've updated the `registerPatient` function in `lib/actions.ts` with comprehensive logging:

#### **What's Now Logged**:

1. ✅ **Step-by-step progress** - Each stage of registration
2. ✅ **Form data extraction** - What data was received
3. ✅ **Validation results** - Which validations pass/fail
4. ✅ **Database queries** - Patient lookup, count, etc.
5. ✅ **Generated values** - Patient ID, emails, dates
6. ✅ **Full error details** - Error type, message, code, stack trace
7. ✅ **Success confirmation** - Patient ID and user ID

#### **Fixed Issue**:

**Problem**: The code was manually setting `createdAt: new Date()` in the Patient record.

**Issue**: The Prisma schema has `createdAt DateTime @default(now())`, which means Prisma automatically handles this field.

**Fix**: Removed the manual `createdAt` field from the data object. Prisma now handles it automatically.

---

## 🔍 How to Debug

### **Step 1: Clear the Terminal**

In VS Code, clear your terminal to see fresh output:
```
Clear-Host  (PowerShell)
```

### **Step 2: Submit the Form**

1. Go to: `http://localhost:3000/dashboard/clinical/opd/register`
2. Fill in ALL required fields:
   - Full Name: John Doe
   - Date of Birth: 1990-05-15
   - Gender: Male
   - Phone: +91 98765 43210
   - Email: (leave empty or fill)
   - Address: 123 Main Street, City
   - Chief Complaint: Fever and headache

3. Click "Register Patient"

### **Step 3: Check Your Terminal**

Look for detailed logs like this:

#### **✅ Success Case**:
```
=== PATIENT REGISTRATION STARTED ===
Form data extracted: {
  fullName: 'John Doe',
  dateOfBirth: '1990-05-15',
  gender: 'MALE',
  phone: '+91 98765 43210',
  email: '(empty)',
  address: '123 Main Street, City',
  chiefComplaint: 'Fever and headache...'
}
Step 1: Checking for existing patient with phone: +91 98765 43210
Step 2: Converting date of birth
Date conversion: { input: '1990-05-15', output: 1990-05-15T00:00:00.000Z, valid: true }
Step 3: Generating Patient ID
Generated Patient ID: PAT-2026-0001 (Count: 0)
Step 4: Preparing user email
User email: patient-+91 98765 43210@hospital-erp.internal (generated)
Step 5: Creating User record
User created successfully: clx...
Step 6: Creating Patient record
✅ Patient registered successfully: {
  patientId: 'PAT-2026-0001',
  name: 'John Doe',
  phone: '+91 98765 43210',
  userId: 'clx...'
}
=== REGISTRATION COMPLETE - Redirecting ===
```

#### **❌ Error Case**:
```
❌ REGISTRATION ERROR - Full details below:
Error type: PrismaClientKnownRequestError
Error message: [Detailed error message]
Error code: P2002
Error meta: { target: ['email'] }
Full error object: [Complete error object]
Stack trace: [Full stack trace]
```

---

## 🔍 Common Errors & Solutions

### **Error 1: P2002 - Unique Constraint Violation**

**Log Shows**:
```
Error code: P2002
Error meta: { target: ['email'] }
```

**Meaning**: Trying to create a user with an email that already exists

**Solution**:
- Use a different email
- Or leave email empty (generates unique dummy email)

---

### **Error 2: P2003 - Foreign Key Constraint**

**Log Shows**:
```
Error code: P2003
Foreign key constraint failed
```

**Meaning**: Database relationship issue

**Solution**:
- Check if User was created successfully
- Verify database schema is up to date: `npx prisma db push`

---

### **Error 3: Invalid Date Format**

**Log Shows**:
```
Date conversion: { input: '...', output: Invalid Date, valid: false }
Invalid date format
```

**Meaning**: Date string couldn't be parsed

**Solution**:
- Use format: YYYY-MM-DD (e.g., 1990-05-15)
- Check browser date picker is working

---

### **Error 4: Missing Required Fields**

**Log Shows**:
```
Validation failed: Missing required fields
```

**Meaning**: One or more required fields are empty

**Solution**:
- Fill in ALL fields marked with red asterisk (*)
- Check if form values are being passed correctly

---

### **Error 5: Duplicate Phone Number**

**Log Shows**:
```
Duplicate phone number found: PAT-2026-XXXX
```

**Meaning**: Patient with this phone already exists

**Solution**:
- Use a different phone number
- Or find existing patient in database

---

## 📊 Schema Verification

### **Patient Model Fields** (from `prisma/schema.prisma`):

```typescript
model Patient {
  id              String    @id @default(cuid())        ✅ Auto-generated
  userId          String    @unique                     ✅ From User creation
  patientId       String    @unique                     ✅ Generated (PAT-YYYY-XXXX)
  dateOfBirth     DateTime?                             ✅ Converted from string
  gender          Gender?                               ✅ From form (MALE/FEMALE/OTHER)
  phone           String?                               ✅ From form
  address         String?                               ✅ From form
  medicalHistory  String?   @db.Text                    ✅ From chiefComplaint
  createdAt       DateTime  @default(now())             ✅ Auto-set by Prisma
  updatedAt       DateTime  @updatedAt                  ✅ Auto-managed by Prisma
  
  // Relations
  user            User      @relation(...)              ✅ Links to User table
}
```

### **Field Mapping**:

| Form Field | Database Field | Type | Notes |
|------------|----------------|------|-------|
| fullName | User.name | String | Stored in User table |
| dateOfBirth | Patient.dateOfBirth | DateTime | Converted from string |
| gender | Patient.gender | Gender enum | MALE/FEMALE/OTHER |
| phone | Patient.phone | String | Checked for duplicates |
| email | User.email | String | Or generated dummy |
| address | Patient.address | String | - |
| chiefComplaint | Patient.medicalHistory | Text | - |
| - | Patient.patientId | String | Auto-generated |
| - | Patient.userId | String | From User.id |
| - | Patient.createdAt | DateTime | Auto-set |

---

## 🧪 Test Cases

### **Test 1: New Patient (Success)**

**Input**:
- All fields filled
- Unique phone number
- Valid date

**Expected Logs**:
```
=== PATIENT REGISTRATION STARTED ===
[All steps complete]
✅ Patient registered successfully
=== REGISTRATION COMPLETE - Redirecting ===
```

**Result**: Redirect to OPD dashboard

---

### **Test 2: Duplicate Phone (Expected Error)**

**Input**:
- Same phone number as existing patient

**Expected Logs**:
```
Step 1: Checking for existing patient
Duplicate phone number found: PAT-2026-XXXX
```

**Result**: Error message shown in form

---

### **Test 3: No Email (Success)**

**Input**:
- Leave email field empty

**Expected Logs**:
```
User email: patient-+91XXXXXXXXXX@hospital-erp.internal (generated)
User created successfully
```

**Result**: Patient registered with dummy email

---

## 🔧 Additional Debug Commands

### **Check Database**:
```bash
npx prisma studio
```
- View `users` table
- View `patients` table
- Verify records exist

### **Reset Database** (if needed):
```bash
npx prisma db push --force-reset
npm run db:seed
```

### **View Prisma Logs**:
Add to `.env`:
```env
DEBUG=prisma:*
```

---

## 📝 What to Share

If you still get errors, share these from your terminal:

1. **The full log output** starting from `=== PATIENT REGISTRATION STARTED ===`
2. **The error message** including:
   - Error type
   - Error code
   - Error meta
   - Stack trace
3. **Form data** you entered

---

## ✅ Expected Terminal Output

Here's what you should see when it works:

```bash
=== PATIENT REGISTRATION STARTED ===
Form data extracted: { fullName: 'John Doe', ... }
Step 1: Checking for existing patient with phone: +91 98765 43210
Step 2: Converting date of birth
Date conversion: { input: '1990-05-15', output: 1990-05-15T00:00:00.000Z, valid: true }
Step 3: Generating Patient ID
Generated Patient ID: PAT-2026-0001 (Count: 0)
Step 4: Preparing user email
User email: patient-+91 98765 43210@hospital-erp.internal (generated)
Step 5: Creating User record
User created successfully: clx1234567890abcdef
Step 6: Creating Patient record
✅ Patient registered successfully: {
  patientId: 'PAT-2026-0001',
  name: 'John Doe',
  phone: '+91 98765 43210',
  userId: 'clx1234567890abcdef'
}
=== REGISTRATION COMPLETE - Redirecting ===
```

---

## 🎯 Quick Fix Checklist

- [x] Enhanced error logging ✅
- [x] Removed manual `createdAt` field ✅
- [x] Added step-by-step logs ✅
- [x] Added full error details ✅
- [x] Added date conversion validation ✅
- [x] Added duplicate check logging ✅
- [x] Schema verified ✅

---

## 🚀 Next Steps

**Now, please try the following**:

1. ✅ Make sure your dev server is running: `npm run dev`

2. ✅ Open your VS Code terminal where the server is running

3. ✅ Clear the terminal output: `Clear-Host`

4. ✅ Go to the registration form: `http://localhost:3000/dashboard/clinical/opd/register`

5. ✅ Fill in ALL required fields

6. ✅ Click "Register Patient"

7. ✅ **Check your terminal** for the detailed logs

8. ✅ **Share the terminal output** if you see any errors

---

**The enhanced logging will show you exactly where the error is happening!** 🔍
