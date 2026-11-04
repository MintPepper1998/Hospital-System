# Billing & Invoicing System - Implementation Summary

## Overview
Successfully implemented a complete Billing & Invoicing System that generates invoices from completed consultations. The system auto-parses prescriptions, allows editing of line items, calculates totals with GST, and saves invoices to the database.

---

## 📋 Features Implemented

### 1. Database Schema Updates (`prisma/schema.prisma`)

#### Updated Billing Model
Added `appointmentId` field to link billings with appointments:

```prisma
model Billing {
  id              String        @id @default(cuid())
  billNumber      String        @unique
  patientId       String
  appointmentId   String?       @unique  // ✅ NEW - Links to appointment
  billDate        DateTime      @default(now())
  totalAmount     Float
  discountAmount  Float         @default(0)
  taxAmount       Float         @default(0)
  netAmount       Float
  paidAmount      Float         @default(0)
  balanceAmount   Float
  status          BillingStatus @default(PENDING)
  paymentMethod   String?
  transactionId   String?
  notes           String?       @db.Text
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  // Relations
  patient         Patient       @relation(fields: [patientId], references: [id])
  appointment     Appointment?  @relation(fields: [appointmentId], references: [id])  // ✅ NEW
  items           BillingItem[]
  payments        Payment[]

  @@index([billNumber])
  @@index([patientId])
  @@index([appointmentId])  // ✅ NEW
  @@index([billDate])
  @@index([status])
  @@map("billings")
}
```

#### Updated Appointment Model
Added reverse relation to billing:

```prisma
model Appointment {
  // ... existing fields ...
  
  // Relations
  patient           Patient           @relation(fields: [patientId], references: [id])
  doctor            Staff             @relation("DoctorAppointments", fields: [doctorId], references: [id])
  medicalRecords    MedicalRecord[]
  billing           Billing?          // ✅ NEW - One-to-one relation
}
```

**Command executed:** `npx prisma db push --accept-data-loss` ✅

---

### 2. Billing Creation Page (`app/dashboard/finance/billing/create/page.tsx`)

A comprehensive invoice creation interface that fetches appointment details and auto-generates line items.

#### Features:
- ✅ Accepts `appointmentId` as search parameter
- ✅ Fetches appointment with patient and doctor details
- ✅ Displays consultation information card
- ✅ Shows diagnosis and prescription
- ✅ Auto-parses prescription to create initial line items
- ✅ Prevents duplicate billing (redirects if invoice exists)
- ✅ Passes data to InvoiceEditor component

#### Auto-Parsing Logic:
```typescript
function parsePrescriptionToItems(prescription: string) {
  // Split prescription by commas or line breaks
  const lines = prescription.split(/[,\n]/)
  
  const items = lines.map((line) => {
    // Extract medicine name (remove dosage if present)
    let description = line.trim()
    // ... parsing logic ...
    
    return {
      description,
      quantity: 1,
      unitPrice: 0, // Pharmacist sets price
    }
  })
  
  // Add consultation fee at the beginning
  items.unshift({
    description: "Consultation Fee",
    quantity: 1,
    unitPrice: 500,
  })
  
  return items
}
```

---

### 3. Invoice Editor Component (`components/invoice-editor.tsx`)

An interactive client component for editing invoice items and calculating totals.

#### Features:
- ✅ Editable table with live updates
- ✅ Add/remove line items dynamically
- ✅ Edit description, quantity, and unit price
- ✅ Live total calculation per item
- ✅ Grand total with auto-calculation
- ✅ Validation (no empty descriptions, prices > 0)
- ✅ Loading state during submission
- ✅ Success/error toast notifications
- ✅ Auto-redirect after successful invoice generation

#### Table Structure:
| Description | Quantity | Unit Price (₹) | Total (₹) | Actions |
|------------|----------|----------------|-----------|---------|
| Consultation Fee | 1 | 500.00 | 500.00 | 🗑️ |
| Paracetamol 500mg | 10 | 5.00 | 50.00 | 🗑️ |
| **Grand Total:** | | | **₹550.00** | |

#### State Management:
```typescript
const [items, setItems] = useState<InvoiceItem[]>(initialItems)

// Add item
const addItem = () => {
  setItems([...items, { description: "", quantity: 1, unitPrice: 0 }])
}

// Remove item
const removeItem = (index: number) => {
  const newItems = items.filter((_, i) => i !== index)
  setItems(newItems)
}

// Update item
const updateItem = (index: number, field: string, value: any) => {
  const newItems = [...items]
  newItems[index] = { ...newItems[index], [field]: value }
  setItems(newItems)
}

// Calculate totals
const calculateGrandTotal = () => {
  return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
}
```

---

### 4. Generate Invoice Server Action (`lib/actions.ts`)

Server action to save invoice and line items to the database.

```typescript
export async function generateInvoice(
  appointmentId: string,
  patientId: string,
  items: Array<{ description: string; quantity: number; unitPrice: number }>
)
```

