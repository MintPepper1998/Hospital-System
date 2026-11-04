import { PrismaClient, Role, Gender, AppointmentStatus, BillingStatus, BillingType, PaymentMethod, BedStatus, IPDAdmissionStatus, DischargeType, IPDPharmacyStatus, IPDPrescriptionStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// --- Helpers ---
const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const randomDate = (start: Date, end: Date) => new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
const addDays = (date: Date, days: number) => { const d = new Date(date); d.setDate(d.getDate() + days); return d }

async function main() {
  console.log("🚀 Starting fresh demo data seed...")

  const passwordHash = await bcrypt.hash('password123', 10)

  // ==========================================
  // 1. STAFF & USERS
  // ==========================================
  console.log("👨‍⚕️ Creating Staff & Users...")

  const doctors = [
    { name: 'Dr. Rajesh Kumar', email: 'rajesh@hospital.com', spec: 'Cardiology', dept: 'Cardiology', fee: 1000 },
    { name: 'Dr. Sunita Sharma', email: 'sunita@hospital.com', spec: 'Neurology', dept: 'Neurology', fee: 1200 },
    { name: 'Dr. Amit Patel', email: 'amit@hospital.com', spec: 'Orthopedics', dept: 'Orthopedics', fee: 800 },
    { name: 'Dr. Kavita Singh', email: 'kavita@hospital.com', spec: 'General Medicine', dept: 'General Medicine', fee: 500 },
    { name: 'Dr. Suresh Reddy', email: 'suresh@hospital.com', spec: 'Pediatrics', dept: 'Pediatrics', fee: 600 },
  ]

  const createdDoctors = []
  for (let i = 0; i < doctors.length; i++) {
    const d = doctors[i]
    const user = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: { email: d.email, password: passwordHash, name: d.name, role: 'DOCTOR', isActive: true }
    })
    const staff = await prisma.staff.upsert({
      where: { employeeId: `DOC${String(i + 1).padStart(3, '0')}` },
      update: { consultationFee: d.fee },
      create: {
        userId: user.id,
        employeeId: `DOC${String(i + 1).padStart(3, '0')}`,
        department: d.dept,
        specialization: d.spec,
        designation: 'Senior Consultant',
        consultationFee: d.fee,
        basicSalary: 150000
      }
    })
    createdDoctors.push(staff)
  }

  // ==========================================
  // 2. FINANCIAL ACCOUNTS
  // ==========================================
  console.log("🏦 Creating Financial Accounts...")
  
  const mainAccount = await prisma.financialAccount.create({
    data: {
      name: 'Main Hospital Bank Account',
      type: 'BANK',
      openingBalance: 5000000,
      currentBalance: 5000000
    }
  })

  // ==========================================
  // 3. WARDS & BEDS
  // ==========================================
  console.log("🛏️ Creating Wards & Beds...")
  
  const wardTypes = [
    { name: 'General Male Ward', type: 'General', capacity: 20, price: 1000 },
    { name: 'ICU', type: 'ICU', capacity: 10, price: 5000 },
  ]

  const createdBeds = []
  for (const wt of wardTypes) {
    const existingWard = await prisma.ward.findFirst({ where: { name: wt.name } })
    const ward = existingWard || await prisma.ward.create({
      data: { name: wt.name, type: wt.type, capacity: wt.capacity }
    })
    
    for (let i = 1; i <= wt.capacity; i++) {
      const bedNum = `${wt.name.substring(0, 3).toUpperCase()}-${i}`
      const existingBed = await prisma.bed.findFirst({ where: { wardId: ward.id, bedNumber: bedNum }})
      if (!existingBed) {
        const bed = await prisma.bed.create({
          data: {
            wardId: ward.id,
            bedNumber: bedNum,
            pricePerDay: wt.price,
            status: 'AVAILABLE'
          }
        })
        createdBeds.push(bed)
      } else {
        createdBeds.push(existingBed)
      }
    }
  }

  // ==========================================
  // 4. INVENTORY & PHARMACY
  // ==========================================
  console.log("💊 Creating Medicines & Inventory...")

  const supplier = await prisma.supplier.upsert({
    where: { name: 'Medico Pharma Distributors' },
    update: {},
    create: { name: 'Medico Pharma Distributors', contactPerson: 'Vijay', phone: '9876543210', email: 'supply@medico.com', isActive: true }
  })

  const medicinesData = [
    { name: 'Paracetamol', strength: '500mg', genericName: 'Paracetamol', type: 'TABLET', unitPrice: 2.5, minStockLevel: 50, purchasePrice: 1.5 },
    { name: 'Amoxicillin', strength: '250mg', genericName: 'Amoxicillin', type: 'CAPSULE', unitPrice: 8.0, minStockLevel: 50, purchasePrice: 4.0 },
    { name: 'Pantoprazole', strength: '40mg', genericName: 'Pantoprazole', type: 'TABLET', unitPrice: 6.0, minStockLevel: 50, purchasePrice: 3.0 },
    { name: 'Cough Syrup', strength: '100ml', genericName: 'Dextromethorphan', type: 'SYRUP', unitPrice: 85.0, minStockLevel: 20, purchasePrice: 45.0 },
  ]

  const createdMedicines = []
  for (const md of medicinesData) {
    const existing = await prisma.medicine.findUnique({ where: { name_strength: { name: md.name, strength: md.strength } } })
    const med = existing || await prisma.medicine.create({
      data: {
        name: md.name, strength: md.strength, genericName: md.genericName,
        manufacturer: 'PharmaCorp', type: md.type as any,
        unitPrice: md.unitPrice, minStockLevel: md.minStockLevel, isActive: true
      }
    })
    createdMedicines.push(med)
  }

  // Purchase Invoices
  const now = new Date()
  const threeMonthsAgo = addDays(now, -90)

  for (let i = 0; i < 5; i++) {
    const invDate = randomDate(threeMonthsAgo, now)
    
    const invoice = await prisma.purchaseInvoice.create({
      data: {
        invoiceNumber: `INV-PH-${invDate.getTime()}`,
        supplierId: supplier.id,
        date: invDate,
        subTotal: 0,
        grandTotal: 0,
        amountPaid: 0,
        status: 'PAID'
      }
    })

    let invoiceTotal = 0
    for (const med of createdMedicines) {
      const qty = randomInt(100, 500)
      const isExpired = Math.random() > 0.8
      const batchExpiry = isExpired ? addDays(now, -randomInt(5, 30)) : addDays(now, randomInt(100, 365))
      const medData = medicinesData.find(m => m.name === med.name)!
      
      const itemCost = qty * medData.purchasePrice
      invoiceTotal += itemCost

      await prisma.purchaseItem.create({
        data: {
          invoiceId: invoice.id,
          medicineId: med.id,
          itemName: med.name,
          batchNumber: `B-${invDate.getTime()}-${med.id.substring(0, 4)}`,
          expiryDate: batchExpiry,
          quantity: qty,
          rate: medData.purchasePrice,
          sellPrice: med.unitPrice,
          totalAmount: itemCost
        }
      })

      await prisma.inventoryBatch.create({
        data: {
          medicineId: med.id,
          batchNumber: `B-${invDate.getTime()}-${med.id.substring(0, 4)}`,
          supplierId: supplier.id,
          expiryDate: batchExpiry,
          quantity: isExpired ? randomInt(10, 50) : qty,
          originalQuantity: qty,
          purchasePrice: medData.purchasePrice,
          sellingPrice: med.unitPrice,
          isExpired: isExpired,
          isActive: true
        }
      })
    }

    await prisma.purchaseInvoice.update({
      where: { id: invoice.id },
      data: { subTotal: invoiceTotal, grandTotal: invoiceTotal, amountPaid: invoiceTotal }
    })
    
    await prisma.transaction.create({
      data: {
        date: invDate,
        amount: invoiceTotal,
        type: 'EXPENSE',
        category: 'PURCHASE_MEDICINE',
        paymentMethod: 'BANK_TRANSFER',
        referenceId: invoice.id,
        description: `Payment for Purchase Invoice ${invoice.invoiceNumber}`,
        accountId: mainAccount.id
      }
    })
  }

  // ==========================================
  // 5. GENERAL EXPENSES
  // ==========================================
  console.log("💸 Creating General Expenses...")
  
  const expenseCategories = ['UTILITY_BILL', 'MAINTENANCE', 'RENT', 'OFFICE_SUPPLIES', 'MISC']
  for (let i = 0; i < 20; i++) {
    const expDate = randomDate(threeMonthsAgo, now)
    await prisma.transaction.create({
      data: {
        date: expDate,
        amount: randomInt(2000, 15000),
        type: 'EXPENSE',
        category: randomItem(expenseCategories),
        paymentMethod: randomItem(['CASH', 'UPI', 'BANK_TRANSFER']),
        description: `Routine expense ${i}`,
        accountId: mainAccount.id
      }
    })
  }

  await prisma.capitalExpense.create({
    data: {
      description: 'Purchase of new MRI Machine for Radiology department',
      category: 'MEDICAL_EQUIPMENT',
      amount: 1500000,
      date: addDays(now, -45),
      vendor: 'GE Healthcare',
      notes: 'Paid via BANK_TRANSFER, 10% depreciation over 10 years'
    }
  })

  // ==========================================
  // 6. PATIENTS & BILLING (REVENUE)
  // ==========================================
  console.log("🩺 Creating Patients & Billing...")

  const patientNames = ['Ankit Sharma', 'Priya Singh', 'Rahul Verma', 'Sneha Gupta', 'Vikram Patel']
  
  for (let i = 0; i < 20; i++) {
    const pName = i < patientNames.length ? patientNames[i] : `Patient ${i}`
    const pEmail = `patient${i}_${Date.now()}@demo.com`
    const pId = `PAT2024${String(i).padStart(3, '0')}${Date.now().toString().slice(-4)}`
    
    const user = await prisma.user.create({
      data: { email: pEmail, name: pName, role: 'PATIENT', isActive: true }
    })

    const patient = await prisma.patient.create({
      data: {
        userId: user.id,
        patientId: pId,
        gender: randomItem(['MALE', 'FEMALE']),
        phone: `98765${String(i).padStart(5, '0')}`
      }
    })

    const visitDate = randomDate(threeMonthsAgo, now)
    const doctor = randomItem(createdDoctors)
    const isIPD = Math.random() > 0.7

    if (isIPD) {
      const bed = randomItem(createdBeds.filter(b => b.status === 'AVAILABLE'))
      const stayDays = randomInt(2, 10)
      const dischargeDate = addDays(visitDate, stayDays)
      const isDischarged = dischargeDate < now

      const admission = await prisma.iPDAdmission.create({
        data: {
          patientId: patient.id,
          bedId: bed.id,
          primaryDoctorId: doctor.id,
          admissionDate: visitDate,
          dischargeDate: isDischarged ? dischargeDate : null,
          status: isDischarged ? 'DISCHARGED' : 'ADMITTED',
          initialDeposit: 10000,
          totalCharges: stayDays * bed.pricePerDay + 5000,
          reason: 'Fever and weakness',
          totalBedCharges: stayDays * bed.pricePerDay,
          totalPharmacyCharges: 5000,
          totalBillAmount: stayDays * bed.pricePerDay + 5000,
          amountPaid: stayDays * bed.pricePerDay + 5000,
          balanceDue: 0
        }
      })

      const ipdBill = await prisma.billing.create({
        data: {
          billNumber: `BILL-IPD-${Date.now()}-${i}`,
          patientId: patient.id,
          type: 'IPD',
          status: 'PAID',
          totalAmount: admission.totalBillAmount,
          netAmount: admission.totalBillAmount,
          paidAmount: admission.totalBillAmount,
          balanceAmount: 0,
          paymentMethod: 'CARD',
          billDate: isDischarged ? dischargeDate : now,
        }
      })

      await prisma.transaction.create({
        data: {
          date: ipdBill.billDate,
          amount: ipdBill.netAmount,
          type: 'INCOME',
          category: 'BILL_PAYMENT_IPD',
          paymentMethod: 'CARD',
          referenceId: ipdBill.id,
          description: `IPD Bill Payment`,
          accountId: mainAccount.id
        }
      })

      const pharmacyBill = await prisma.billing.create({
        data: {
          billNumber: `BILL-PH-${Date.now()}-${i}`,
          patientId: patient.id,
          type: 'PHARMACY',
          status: 'PAID',
          totalAmount: 5000,
          netAmount: 5000,
          paidAmount: 5000,
          balanceAmount: 0,
          paymentMethod: 'CARD',
          billDate: visitDate,
        }
      })

      for (let m = 0; m < 2; m++) {
        const med = randomItem(medicinesData)
        const qty = randomInt(1, 10)
        await prisma.billingItem.create({
          data: {
            billingId: pharmacyBill.id,
            description: med.name,
            quantity: qty,
            unitPrice: med.unitPrice,
            amount: qty * med.unitPrice,
            totalAmount: qty * med.unitPrice
          }
        })
      }

      await prisma.transaction.create({
        data: {
          date: pharmacyBill.billDate,
          amount: pharmacyBill.netAmount,
          type: 'INCOME',
          category: 'BILL_PAYMENT_PHARMACY',
          paymentMethod: 'CARD',
          referenceId: pharmacyBill.id,
          description: `Pharmacy Bill Payment`,
          accountId: mainAccount.id
        }
      })
    } else {
      const appt = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          appointmentDate: visitDate,
          appointmentTime: '10:00 AM',
          status: 'COMPLETED',
          reason: 'General Checkup',
        }
      })

      const opdBill = await prisma.billing.create({
        data: {
          billNumber: `BILL-OPD-${Date.now()}-${i}`,
          patientId: patient.id,
          appointmentId: appt.id,
          type: 'OPD',
          status: 'PAID',
          totalAmount: doctor.consultationFee,
          netAmount: doctor.consultationFee,
          paidAmount: doctor.consultationFee,
          balanceAmount: 0,
          paymentMethod: 'UPI',
          billDate: visitDate,
        }
      })

      await prisma.billingItem.create({
        data: {
          billingId: opdBill.id,
          description: 'OPD Consultation Fee',
          quantity: 1,
          unitPrice: doctor.consultationFee,
          amount: doctor.consultationFee,
          totalAmount: doctor.consultationFee
        }
      })

      await prisma.transaction.create({
        data: {
          date: opdBill.billDate,
          amount: opdBill.netAmount,
          type: 'INCOME',
          category: 'BILL_PAYMENT_OPD',
          paymentMethod: 'UPI',
          referenceId: opdBill.id,
          description: `OPD Consultation Payment`,
          accountId: mainAccount.id
        }
      })
    }
  }

  console.log("✅ Seed completed successfully!")
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
