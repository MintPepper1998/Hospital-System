# Quick Billing Guide - Walk-in Lab Tests

## 🚀 3-Step Process

### Step 1: Select Patient
```
Navigate to: /dashboard/finance/billing/create
Click: Patient dropdown
Search: Type patient name or ID
Select: Click on patient
```

### Step 2: Add Lab Tests
```
In "Search Lab Tests" box:
Type: Test name (e.g., "CBC", "Vitamin D")
Click: On the test you want
Result: Test added to invoice automatically
```

### Step 3: Generate Invoice
```
Review: Check items and total
Select: Payment method (Cash/UPI/Card)
Click: "Generate Invoice & Print"
Done: Patient can go to sample collection
```

---

## 💡 Key Features

### No Prescription Required
- ✅ Walk-in patients can get tests directly
- ✅ No doctor visit needed
- ✅ No appointment required

### Smart Search
- 🔍 Real-time search results
- 🔍 Search by name, code, or category
- 🔍 Shows price instantly

### Optional Doctor Field
- Default: "Self / Walk-in"
- Can select: "External Doctor" if referred
- Not required: Leave as default for walk-ins

---

## 📋 Common Scenarios

### Scenario 1: Single Test
```
1. Select patient: "Rajesh Kumar"
2. Search test: "CBC"
3. Click: "CBC - ₹300"
4. Generate invoice
```

### Scenario 2: Multiple Tests
```
1. Select patient: "Priya Sharma"
2. Search: "Lipid" → Click "Lipid Profile - ₹800"
3. Search: "Vitamin" → Click "Vitamin D - ₹1200"
4. Search: "CBC" → Click "CBC - ₹300"
5. Review: 3 tests, Total: ₹2,300
6. Generate invoice
```

### Scenario 3: Test + Medicine
```
1. Select patient: "Amit Patel"
2. Add lab test: "Blood Sugar - ₹150"
3. Search medicine: "Dolo 650"
4. Select batch: Click on available batch
5. Generate invoice
```

---

## ⚠️ Important Notes

### Required
- ✅ Must select a patient
- ✅ Must add at least one item
- ✅ Must select payment method

### Optional
- ⭕ Doctor/Referral (defaults to "Self")
- ⭕ Discount
- ⭕ Custom items

### Auto-Filled
- 🤖 Test prices from catalog
- 🤖 Medicine prices from inventory
- 🤖 GST calculation (18%)
- 🤖 Grand total

---

## 🎯 Tips for Fast Billing

1. **Use Partial Search**
   - Type "vit" for Vitamin D
   - Type "lip" for Lipid Profile
   - Type "cbc" for Complete Blood Count

2. **Check Pending Orders**
   - System auto-detects pending tests
   - Auto-adds them to invoice
   - No need to search again

3. **Keyboard Shortcuts**
   - Tab: Move between fields
   - Enter: Select from dropdown
   - Type: Instant search

4. **Clear Search After Adding**
   - Search box clears automatically
   - Ready for next item immediately

---

## 📞 Need Help?

### Common Issues

**Q: Patient not found?**
- A: Register patient first in OPD

**Q: Test not showing in search?**
- A: Check if test is active in Lab Test Catalog

**Q: Medicine out of stock?**
- A: Shows "No stock available" - need to purchase

**Q: Can't generate invoice?**
- A: Check if all required fields are filled

---

## ✅ After Invoice Generation

1. **Invoice Created** - Bill number assigned
2. **Payment Recorded** - Marked as PAID
3. **Lab Request Created** - Status: PAID_PENDING_SAMPLE
4. **Patient Notified** - Can proceed to sample collection
5. **Print Available** - Invoice can be printed

---

**Quick Access:** `/dashboard/finance/billing/create`

**For Walk-in Lab Billing:** Just select patient, search test, click, and generate! 🚀