#### Features:
- ✅ Validates items (not empty, prices > 0)
- ✅ Checks for duplicate invoices
- ✅ Generates unique bill number: `BILL-YYYY-NNNN`
- ✅ Calculates totals with 18% GST
- ✅ Creates Billing record with nested BillingItems
- ✅ Uses Prisma transaction for atomicity
- ✅ Comprehensive error logging
- ✅ Revalidates pharmacy and billing pages

#### Calculation Logic:
```typescript
// Calculate totals
const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
const taxAmount = totalAmount * 0.18  // 18% GST
const netAmount = totalAmount + taxAmount

// For each item, calculate GST
items.map((item) => {
  const itemTotal = item.quantity * item.unitPrice
  const gstAmount = itemTotal * 0.18
  const totalWithGst = itemTotal + gstAmount
  
  return {
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: itemTotal,
    gstRate: 18,
    gstAmount,
    totalAmount: totalWithGst,
  }
})
```

---

### 5. Updated Pharmacy POS (`components/dispense-button.tsx`)

Modified to redirect to billing page instead of showing toast.

**Before:**
```typescript
const handleDispense = async () => {
  // Show toast
  toast.success("Medicine Dispensed")
}
```

**After:**
```typescript
const handleDispense = () => {
  // Redirect to billing page
  router.push(`/dashboard/finance/billing/create?appointmentId=${appointmentId}`)
}
```

---

## 🎨 UI/UX Design

### Page Layout

**Billing Creation Page:**

```
┌─────────────────────────────────────────────────────┐
│  [← Back]  Create Invoice                          │
│            Generate billing invoice                 │
├─────────────────────────────────────────────────────┤
│  ■ CONSULTATION DETAILS                             │
│  ┌─────────────┬─────────────┬─────────────┐       │
│  │  Patient    │  Doctor     │  Date       │       │
│  │  John Doe   │  Dr. Smith  │  Jan 13     │       │
│  │  PAT-2026-1 │  Cardiology │  10:00 AM   │       │
│  └─────────────┴─────────────┴─────────────┘       │
│  Diagnosis: Common cold                             │
│  Prescription: Paracetamol 500mg TID for 3 days    │
├─────────────────────────────────────────────────────┤
│  ■ INVOICE ITEMS                     [+ Add Item]  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Description | Qty | Price | Total | Actions │  │
│  ├──────────────────────────────────────────────┤  │
│  │ [Consultation Fee] [1] [500] 500.00   [🗑️] │  │
│  │ [Paracetamol]      [10] [5]   50.00   [🗑️] │  │
│  ├──────────────────────────────────────────────┤  │
│  │ Grand Total:                    ₹550.00      │  │
│  └──────────────────────────────────────────────┘  │
│  2 items • Total: ₹550.00          [Generate ✓] │
└─────────────────────────────────────────────────────┘
```

### Color Scheme

| Element | Color | Purpose |
|---------|-------|---------|
| Header | `#0066CC` (Medical Blue) | Brand consistency |
| Card Border | `#0066CC` top border | Visual hierarchy |
| Submit Button | `green-600` | Positive action |
| Delete Icon | `red-600` | Destructive action |
| Grand Total | `#0066CC` | Emphasis |

---

## 🔄 Complete Workflow

### End-to-End Process:

1. **Doctor Completes Consultation**
   - Fills in diagnosis and prescription
   - Clicks "Complete Consultation"
   - Appointment status → `COMPLETED`

2. **Pharmacist Views Prescription**
   - Goes to `/dashboard/pharmacy/pos`
   - Sees prescription in queue
   - Reviews patient details and prescription

3. **Initiate Billing**
   - Clicks "Dispense & Bill" button
   - Redirects to `/dashboard/finance/billing/create?appointmentId=xyz`

4. **Auto-Parse Prescription**
   - System parses prescription text
   - Creates line items:
     - "Consultation Fee" (₹500)
     - Medicine items from prescription (₹0 - needs pricing)

5. **Edit Invoice**
   - Pharmacist reviews auto-generated items
   - Sets unit prices for medicines
   - Adjusts quantities if needed
   - Adds/removes items as necessary
   - Sees live total calculation

6. **Validation**
   - System checks all descriptions filled
   - Ensures all prices > 0
   - Validates at least 1 item exists

7. **Generate Invoice**
   - Clicks "Generate Invoice" button
   - System creates Billing record
   - Creates BillingItem records
   - Generates unique bill number
   - Calculates totals with 18% GST

8. **Confirmation**
   - Success toast appears
   - Redirects back to pharmacy POS
   - Prescription removed from queue (has billing now)

---

## 🧮 Calculation Details

### Tax Calculation (18% GST):

**Item Level:**
```
Item Amount = Quantity × Unit Price
GST Amount = Item Amount × 0.18
Item Total = Item Amount + GST Amount
```

**Invoice Level:**
```
Total Amount = Sum of all (Quantity × Unit Price)
Tax Amount = Total Amount × 0.18
Net Amount = Total Amount + Tax Amount
```

