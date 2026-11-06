"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { Prisma } from "@prisma/client"
import { AGING_BUCKETS } from "@/lib/pharmacy-finance/constants"

export type PharmacyReceivablesParams = {
  status?: "OPEN" | "PARTIAL" | "SETTLED" | "ALL"
  search?: string
  page?: number
}

const PAGE_SIZE = 50

export async function getPharmacyReceivables(params: PharmacyReceivablesParams) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  const page = params.page || 1

  // 1. First get ALL credit entries for BILLING (these are few compared to total bills)
  const allBillingCredits = await prisma.creditEntry.findMany({
    where: { referenceType: "BILLING", type: "RECEIVABLE" },
    select: { id: true, referenceId: true, partyId: true, partyName: true, balanceAmount: true, status: true }
  })

  const refIds = allBillingCredits.map(c => c.referenceId).filter(Boolean) as string[]

  // 2. Filter to only PHARMACY bills
  const billWhere: Prisma.BillingWhereInput = {
    id: { in: refIds },
    type: "PHARMACY"
  }
  
  const searchTrimmed = params.search?.trim()
  if (searchTrimmed) {
    const matchingCreditRefIds = allBillingCredits
      .filter(c => c.partyName && c.partyName.toLowerCase().includes(searchTrimmed.toLowerCase()))
      .map(c => c.referenceId)
      .filter(Boolean) as string[]

    billWhere.OR = [
      { billNumber: { contains: searchTrimmed, mode: "insensitive" } },
      { pharmacyCustomer: { name: { contains: searchTrimmed, mode: "insensitive" } } },
      { pharmacyCustomer: { phone: { contains: searchTrimmed, mode: "insensitive" } } },
      { patient: { user: { name: { contains: searchTrimmed, mode: "insensitive" } } } },
      { patient: { patientId: { contains: searchTrimmed, mode: "insensitive" } } },
      { patient: { phone: { contains: searchTrimmed, mode: "insensitive" } } },
      ...(matchingCreditRefIds.length > 0 ? [{ id: { in: matchingCreditRefIds } }] : [])
    ]
  }

  const pharmacyBills = await prisma.billing.findMany({
    where: billWhere,
    select: { 
      id: true, 
      billNumber: true, 
      billDate: true, 
      patient: { select: { id: true, patientId: true, phone: true, user: { select: { name: true } } } }, 
      pharmacyCustomer: { select: { id: true, name: true, phone: true } } 
    }
  })

  const billMap = new Map(pharmacyBills.map(b => [b.id, b]))
  const validBillIds = new Set(billMap.keys())

  // 3. Filter credit entries to those belonging to pharmacy bills
  const validCreditEntryIds = allBillingCredits
    .filter(c => c.referenceId && validBillIds.has(c.referenceId))
    .map(c => c.id)

  if (validCreditEntryIds.length === 0) {
    return { 
      rows: [], 
      aging: AGING_BUCKETS.map(b => ({ ...b, amount: 0 })), 
      totalOutstanding: 0, 
      page, 
      totalPages: 0, 
      totalRows: 0 
    }
  }

  // 4. Calculate aging (over ALL OPEN pharmacy receivables)
  const allOpenEntries = await prisma.creditEntry.findMany({
    where: {
      id: { in: validCreditEntryIds },
      status: { not: "SETTLED" }
    }
  })

  const now = new Date().getTime()
  let totalOutstanding = 0
  const agingCounts = AGING_BUCKETS.map(b => ({ ...b, amount: 0 }))

  for (const entry of allOpenEntries) {
    totalOutstanding += entry.balanceAmount
    const bDate = billMap.get(entry.referenceId!)?.billDate || new Date()
    const ageDays = Math.floor((now - bDate.getTime()) / (1000 * 60 * 60 * 24))
    for (const bucket of agingCounts) {
      if (ageDays >= bucket.min && ageDays <= bucket.max) {
        bucket.amount += entry.balanceAmount
        break
      }
    }
  }

  // 5. Paginate and fetch rows
  const listWhere: Prisma.CreditEntryWhereInput = {
    id: { in: validCreditEntryIds }
  }
  if (params.status && params.status !== "ALL") {
    listWhere.status = params.status
  }

  const totalRows = await prisma.creditEntry.count({ where: listWhere })
  const totalPages = Math.ceil(totalRows / PAGE_SIZE)

  const entries = await prisma.creditEntry.findMany({
    where: listWhere,
    orderBy: { createdAt: "desc" },
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
  })

  const rows = entries.map(e => {
    const bill = billMap.get(e.referenceId!)
    const ageDays = bill ? Math.floor((now - bill.billDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
    let agingBucket = ""
    for (const bucket of AGING_BUCKETS) {
      if (ageDays >= bucket.min && ageDays <= bucket.max) {
        agingBucket = bucket.label
        break
      }
    }

    // Resolve human-readable patient / party name:
    // Prioritize patient's registered name, then pharmacy customer name, then entry partyName if valid
    let resolvedPartyName = "Walk-in"
    if (bill?.patient?.user?.name && bill.patient.user.name.trim() && bill.patient.user.name !== "Walk-In Customer" && bill.patient.user.name !== "Walk-in") {
      resolvedPartyName = bill.patient.user.name.trim()
    } else if (bill?.pharmacyCustomer?.name && bill.pharmacyCustomer.name.trim() && bill.pharmacyCustomer.name !== "Walk-In Customer" && bill.pharmacyCustomer.name !== "Walk-in") {
      resolvedPartyName = bill.pharmacyCustomer.name.trim()
    } else if (e.partyName && e.partyName.trim() && !e.partyName.trim().startsWith("PAT-") && e.partyName !== "Walk-In Customer" && e.partyName !== "Walk-in") {
      resolvedPartyName = e.partyName.trim()
    } else if (e.partyName?.trim()) {
      resolvedPartyName = e.partyName.trim()
    }

    return {
      id: e.id,
      partyId: e.partyId || bill?.patient?.id || bill?.pharmacyCustomer?.id || null,
      partyName: resolvedPartyName,
      billNumber: bill?.billNumber || "-",
      billDate: bill?.billDate || e.createdAt,
      totalAmount: e.totalAmount,
      paidAmount: e.paidAmount,
      balanceAmount: e.balanceAmount,
      ageDays,
      agingBucket,
      status: e.status
    }
  })

  return {
    rows,
    aging: agingCounts,
    totalOutstanding,
    page,
    totalPages,
    totalRows
  }
}

export async function getCreditPartyStatement(partyId: string) {
  await requireAuth(["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"])
  const entries = await prisma.creditEntry.findMany({
    where: { partyId, referenceType: "BILLING" },
    include: { payments: true }
  })
  
  // For statement we just need all entries and payments sorted by date
  // We'll return them to the client to render the running balance.
  
  const events = []
  
  for (const entry of entries) {
    events.push({
      id: entry.id,
      date: entry.createdAt,
      type: "BILL",
      description: `Bill ${entry.referenceId}`,
      amount: entry.totalAmount,
      isCredit: false // Increases balance owed
    })
    
    for (const pay of entry.payments) {
      events.push({
        id: pay.id,
        date: pay.paymentDate || pay.createdAt,
        type: "PAYMENT",
        description: `Payment (${pay.paymentMethod})`,
        amount: pay.amount,
        isCredit: true // Reduces balance owed
      })
    }
  }
  
  events.sort((a, b) => a.date.getTime() - b.date.getTime())
  
  let balance = 0
  const statement = events.map(e => {
    balance += (e.isCredit ? -e.amount : e.amount)
    return { ...e, runningBalance: balance }
  })
  
  return statement
}

export async function getPatientConsolidatedDues(params: {
  partyName?: string
  partyId?: string | null
  search?: string
}) {
  await requireAuth(["SUPER_ADMIN", "ADMIN", "ACCOUNTANT", "PHARMACIST"])

  let searchTarget = (params.partyName || params.search || "").trim()

  // If search query looks like a bill number, look up the patient from that bill first
  if (searchTarget.toUpperCase().startsWith("BILL-")) {
    const billMatch = await prisma.billing.findFirst({
      where: { billNumber: { equals: searchTarget, mode: "insensitive" }, type: "PHARMACY" },
      select: {
        pharmacyCustomer: { select: { id: true, name: true } },
        patient: { select: { id: true, patientId: true, user: { select: { name: true } } } },
      },
    })
    if (billMatch) {
      searchTarget = billMatch.patient?.user?.name || billMatch.pharmacyCustomer?.name || searchTarget
      if (!params.partyId) {
        params.partyId = billMatch.patient?.id || billMatch.pharmacyCustomer?.id
      }
    }
  }

  const cleanName = searchTarget.replace(/[`'"]/g, "").trim()

  if (!cleanName && !params.partyId) {
    return { success: false, message: "No patient specified" }
  }

  // 1. Resolve matching registered patients (by name, UHID / patientId, or phone)
  const matchingPatients = await prisma.patient.findMany({
    where: {
      OR: [
        ...(params.partyId && params.partyId !== "cmr2ingkh0002la1bt5dwujcj" ? [{ id: params.partyId }] : []),
        ...(cleanName ? [
          { user: { name: { contains: cleanName, mode: "insensitive" as const } } },
          { patientId: { contains: cleanName, mode: "insensitive" as const } },
          { phone: { contains: cleanName, mode: "insensitive" as const } },
        ] : []),
      ]
    },
    select: {
      id: true,
      patientId: true,
      phone: true,
      address: true,
      user: { select: { name: true, phone: true } }
    }
  })

  // 2. Resolve matching pharmacy customers (by name or phone)
  const matchingCustomers = await prisma.pharmacyCustomer.findMany({
    where: {
      OR: [
        ...(params.partyId && params.partyId !== "cmr2ingkh0002la1bt5dwujcj" ? [{ id: params.partyId }] : []),
        ...(cleanName ? [
          { name: { contains: cleanName, mode: "insensitive" as const } },
          { phone: { contains: cleanName, mode: "insensitive" as const } },
        ] : []),
      ]
    },
    select: {
      id: true,
      name: true,
      phone: true,
      address: true,
    }
  })

  const patientIds = matchingPatients.map(p => p.id)
  const patientUHIDs = matchingPatients.map(p => p.patientId).filter(Boolean) as string[]
  const customerIds = matchingCustomers.map(c => c.id)

  // 3. Match all pharmacy bills belonging to these patients or customers
  const matchingBills = await prisma.billing.findMany({
    where: {
      type: "PHARMACY",
      OR: [
        ...(patientIds.length > 0 ? [{ patientId: { in: patientIds } }] : []),
        ...(customerIds.length > 0 ? [{ pharmacyCustomerId: { in: customerIds } }] : []),
        ...(cleanName ? [
          { patient: { user: { name: { contains: cleanName, mode: "insensitive" as const } } } },
          { pharmacyCustomer: { name: { contains: cleanName, mode: "insensitive" as const } } },
        ] : []),
      ]
    },
    select: { id: true }
  })
  const matchingBillIds = matchingBills.map(b => b.id)

  // 4. Build comprehensive OR conditions for credit entries
  const orConditions: Prisma.CreditEntryWhereInput[] = []
  if (matchingBillIds.length > 0) {
    orConditions.push({ referenceId: { in: matchingBillIds } })
  }
  if (patientIds.length > 0) {
    orConditions.push({ partyId: { in: patientIds } })
  }
  if (customerIds.length > 0) {
    orConditions.push({ partyId: { in: customerIds } })
  }
  if (params.partyId && params.partyId !== "cmr2ingkh0002la1bt5dwujcj") {
    orConditions.push({ partyId: params.partyId })
  }
  if (cleanName) {
    orConditions.push(
      { partyName: { contains: cleanName, mode: "insensitive" } },
      { notes: { contains: cleanName, mode: "insensitive" } }
    )
  }
  for (const uhid of patientUHIDs) {
    if (uhid && uhid !== "PAT-WALKIN") {
      orConditions.push(
        { partyName: { contains: uhid, mode: "insensitive" } },
        { notes: { contains: uhid, mode: "insensitive" } }
      )
    }
  }

  // 5. Query open/unsettled credit entries
  const creditEntries = await prisma.creditEntry.findMany({
    where: {
      referenceType: "BILLING",
      type: "RECEIVABLE",
      status: { not: "SETTLED" },
      balanceAmount: { gt: 0.01 },
      ...(orConditions.length > 0 ? { OR: orConditions } : {}),
    },
    include: {
      payments: {
        orderBy: { paymentDate: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Deduplicate entries by ID
  const uniqueCreditEntries = Array.from(new Map(creditEntries.map(e => [e.id, e])).values())

  if (uniqueCreditEntries.length === 0) {
    return {
      success: false,
      message: `No pending pharmacy credit entries found for "${cleanName || params.partyId}"`,
    }
  }

  const refIds = uniqueCreditEntries.map((c) => c.referenceId).filter(Boolean) as string[]

  // 6. Query linked pharmacy bills
  const pharmacyBills = await prisma.billing.findMany({
    where: {
      id: { in: refIds },
      type: "PHARMACY",
    },
    include: {
      patient: {
        include: {
          user: true,
        },
      },
      pharmacyCustomer: true,
    },
  })

  const billMap = new Map(pharmacyBills.map((b) => [b.id, b]))

  // 7. Filter entries strictly to PHARMACY bills
  const validEntries = uniqueCreditEntries.filter(
    (c) => c.referenceId && billMap.has(c.referenceId)
  )

  if (validEntries.length === 0) {
    return {
      success: false,
      message: `No active pharmacy dues found for "${cleanName || params.partyId}"`,
    }
  }

  // 8. Resolve patient info: ensure real name is displayed, never raw "PAT-xxxx"
  let displayName = ""
  let phone: string | null = null
  let uhid: string | null = null
  let address: string | null = null

  if (matchingPatients.length > 0) {
    const p = matchingPatients[0]
    if (p.user?.name) displayName = p.user.name
    if (p.patientId && p.patientId !== "PAT-WALKIN") uhid = p.patientId
    if (p.phone || p.user?.phone) phone = p.phone || p.user?.phone || null
    if (p.address && p.address !== "N/A") address = p.address
  } else if (matchingCustomers.length > 0) {
    const c = matchingCustomers[0]
    if (c.name) displayName = c.name
    if (c.phone) phone = c.phone
    if (c.address) address = c.address
  }

  for (const entry of validEntries) {
    const bill = billMap.get(entry.referenceId!)
    if (bill) {
      if (!displayName || displayName === "Walk-In Customer" || displayName.startsWith("PAT-")) {
        const candidate = bill.patient?.user?.name || bill.pharmacyCustomer?.name || entry.partyName
        if (candidate && !candidate.startsWith("PAT-") && candidate !== "Walk-In Customer") {
          displayName = candidate.replace(/[`'"]/g, "")
        }
      }
      if (!phone) {
        phone =
          bill.patient?.phone ||
          bill.patient?.user?.phone ||
          bill.pharmacyCustomer?.phone ||
          null
      }
      if (!uhid && bill.patient?.patientId && bill.patient.patientId !== "PAT-WALKIN") {
        uhid = bill.patient.patientId
      }
      if (!address) {
        address =
          (bill.patient?.address && bill.patient.address !== "N/A"
            ? bill.patient.address
            : null) ||
          bill.pharmacyCustomer?.address ||
          null
      }
    }
  }

  if (!displayName || displayName.startsWith("PAT-")) {
    displayName = cleanName.startsWith("PAT-") && uhid ? cleanName : (cleanName || "Customer")
  }

  const now = new Date().getTime()

  // 9. Build itemized bill lines
  const items = validEntries.map((e, idx) => {
    const bill = billMap.get(e.referenceId!)
    const billDate = bill?.billDate || e.createdAt
    const ageDays = Math.floor((now - new Date(billDate).getTime()) / (1000 * 60 * 60 * 24))

    return {
      index: idx + 1,
      id: e.id,
      billId: bill?.id,
      billNumber: bill?.billNumber || "BILL-PENDING",
      billDate: billDate,
      totalAmount: e.totalAmount,
      paidAmount: e.paidAmount,
      balanceAmount: e.balanceAmount,
      ageDays,
      status: e.status,
      notes: e.notes,
    }
  })

  // 10. Calculate grand totals
  const totalInvoiced = items.reduce((sum, item) => sum + item.totalAmount, 0)
  const totalPaid = items.reduce((sum, item) => sum + item.paidAmount, 0)
  const totalDue = items.reduce((sum, item) => sum + item.balanceAmount, 0)

  return {
    success: true,
    patientInfo: {
      name: displayName,
      phone: phone && phone !== "0000000000" ? phone : null,
      uhid: uhid || null,
      address: address || null,
    },
    items,
    totals: {
      totalInvoiced,
      totalPaid,
      totalDue,
      count: items.length,
    },
    generatedAt: new Date().toISOString(),
  }
}

