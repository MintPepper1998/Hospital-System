"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"

/**
 * Search medicines from the Medicine master table.
 * Returns top 10 matches by name or generic name.
 */
export async function searchMedicines(query: string) {
  await requireAuth()

  if (!query || query.trim().length < 2) {
    return []
  }

  const searchTerm = query.trim()

  const medicines = await prisma.medicine.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { genericName: { contains: searchTerm, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      genericName: true,
      strength: true,
      type: true,
      unitPrice: true,
      inventoryBatches: {
        select: { quantity: true, sellingPrice: true, isActive: true, isExpired: true, expiryDate: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    take: 100,
    orderBy: { name: "asc" },
  })

  const now = new Date()

  return medicines.map((m) => {
    const totalStock = m.inventoryBatches.reduce((sum: number, batch: any) => sum + batch.quantity, 0)
    // Sellable = active, not expired, has stock. FEFO = earliest expiry first.
    const sellable = m.inventoryBatches
      .filter((b) => b.isActive && !b.isExpired && b.expiryDate > now && b.quantity > 0)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
    const availableStock = sellable.reduce((sum, b) => sum + b.quantity, 0)
    
    return {
      id: m.id,
      name: m.name,
      genericName: m.genericName,
      strength: m.strength,
      type: m.type,
      unitPrice: m.inventoryBatches[0]?.sellingPrice || m.unitPrice,
      currentStock: totalStock,
      availableStock,
      sellingPrice: sellable[0]?.sellingPrice ?? m.inventoryBatches[0]?.sellingPrice ?? m.unitPrice,
      // Display label: "Dolo 650 (Paracetamol) - 650mg"
      label: `${m.name}${m.genericName !== m.name ? ` (${m.genericName})` : ""}${m.strength ? ` - ${m.strength}` : ""}`,
    }
  })
}

/**
 * Search tests from the LabTestCatalog master table.
 * Returns top 10 matches by name or code.
 */
export async function searchTests(query: string, type?: "PATHOLOGY" | "RADIOLOGY") {
  await requireAuth()

  if (!query || query.trim().length < 1) {
    return []
  }

  const searchTerm = query.trim()

  const tests = await prisma.labTestCatalog.findMany({
    where: {
      isActive: true,
      ...(type ? { type } : {}),
      OR: [
        { name: { contains: searchTerm, mode: "insensitive" } },
        { code: { contains: searchTerm, mode: "insensitive" } },
        ...(searchTerm.length >= 3
          ? [{ category: { contains: searchTerm, mode: "insensitive" as const } }]
          : []),
      ],
    },
    select: {
      id: true,
      name: true,
      code: true,
      price: true,
      category: true,
      type: true,
    },
    take: 10,
    orderBy: { name: "asc" },
  })

  return tests.map((t) => ({
    id: t.id,
    name: t.name,
    code: t.code,
    price: t.price,
    category: t.category,
    type: t.type,
    // Display label: "CBC (Complete Blood Count) - Hematology - ₹350"
    label: `${t.name}${t.category ? ` - ${t.category}` : ""}${t.price ? ` - ₹${t.price}` : ""}`,
  }))
}
