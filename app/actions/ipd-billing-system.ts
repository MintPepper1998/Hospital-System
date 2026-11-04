"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { resolveFinancialAccount } from "@/lib/payment-routing"
import { resolveAccountGroupCode } from "@/lib/account-group-resolver"

export async function createIPDCharge(formData: FormData) {
  try {
    const admissionId = formData.get("admissionId") as string
    const description = formData.get("description") as string
    const amount = parseFloat(formData.get("amount") as string)
    const category = formData.get("category") as string // BED, LAB, PHARMACY, OTHER

    if (!admissionId || !description || isNaN(amount)) {
      return { success: false, message: "Missing required fields" }
    }

    const admission = await prisma.iPDAdmission.findUnique({
      where: { id: admissionId },
    })

    if (!admission) {
      return { success: false, message: "Admission not found" }
    }

    // Since a Billing is the parent container, we either create one for this charge,
    // or add to an existing one. For simplicity, we can create a new Billing record
    // for each individual charge OR group them. For IPD, we usually have one running bill.
    
    // Let's find an existing PENDING bill for this admission, or create a new one.
    let bill = await prisma.billing.findFirst({
      where: { 
        ipdAdmissionId: admissionId,
        status: "PENDING"
      }
    })

    if (!bill) {
      const billNumber = `BIL-${Date.now()}`
      bill = await prisma.billing.create({
        data: {
          billNumber,
          patientId: admission.patientId,
          ipdAdmissionId: admissionId,
          type: "IPD",
          totalAmount: 0,
          netAmount: 0,
          balanceAmount: 0,
          status: "PENDING",
        }
      })
    }

    // Now add the item
    const item = await prisma.billingItem.create({
      data: {
        billingId: bill.id,
        description,
        quantity: 1,
        unitPrice: amount,
        amount: amount,
        totalAmount: amount,
      }
    })

    // Update the bill totals
    await prisma.billing.update({
      where: { id: bill.id },
      data: {
        totalAmount: { increment: amount },
        netAmount: { increment: amount },
        balanceAmount: { increment: amount },
      }
    })

    // Update the running total on the Admission itself
    const updateData: any = {
      totalCharges: { increment: amount },
      totalBillAmount: { increment: amount },
      balanceDue: { increment: amount }
    }
    
    if (category === "BED") updateData.totalBedCharges = { increment: amount }
    else if (category === "LAB") updateData.totalLabCharges = { increment: amount }
    else if (category === "PHARMACY") updateData.totalPharmacyCharges = { increment: amount }
    else updateData.totalOtherCharges = { increment: amount }

    await prisma.iPDAdmission.update({
      where: { id: admissionId },
      data: updateData
    })

    revalidatePath(`/dashboard/finance/ipd-billing/${admissionId}`)
    revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
    
    return { success: true }
  } catch (error: any) {
    console.error("Error creating IPD charge:", error)
    return { success: false, message: error.message }
  }
}

export async function recordIPDPayment(formData: FormData) {
  try {
    const admissionId = formData.get("admissionId") as string
    const billingId = formData.get("billingId") as string
    const amount = parseFloat(formData.get("amount") as string)
    const paymentMethod = formData.get("paymentMethod") as string
    const transactionId = formData.get("transactionId") as string

    if (!admissionId || !billingId || isNaN(amount)) {
      return { success: false, message: "Missing required fields" }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create payment record
      await tx.payment.create({
        data: {
          billingId,
          amount,
          paymentMethod,
          transactionId,
          paymentDate: new Date(),
        }
      })

      // 2. Update Billing totals
      const bill = await tx.billing.update({
        where: { id: billingId },
        data: {
          paidAmount: { increment: amount },
          balanceAmount: { decrement: amount },
        }
      })

      if (bill.balanceAmount <= 0) {
        await tx.billing.update({
          where: { id: billingId },
          data: { status: "PAID" }
        })
      }

      // 3. Update Admission totals
      await tx.iPDAdmission.update({
        where: { id: admissionId },
        data: {
          amountPaid: { increment: amount },
          balanceDue: { decrement: amount },
        }
      })

      // 4. Create ledger transaction + update account balance
      const accountId = await resolveFinancialAccount(tx, paymentMethod)
      if (accountId) {
        const accountGroupCode = resolveAccountGroupCode("INCOME", "IPD_PAYMENT", "IPD")
        await tx.transaction.create({
          data: {
            accountId,
            type: "INCOME",
            amount,
            category: "IPD_PAYMENT",
            paymentMethod,
            referenceId: billingId,
            description: `IPD payment for admission ${admissionId}`,
            accountGroupCode,
            billingType: "IPD",
          },
        })
        await tx.financialAccount.update({
          where: { id: accountId },
          data: { currentBalance: { increment: amount } },
        })
      }
    })

    revalidatePath(`/dashboard/finance/ipd-billing/${admissionId}`)
    revalidatePath(`/dashboard/ipd/patient/${admissionId}`)
    
    return { success: true }
  } catch (error: any) {
    console.error("Error recording IPD payment:", error)
    return { success: false, message: error.message }
  }
}
