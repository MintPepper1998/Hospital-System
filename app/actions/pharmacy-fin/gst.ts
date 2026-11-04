"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { DateRange } from "@/lib/pharmacy-finance/dates"
import { pharmacySalesWhere } from "@/lib/pharmacy-finance/scope"
import { supplierScopeFilter } from "@/lib/supplier-scope"

export interface GstRateBucket {
  rate: number
  taxableValue: number
  cgst: number
  sgst: number
  totalTax: number
  totalValue: number
  lineCount: number
}

export interface GstHsnRow {
  hsnCode: string
  description: string
  quantity: number
  taxableValue: number
  cgst: number
  sgst: number
  totalTax: number
  totalValue: number
}

export interface GstSummaryData {
  settings: {
    pharmacyName: string
    gstNo: string | null
    drugLicense: string | null
    address: string | null
  }
  // Executive KPI figures
  kpis: {
    taxableTurnover: number
    grossSalesTax: number
    salesReturnTax: number
    netOutputTax: number
    netOutputCgst: number
    netOutputSgst: number

    taxablePurchases: number
    grossPurchaseItc: number
    purchaseReturnItc: number
    netEligibleItc: number
    netInputCgst: number
    netInputSgst: number

    netTaxPayable: number // > 0: Payable, < 0: Credit Carried Forward
    isPayable: boolean
  }
  // Rate-wise Outward Tax (Sales)
  outwardRateSummary: GstRateBucket[]
  // Rate-wise Inward ITC (Purchases)
  inwardRateSummary: GstRateBucket[]
  // Rate-by-rate 3B Reconciliation
  reconciliation: {
    rate: number
    outputTax: number
    returnTax: number
    netOutput: number
    eligibleItc: number
    netBalance: number
  }[]
  // HSN-wise Summary (GSTR-1 Table 12)
  hsnSummary: GstHsnRow[]
  // Recent Outward Invoices preview (up to 50)
  outwardInvoices: {
    id: string
    billNumber: string
    date: string
    customerName: string
    channel: string
    taxableValue: number
    cgst: number
    sgst: number
    totalTax: number
    netAmount: number
  }[]
  // Recent Inward Invoices preview (up to 50)
  inwardInvoices: {
    id: string
    invoiceNumber: string
    date: string
    supplierName: string
    gstNumber: string | null
    taxableValue: number
    inputCgst: number
    inputSgst: number
    totalItc: number
    grandTotal: number
  }[]
}

const STANDARD_RATES = [0, 5, 12, 18, 28]