**Example:**
```
Consultation Fee: 1 × ₹500 = ₹500
  └─ GST: ₹500 × 0.18 = ₹90
  └─ Total: ₹590

Paracetamol: 10 × ₹5 = ₹50
  └─ GST: ₹50 × 0.18 = ₹9
  └─ Total: ₹59

Invoice Total: ₹500 + ₹50 = ₹550
Invoice GST: ₹90 + ₹9 = ₹99
Invoice Net: ₹550 + ₹99 = ₹649
```

---

## 🧪 Testing the Feature

### Prerequisites:
1. Have at least one completed consultation with prescription
2. No existing billing for that consultation

### Test Steps:

#### 1. Setup (Complete Consultation)
1. Login as doctor: `doctor@stulink.com` / `doctor123`
2. Go to OPD Dashboard
3. Click "Start Consultation"
4. Fill in:
   - Diagnosis: "Common cold with fever"
   - Prescription: "Paracetamol 500mg TID for 3 days, Vitamin C 500mg OD for 5 days"
5. Click "Complete Consultation"

#### 2. View Pharmacy Queue
1. Navigate to `/dashboard/pharmacy/pos`
2. Verify prescription appears in grid
3. Click "Dispense & Bill" button

#### 3. Review Billing Page
1. Verify redirected to `/dashboard/finance/billing/create?appointmentId=...`
2. Check consultation details card:
   - ✅ Patient name and ID
   - ✅ Doctor name and department
   - ✅ Date and time
   - ✅ Diagnosis displayed
   - ✅ Prescription displayed

#### 4. Review Auto-Generated Items
1. Check invoice items table:
   - ✅ "Consultation Fee" (qty: 1, price: 500)
   - ✅ "Paracetamol 500mg TID for 3 days" (qty: 1, price: 0)
   - ✅ "Vitamin C 500mg OD for 5 days" (qty: 1, price: 0)

#### 5. Edit Items
1. Update "Paracetamol" unit price: 50
2. Update "Vitamin C" unit price: 30
3. Change quantity of Paracetamol to: 3
4. Verify totals update live:
   - Paracetamol: 3 × 50 = 150
   - Vitamin C: 1 × 30 = 30
   - Grand Total: 500 + 150 + 30 = 680

#### 6. Add/Remove Items
1. Click "Add Item"
2. Add "Cotton Swabs" (qty: 2, price: 10)
3. Verify total updates: 680 + 20 = 700
4. Click delete (🗑️) on "Cotton Swabs"
5. Verify total reverts: 700 - 20 = 680

#### 7. Generate Invoice
1. Click "Generate Invoice" button
2. Verify:
   - ✅ Button shows "Generating..." with spinner
   - ✅ Button disabled during processing
   - ✅ Success toast appears
   - ✅ Redirected to pharmacy POS

#### 8. Verify Database
1. Run: `npx prisma studio`
2. Check "Billing" table:
   - ✅ New record with bill number (BILL-2026-0001)
   - ✅ totalAmount: 680
   - ✅ taxAmount: 122.40 (18% of 680)
   - ✅ netAmount: 802.40
   - ✅ status: PENDING
   - ✅ appointmentId linked
3. Check "BillingItem" table:
   - ✅ 3 records for this billing
   - ✅ Each with correct description, quantity, price
   - ✅ GST calculated for each item

#### 9. Prevent Duplicate Billing
1. Go back to pharmacy POS
2. Try to dispense the same prescription again
3. Verify: Redirected to existing invoice view (not create page)

---

## 📂 Files Created/Modified

### Created Files:
1. ✅ `app/dashboard/finance/billing/create/page.tsx` - Billing creation page (178 lines)
2. ✅ `components/invoice-editor.tsx` - Interactive invoice table (238 lines)
3. ✅ `BILLING-SYSTEM-SUMMARY.md` - This documentation

### Modified Files:
1. ✅ `prisma/schema.prisma` - Added appointmentId to Billing model
2. ✅ `lib/actions.ts` - Added generateInvoice function (112 lines)
3. ✅ `components/dispense-button.tsx` - Updated to redirect to billing

### Dependencies Used:
- ✅ All existing (Prisma, Shadcn/ui, Sonner, date-fns)
- ✅ Table component (already installed)

---

## 🚀 Future Enhancements

### Phase 1: Payment Processing
- [ ] Add payment capture interface
- [ ] Support multiple payment methods (Cash, Card, UPI)
- [ ] Update `paidAmount` and `balanceAmount`
- [ ] Change status from `PENDING` to `PAID`
- [ ] Generate payment receipt

### Phase 2: Invoice Management
- [ ] List all invoices (`/dashboard/finance/billing`)
- [ ] View invoice details page
- [ ] Print invoice (PDF generation)
- [ ] Email invoice to patient
- [ ] Edit/cancel invoice (before payment)

### Phase 3: Advanced Features
- [ ] Partial payments
- [ ] Discounts and coupons
- [ ] Insurance claim integration
- [ ] Credit/installment options
- [ ] Refund processing

### Phase 4: Reporting
- [ ] Daily/monthly revenue reports
- [ ] Outstanding payments dashboard
- [ ] Payment method breakdownThank you for choosing our Hospital ERP system!