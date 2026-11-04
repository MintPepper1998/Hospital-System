# 🧪 OPD Billing Testing Guide

## 🔄 Pre-Testing Setup

### **Step 1: Restart Development Server**
The Prisma Client needs to be regenerated to include the new fields.

```bash
# Stop the dev server (Ctrl+C)
# Then restart:
npm run dev
```

### **Step 2: Update Doctor Fees (Optional)**
If you want to test with different consultation fees:

```sql
-- Connect to PostgreSQL
psql -U postgres -d hospital_erp -p 5433

-- Update a specific doctor's fee
UPDATE staff 
SET "consultationFee" = 800 
WHERE "employeeId" = 'EMP-DOC-0001';

-- Or update all doctors
UPDATE staff 
SET "consultationFee" = 600;
```

---

## 🎯 Test Scenarios

### **Test 1: Basic Appointment Booking with Billing**

1. **Login as Admin:**
   - Email: `admin@stulink.com`
   - Password: `secure-password-123`

2. **Navigate to OPD Dashboard:**
   - Click "Clinical" → "OPD" in sidebar

3. **Book an Appointment:**
   - Find a registered patient (or register a new one first)
   - Click the "Book" button
   - **Select a Doctor** - observe the consultation fee displaying
   - Select tomorrow's date
   - Choose a time (e.g., 10:00 AM)
   - **Choose Payment Method** (e.g., Cash)
   - Enter reason: "Regular checkup"
   - Click **"Collect ₹500 & Book"**

4. **Verify Success:**
   - ✅ Toast shows: "Appointment Booked & Receipt Generated"
   - ✅ Message includes bill number (e.g., "OPD-2026-0001")
   - ✅ Dialog closes automatically

---

### **Test 2: Verify Database Records**

#### **Check Appointment:**
```sql
SELECT 
  a.id,
  a."appointmentDate",
  a."appointmentTime",
  a.reason,
  a.status,
  p."patientId",
  u.name as doctor_name
FROM appointments a
JOIN patients p ON a."patientId" = p.id
JOIN staff s ON a."doctorId" = s.id
JOIN users u ON s."userId" = u.id
ORDER BY a."createdAt" DESC
LIMIT 1;
```

#### **Check Billing:**
```sql
SELECT 
  b."billNumber",
  b.type,
  b."totalAmount",
  b."paidAmount",
  b.status,
  b."paymentMethod",
  b.notes
FROM billings b
WHERE b.type = 'OPD'
ORDER BY b."createdAt" DESC
LIMIT 1;
```

#### **Check Billing Items:**
```sql
SELECT 
  bi.description,
  bi.quantity,
  bi."unitPrice",
  bi."totalAmount"
FROM billing_items bi
JOIN billings b ON bi."billingId" = b.id
WHERE b.type = 'OPD'
ORDER BY bi."createdAt" DESC
LIMIT 1;
```

**Expected Results:**
- ✅ Appointment status: `PENDING`
- ✅ Billing type: `OPD`
- ✅ Billing status: `PAID`
- ✅ Amount matches doctor's consultation fee
- ✅ Payment method matches selection
- ✅ Bill number format: `OPD-2026-NNNN`

---

### **Test 3: Different Payment Methods**

Repeat Test 1 with different payment methods:

1. **Cash Payment:**
   - Select "Cash" → Click "Collect ₹500 & Book"
   - Verify `paymentMethod = 'CASH'` in database

2. **UPI Payment:**
   - Select "UPI / QR Code" → Click "Collect ₹500 & Book"
   - Verify `paymentMethod = 'UPI'` in database

3. **Card Payment:**
   - Select "Card (Debit/Credit)" → Click "Collect ₹500 & Book"
   - Verify `paymentMethod = 'CARD'` in database

---

### **Test 4: Billing Separation (OPD vs Pharmacy)**

#### **Create OPD Bill:**
- Book an appointment (as in Test 1)
- Note the bill number (e.g., `OPD-2026-0001`)

#### **Create Pharmacy Bill:**
1. Complete a consultation (record vitals, prescription)
2. Go to Pharmacy POS
3. Click "Dispense & Bill"
4. Generate invoice (e.g., `BILL-2026-0001`)

#### **Verify Separation:**
```sql
-- Count bills by type
SELECT 
  type,
  COUNT(*) as count,
  SUM("totalAmount") as total_revenue
FROM billings
GROUP BY type;
```

**Expected Output:**
```
type      | count | total_revenue
----------|-------|---------------
OPD       |   5   |   2500.00
PHARMACY  |   3   |   1850.00
```

---

### **Test 5: Fee Display in UI**

1. **Open Booking Dialog**
2. **Select Different Doctors:**
   - Observer fee changing dynamically
   - Verify button text updates (e.g., "Collect ₹500", "Collect ₹800")

3. **No Doctor Selected:**
   - Button should show "Select Doctor First"
   - Button should be disabled

---

### **Test 6: Error Handling**

#### **Missing Fields:**
- Try to submit without selecting a doctor → Error toast
- Try to submit without payment method → Error toast
- Try to submit without date/time → Browser validation

#### **Invalid Data:**
- Select a past date → Browser should prevent
- Select an invalid time → Browser should prevent

---

## 🐛 Troubleshooting

### **Issue: "Cannot read properties of undefined (reading 'consultationFee')"**

**Cause:** Prisma Client not regenerated

**Solution:**
```bash
# Stop dev server
# Then run:
npx prisma generate
npm run dev
```

---

### **Issue: Consultation fee not displaying**

**Cause:** Database not synced or doctor record missing fee

**Solution:**
```sql
-- Check if consultationFee column exists
\d staff

-- Update all doctors to have a default fee
UPDATE staff SET "consultationFee" = 500 WHERE "consultationFee" IS NULL;
```

---

### **Issue: Bill number duplicates**

**Cause:** Concurrent requests (rare in development)

**Solution:**
- Bill number generation uses a simple counter
- For production, consider using database sequences or UUID-based numbering

---

### **Issue: Pharmacy bills showing as OPD**

**Cause:** `generateInvoice()` not setting type correctly

**Solution:**
- Verify `type: BillingType.PHARMACY` is set in `lib/actions.ts`
- Restart dev server after code changes

---

## 📊 Expected Metrics (After 10 Test Appointments)

### **Dashboard Stats:**
- ✅ Total Revenue: ₹5,000 (10 × ₹500)
- ✅ Today's Appointments: 10
- ✅ Pending Bills: 0 (all OPD bills are PAID upfront)

### **Finance Dashboard:**
- ✅ OPD Revenue: ₹5,000
- ✅ Pharmacy Revenue: ₹0 (if no pharmacy bills created)

---

## ✅ Final Checklist

Before marking this feature as complete:

- [ ] Dev server restarted successfully
- [ ] Can book appointment with fee collection
- [ ] Consultation fee displays correctly
- [ ] Payment method dropdown works
- [ ] Submit button shows correct amount
- [ ] Toast shows bill number on success
- [ ] Database has OPD billing record
- [ ] Database has billing item record
- [ ] Pharmacy billing remains separate
- [ ] No console errors in browser
- [ ] No errors in terminal/server logs

---

## 🎉 Success Criteria

**Feature is READY when:**

1. ✅ Receptionist can book appointments
2. ✅ Consultation fee is collected upfront
3. ✅ Receipt/bill number is generated immediately
4. ✅ Payment method is recorded
5. ✅ OPD and Pharmacy billing are separate
6. ✅ All database records are correct
7. ✅ UI is professional and intuitive
8. ✅ No errors or warnings

---

**Happy Testing! 🚀**