export async function getGstSummary(range: DateRange): Promise<GstSummaryData> {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])

  // 1. Fetch pharmacy settings / GST identity
  const hospitalSettings = await prisma.hospitalSettings.findFirst({
    select: {
      pharmacyName: true,
      pharmacyGstNo: true,
      pharmacyDrugLicense: true,
      pharmacyAddress: true,
      gstNo: true,
      address: true,
    },
  })

  const settings = {
    pharmacyName: hospitalSettings?.pharmacyName || "Shree Kamal Pharmacy",
    gstNo: hospitalSettings?.pharmacyGstNo || hospitalSettings?.gstNo || null,
    drugLicense: hospitalSettings?.pharmacyDrugLicense || null,
    address: hospitalSettings?.pharmacyAddress || hospitalSettings?.address || null,
  }

  // 2. Fetch Sales (Outward Supplies)
  const salesBills = await prisma.billing.findMany({
    where: pharmacySalesWhere(range),
    select: {
      id: true,
      billNumber: true,
      billDate: true,
      totalAmount: true,
      taxAmount: true,
      netAmount: true,
      discountAmount: true,
      ipdAdmissionId: true,
      emergencyVisitId: true,
      casualtyVisitId: true,
      appointmentId: true,
      paymentMethod: true,
      pharmacyCustomer: { select: { name: true, phone: true } },
      patient: { select: { user: { select: { name: true } } } },
      items: {
        select: {
          id: true,
          description: true,
          quantity: true,
          unitPrice: true,
          amount: true,
          gstRate: true,
          gstAmount: true,
          totalAmount: true,
          referenceId: true,
        },
      },
    },
    orderBy: { billDate: "desc" },
  })

  // Batch query medicine details for HSN codes
  const medicineIds = Array.from(
    new Set(salesBills.flatMap((b) => b.items.map((i) => i.referenceId).filter(Boolean)))
  ) as string[]

  const medicines = medicineIds.length > 0
    ? await prisma.medicine.findMany({
        where: { id: { in: medicineIds } },
        select: { id: true, name: true, hsnCode: true, type: true, genericName: true },
      })
    : []

  const medicineMap = new Map(medicines.map((m) => [m.id, m]))

  // 3. Fetch Sales Returns (Tax Reversals)
  const salesReturns = await prisma.salesReturn.findMany({
    where: {
      type: "PHARMACY",
      createdAt: { gte: range.from, lt: range.to },
    },
    select: {
      id: true,
      returnNumber: true,
      createdAt: true,
      refundAmount: true,
      items: {
        select: {
          id: true,
          medicineId: true,
          itemName: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
        },
      },
    },
  })

  // 4. Fetch Purchase Invoices (Inward Supplies / ITC)
  const purchaseInvoices = await prisma.purchaseInvoice.findMany({
    where: {
      date: { gte: range.from, lt: range.to },
      supplier: supplierScopeFilter("PHARMACY"),
    },
    select: {
      id: true,
      invoiceNumber: true,
      date: true,
      subTotal: true,
      taxTotal: true,
      grandTotal: true,
      supplier: { select: { id: true, name: true, gstNumber: true } },
      items: {
        select: {
          id: true,
          itemName: true,
          quantity: true,
          rate: true,
          taxPercent: true,
          totalAmount: true,
          discountPercent: true,
          hsnCode: true,
          isFreeGood: true,
        },
      },
    },
    orderBy: { date: "desc" },
  })

  // 5. Fetch Purchase Returns (ITC Reversals)
  const purchaseReturns = await prisma.purchaseReturn.findMany({
    where: {
      date: { gte: range.from, lt: range.to },
      supplier: supplierScopeFilter("PHARMACY"),
    },
    select: {
      id: true,
      returnNumber: true,
      date: true,
      totalAmount: true,
    },
  })

  // ----------------------------------------------------
  // Compute Outward Rate Breakdown
  // ----------------------------------------------------
  const outwardMap = new Map<number, GstRateBucket>()
  STANDARD_RATES.forEach((r) => {
    outwardMap.set(r, { rate: r, taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0, totalValue: 0, lineCount: 0 })
  })

  const hsnMap = new Map<string, GstHsnRow>()

  let totalSalesTaxable = 0
  let totalSalesTax = 0

  salesBills.forEach((bill) => {
    bill.items.forEach((item) => {
      const rate = Math.round(item.gstRate || 0)
      if (!outwardMap.has(rate)) {
        outwardMap.set(rate, { rate, taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0, totalValue: 0, lineCount: 0 })
      }
      const b = outwardMap.get(rate)!

      // Item amount is the taxable base; gstAmount is the tax
      const taxable = item.amount || (item.totalAmount - (item.gstAmount || 0))
      const tax = item.gstAmount || 0
      const cgst = Math.round((tax / 2) * 100) / 100
      const sgst = Math.round((tax - cgst) * 100) / 100

      b.taxableValue += taxable
      b.cgst += cgst
      b.sgst += sgst
      b.totalTax += tax
      b.totalValue += item.totalAmount
      b.lineCount += 1

      totalSalesTaxable += taxable
      totalSalesTax += tax

      // HSN grouping
      const med = item.referenceId ? medicineMap.get(item.referenceId) : null
      const rawHsn = med?.hsnCode?.trim() || "3004"
      const hsnKey = rawHsn.length > 0 ? rawHsn : "3004"
      const desc = med?.type || med?.genericName || "Medicaments"

      if (!hsnMap.has(hsnKey)) {
        hsnMap.set(hsnKey, {
          hsnCode: hsnKey,
          description: desc,
          quantity: 0,
          taxableValue: 0,
          cgst: 0,
          sgst: 0,
          totalTax: 0,
          totalValue: 0,
        })
      }
      const h = hsnMap.get(hsnKey)!
      h.quantity += item.quantity || 1
      h.taxableValue += taxable
      h.cgst += cgst
      h.sgst += sgst
      h.totalTax += tax
      h.totalValue += item.totalAmount
    })
  })

  // ----------------------------------------------------
  // Sales Returns (Credit Notes) Tax Allocation
  // ----------------------------------------------------
  const totalSalesReturnRefund = salesReturns.reduce((s, r) => s + (r.refundAmount || 0), 0)
  // Compute effective tax ratio on sales for proportional return reversal
  const salesTaxRatio = (totalSalesTaxable + totalSalesTax) > 0 ? totalSalesTax / (totalSalesTaxable + totalSalesTax) : 0
  const salesReturnTax = Math.round(totalSalesReturnRefund * salesTaxRatio * 100) / 100
  const netOutputTax = Math.max(0, Math.round((totalSalesTax - salesReturnTax) * 100) / 100)
  const netOutputCgst = Math.round((netOutputTax / 2) * 100) / 100
  const netOutputSgst = Math.round((netOutputTax - netOutputCgst) * 100) / 100

  // ----------------------------------------------------
  // Compute Inward Rate Breakdown (Purchases / ITC)
  // ----------------------------------------------------
  const inwardMap = new Map<number, GstRateBucket>()
  STANDARD_RATES.forEach((r) => {
    inwardMap.set(r, { rate: r, taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0, totalValue: 0, lineCount: 0 })
  })

  let totalPurchaseTaxable = 0
  let totalPurchaseItc = 0

  purchaseInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (item.isFreeGood) return
      const rate = Math.round(item.taxPercent || 0)
      if (!inwardMap.has(rate)) {
        inwardMap.set(rate, { rate, taxableValue: 0, cgst: 0, sgst: 0, totalTax: 0, totalValue: 0, lineCount: 0 })
      }
      const b = inwardMap.get(rate)!

      const gross = item.quantity * item.rate
      const discount = gross * ((item.discountPercent || 0) / 100)
      const taxable = gross - discount
      const tax = item.totalAmount - taxable
      const cgst = Math.round((tax / 2) * 100) / 100
      const sgst = Math.round((tax - cgst) * 100) / 100

      b.taxableValue += taxable
      b.cgst += cgst
      b.sgst += sgst
      b.totalTax += tax
      b.totalValue += item.totalAmount
      b.lineCount += 1

      totalPurchaseTaxable += taxable
      totalPurchaseItc += tax
    })
  })

  // Purchase Returns (Debit Notes) ITC Reversal
  const totalPurchaseReturnAmount = purchaseReturns.reduce((s, r) => s + (r.totalAmount || 0), 0)
  const purchaseTaxRatio = (totalPurchaseTaxable + totalPurchaseItc) > 0 ? totalPurchaseItc / (totalPurchaseTaxable + totalPurchaseItc) : 0
  const purchaseReturnItc = Math.round(totalPurchaseReturnAmount * purchaseTaxRatio * 100) / 100
  const netEligibleItc = Math.max(0, Math.round((totalPurchaseItc - purchaseReturnItc) * 100) / 100)
  const netInputCgst = Math.round((netEligibleItc / 2) * 100) / 100
  const netInputSgst = Math.round((netEligibleItc - netInputCgst) * 100) / 100

  // Net Tax Liability
  const netTaxPayable = Math.round((netOutputTax - netEligibleItc) * 100) / 100
  const isPayable = netTaxPayable > 0

  // Sort Rate summaries
  const outwardRateSummary = Array.from(outwardMap.values()).sort((a, b) => a.rate - b.rate)
  const inwardRateSummary = Array.from(inwardMap.values()).sort((a, b) => a.rate - b.rate)

  // Reconciliation rate by rate
  const allRates = Array.from(new Set([...outwardRateSummary.map((r) => r.rate), ...inwardRateSummary.map((r) => r.rate)])).sort((a, b) => a - b)
  const reconciliation = allRates.map((r) => {
    const out = outwardMap.get(r)?.totalTax || 0
    const outRet = totalSalesTax > 0 ? (out / totalSalesTax) * salesReturnTax : 0
    const netOut = Math.max(0, out - outRet)
    const itc = inwardMap.get(r)?.totalTax || 0
    const itcRet = totalPurchaseItc > 0 ? (itc / totalPurchaseItc) * purchaseReturnItc : 0
    const netItc = Math.max(0, itc - itcRet)
    return {
      rate: r,
      outputTax: Math.round(out * 100) / 100,
      returnTax: Math.round(outRet * 100) / 100,
      netOutput: Math.round(netOut * 100) / 100,
      eligibleItc: Math.round(netItc * 100) / 100,
      netBalance: Math.round((netOut - netItc) * 100) / 100,
    }
  })

  // HSN list sorted by taxable value
  const hsnSummary = Array.from(hsnMap.values()).sort((a, b) => b.taxableValue - a.taxableValue)

  // Outward invoices preview
  const outwardInvoices = salesBills.slice(0, 50).map((b) => {
    const cust = b.pharmacyCustomer?.name || b.patient?.user?.name || "Counter Patient"
    const channel = b.ipdAdmissionId ? "IPD" : b.emergencyVisitId ? "EMERGENCY" : b.casualtyVisitId ? "CASUALTY" : b.appointmentId ? "OPD" : "OTC"
    const taxable = b.items.reduce((s, i) => s + (i.amount || (i.totalAmount - (i.gstAmount || 0))), 0)
    const tax = b.taxAmount || 0
    const cgst = Math.round((tax / 2) * 100) / 100
    const sgst = Math.round((tax - cgst) * 100) / 100
    return {
      id: b.id,
      billNumber: b.billNumber,
      date: b.billDate.toISOString(),
      customerName: cust,
      channel,
      taxableValue: Math.round(taxable * 100) / 100,
      cgst,
      sgst,
      totalTax: Math.round(tax * 100) / 100,
      netAmount: Math.round(b.netAmount * 100) / 100,
    }
  })

  // Inward invoices preview
  const inwardInvoices = purchaseInvoices.slice(0, 50).map((inv) => {
    const taxable = inv.items.reduce((s, i) => {
      if (i.isFreeGood) return s
      const gross = i.quantity * i.rate
      return s + (gross - gross * ((i.discountPercent || 0) / 100))
    }, 0)
    const tax = inv.taxTotal || 0
    const cgst = Math.round((tax / 2) * 100) / 100
    const sgst = Math.round((tax - cgst) * 100) / 100
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.date.toISOString(),
      supplierName: inv.supplier.name,
      gstNumber: inv.supplier.gstNumber,
      taxableValue: Math.round(taxable * 100) / 100,
      inputCgst: cgst,
      inputSgst: sgst,
      totalItc: Math.round(tax * 100) / 100,
      grandTotal: Math.round(inv.grandTotal * 100) / 100,
    }
  })

  return {
    settings,
    kpis: {
      taxableTurnover: Math.round(totalSalesTaxable * 100) / 100,
      grossSalesTax: Math.round(totalSalesTax * 100) / 100,
      salesReturnTax,
      netOutputTax,
      netOutputCgst,
      netOutputSgst,
      taxablePurchases: Math.round(totalPurchaseTaxable * 100) / 100,
      grossPurchaseItc: Math.round(totalPurchaseItc * 100) / 100,
      purchaseReturnItc,
      netEligibleItc,
      netInputCgst,
      netInputSgst,
      netTaxPayable,
      isPayable,
    },
    outwardRateSummary,
    inwardRateSummary,
    reconciliation,
    hsnSummary,
    outwardInvoices,
    inwardInvoices,
  }
}

