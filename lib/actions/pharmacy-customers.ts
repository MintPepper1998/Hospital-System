"use server"

import { prisma } from "@/lib/prisma"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

/**
 * Search pharmacy customers by name or phone.
 */
export async function searchPharmacyCustomers(query: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] }
    }

    const search = query.trim()

    const customers = await prisma.pharmacyCustomer.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { phone: { contains: search } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    })

    return { success: true, data: customers }
  } catch (error) {
    console.error("[searchPharmacyCustomers] Error:", error)
    return { success: false, message: "Failed to search customers" }
  }
}

/**
 * Create a new pharmacy customer (non-patient buyer).
 */
export async function createPharmacyCustomer(data: {
  name: string
  phone?: string
  address?: string
  email?: string
}) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    if (!data.name?.trim()) {
      return { success: false, message: "Customer name is required" }
    }

    // Check if customer with this phone already exists, but only if phone is provided
    if (data.phone?.trim()) {
      const existing = await prisma.pharmacyCustomer.findUnique({
        where: { phone: data.phone.trim() },
      })

      if (existing) {
        // Update existing customer's name/address if provided
        const updated = await prisma.pharmacyCustomer.update({
          where: { id: existing.id },
          data: {
            name: data.name.trim(),
            address: data.address?.trim() || existing.address,
            email: data.email?.trim() || existing.email,
          },
        })
        writeAuditLog({ userId: authResult.session.userId, action: "UPDATE", module: "PharmacyCustomer", recordId: updated.id, changes: { name: data.name, phone: data.phone } })
        return { success: true, data: updated, message: "Existing customer updated" }
      }
    }

    // Create the customer
    const customer = await prisma.pharmacyCustomer.create({
      data: {
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        email: data.email?.trim() || null,
      },
    })

    writeAuditLog({ userId: authResult.session.userId, action: "CREATE", module: "PharmacyCustomer", recordId: customer.id, changes: { name: data.name, phone: data.phone } })
    return { success: true, data: customer, message: "Customer created successfully" }
  } catch (error) {
    console.error("[createPharmacyCustomer] Error:", error)
    return { success: false, message: "Failed to create customer" }
  }
}

/**
 * Get a pharmacy customer by ID.
 */
export async function getPharmacyCustomerById(id: string) {
  const authResult = await requireAuthSafe(["SUPER_ADMIN", "PHARMACIST"])
  if (!authResult.ok) return { success: false, message: authResult.error }

  try {
    const customer = await prisma.pharmacyCustomer.findUnique({
      where: { id },
    })

    if (!customer) {
      return { success: false, message: "Customer not found" }
    }

    return { success: true, data: customer }
  } catch (error) {
    console.error("[getPharmacyCustomerById] Error:", error)
    return { success: false, message: "Failed to fetch customer" }
  }
}
