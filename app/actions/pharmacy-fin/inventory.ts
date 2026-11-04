"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { DateRange } from "@/lib/pharmacy-finance/dates"

const ROLES = ["SUPER_ADMIN", "ACCOUNTANT", "PHARMACIST"] as const

export async function getInventoryValuation() {
  await requireAuth([...ROLES])

  // Raw SQL for totals to avoid loading huge batch arrays in memory
  const totalsRaw = await prisma.$queryRaw<any[]>`
    SELECT 
      COALESCE(SUM(quantity * "purchasePrice"), 0) as "stockAtCost",
      COALESCE(SUM(quantity * "sellingPrice"), 0) as "stockAtMrp"
    FROM "inventory_batches"
    WHERE quantity > 0 AND "isActive" = true
  `
  
  const stockAtCost = Number(totalsRaw[0]?.stockAtCost || 0)
  const stockAtMrp = Number(totalsRaw[0]?.stockAtMrp || 0)
  const potentialMargin = stockAtMrp - stockAtCost

  // Expiry buckets (using raw SQL)
  const now = new Date()
  const expiryBucketsRaw = await prisma.$queryRaw<any[]>`
    WITH buckets AS (
      SELECT 
        quantity * "purchasePrice" as val,
        CASE 
          WHEN "expiryDate" < ${now} THEN 'expired'
          WHEN "expiryDate" <= (${now}::timestamp + interval '30 days') THEN 'd30'
          WHEN "expiryDate" <= (${now}::timestamp + interval '90 days') THEN 'd90'
          WHEN "expiryDate" <= (${now}::timestamp + interval '180 days') THEN 'd180'
          ELSE 'safe'
        END as bucket
      FROM "inventory_batches"
      WHERE quantity > 0 AND "isActive" = true
    )
    SELECT bucket, COALESCE(SUM(val), 0) as total FROM buckets GROUP BY bucket
  `

  const buckets = {
    expired: 0, d30: 0, d90: 0, d180: 0, safe: 0
  }
  expiryBucketsRaw.forEach(b => {
    if (b.bucket in buckets) buckets[b.bucket as keyof typeof buckets] = Number(b.total)
  })

  // Top 20 medicines by stock value at cost
  const top20Raw = await prisma.$queryRaw<any[]>`
    SELECT 
      m.id, m.name, m.type,
      SUM(b.quantity * b."purchasePrice") as "totalValue"
    FROM "inventory_batches" b
    JOIN "medicines" m ON b."medicineId" = m.id
    WHERE b.quantity > 0 AND b."isActive" = true
    GROUP BY m.id, m.name, m.type
    ORDER BY "totalValue" DESC
    LIMIT 20
  `
  const top20 = top20Raw.map(t => ({
    id: t.id,
    name: t.name,
    type: t.type,
    totalValue: Number(t.totalValue)
  }))

  return {
    totals: { stockAtCost, stockAtMrp, potentialMargin },
    expiry: buckets,
    top20
  }
}

export async function getInventoryWriteOffs(range: DateRange) {
  await requireAuth([...ROLES])

  // unitCost defaults to 0 on older adjustments; fall back to the batch's purchase price
  // so write-off losses aren't silently under-reported.
  const dataRaw = await prisma.$queryRaw<any[]>`
    SELECT 
      a.reason,
      COALESCE(SUM(CASE WHEN i."quantityChange" < 0
        THEN ABS(i."quantityChange") * COALESCE(NULLIF(i."unitCost", 0), b."purchasePrice", 0) ELSE 0 END), 0) as loss,
      COALESCE(SUM(CASE WHEN i."quantityChange" > 0
        THEN i."quantityChange" * COALESCE(NULLIF(i."unitCost", 0), b."purchasePrice", 0) ELSE 0 END), 0) as gain
    FROM "stock_adjustments" a
    JOIN "stock_adjustment_items" i ON a.id = i."stockAdjustmentId"
    LEFT JOIN "inventory_batches" b ON b.id = i."inventoryBatchId"
    WHERE a.date >= ${range.from} AND a.date < ${range.to}
    GROUP BY a.reason
  `

  const rows = dataRaw.map(r => ({
    reason: r.reason,
    loss: Number(r.loss),
    gain: Number(r.gain)
  }))

  const totalLoss = rows.reduce((s, r) => s + r.loss, 0)
  const totalGain = rows.reduce((s, r) => s + r.gain, 0)

  return { rows, totalLoss, totalGain }
}