// ----------------------------------------------------
// Export helper for GST audit reports
// ----------------------------------------------------
export async function getGstExportRows(range: DateRange): Promise<{
  success: boolean
  data?: Record<string, any>[]
  message?: string
}> {
  try {
    const summary = await getGstSummary(range)
    const rows: Record<string, any>[] = []

    // 1. Executive Summary
    rows.push({
      "Section / Category": "1. SUMMARY",
      "Rate / Code": "ALL",
      "Description": "Net Output Tax (Sales − Returns)",
      "Taxable Value (₹)": summary.kpis.taxableTurnover,
      "CGST (₹)": summary.kpis.netOutputCgst,
      "SGST (₹)": summary.kpis.netOutputSgst,
      "Total Tax / ITC (₹)": summary.kpis.netOutputTax,
      "Net Balance (₹)": summary.kpis.netOutputTax,
    })
    rows.push({
      "Section / Category": "1. SUMMARY",
      "Rate / Code": "ALL",
      "Description": "Eligible Input Tax Credit (Purchases − Returns)",
      "Taxable Value (₹)": summary.kpis.taxablePurchases,
      "CGST (₹)": summary.kpis.netInputCgst,
      "SGST (₹)": summary.kpis.netInputSgst,
      "Total Tax / ITC (₹)": summary.kpis.netEligibleItc,
      "Net Balance (₹)": -summary.kpis.netEligibleItc,
    })
    rows.push({
      "Section / Category": "1. SUMMARY",
      "Rate / Code": "NET",
      "Description": summary.kpis.isPayable ? "Net GST Payable to Govt" : "ITC Balance Carried Forward",
      "Taxable Value (₹)": "",
      "CGST (₹)": "",
      "SGST (₹)": "",
      "Total Tax / ITC (₹)": "",
      "Net Balance (₹)": summary.kpis.netTaxPayable,
    })

    // 2. Outward Rate Wise (GSTR-1)
    summary.outwardRateSummary.forEach((r) => {
      rows.push({
        "Section / Category": "2. OUTWARD SUPPLIES (SALES)",
        "Rate / Code": `${r.rate}%`,
        "Description": `Sales at ${r.rate}% GST`,
        "Taxable Value (₹)": r.taxableValue.toFixed(2),
        "CGST (₹)": r.cgst.toFixed(2),
        "SGST (₹)": r.sgst.toFixed(2),
        "Total Tax / ITC (₹)": r.totalTax.toFixed(2),
        "Net Balance (₹)": r.totalValue.toFixed(2),
      })
    })

    // 3. Inward Rate Wise (GSTR-2B / ITC)
    summary.inwardRateSummary.forEach((r) => {
      rows.push({
        "Section / Category": "3. INWARD SUPPLIES (PURCHASES / ITC)",
        "Rate / Code": `${r.rate}%`,
        "Description": `Purchases at ${r.rate}% GST`,
        "Taxable Value (₹)": r.taxableValue.toFixed(2),
        "CGST (₹)": r.cgst.toFixed(2),
        "SGST (₹)": r.sgst.toFixed(2),
        "Total Tax / ITC (₹)": r.totalTax.toFixed(2),
        "Net Balance (₹)": r.totalValue.toFixed(2),
      })
    })

    // 4. HSN Summary (Table 12)
    summary.hsnSummary.forEach((h) => {
      rows.push({
        "Section / Category": "4. HSN SUMMARY (TABLE 12)",
        "Rate / Code": h.hsnCode,
        "Description": h.description,
        "Taxable Value (₹)": h.taxableValue.toFixed(2),
        "CGST (₹)": h.cgst.toFixed(2),
        "SGST (₹)": h.sgst.toFixed(2),
        "Total Tax / ITC (₹)": h.totalTax.toFixed(2),
        "Net Balance (₹)": h.totalValue.toFixed(2),
      })
    })

    return { success: true, data: rows }
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to generate GST export" }
  }
}
