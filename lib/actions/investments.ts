"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireAuthSafe } from "@/lib/auth-guard"
import { writeAuditLog } from "@/lib/audit"

// ============================================
// ISOLATED INVESTMENT & CAPITAL ACTIONS
// ============================================

export async function createInvestor(formData: FormData) {
    const auth = await requireAuthSafe(["SUPER_ADMIN" as any, "ADMIN" as any])
    if (!auth.ok) return { success: false, error: auth.error }

    const name = formData.get("name") as string
    const contactPerson = formData.get("contactPerson") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string
    const notes = formData.get("notes") as string

    if (!name) return { success: false, error: "Investor name is required" }

    try {
        await prisma.investor.create({
            data: {
                name,
                contactPerson: contactPerson || null,
                email: email || null,
                phone: phone || null,
                address: address || null,
                notes: notes || null,
            },
        })

        revalidatePath("/dashboard/admin/investments")
        writeAuditLog({ userId: auth.session.userId, action: "CREATE", module: "Investor", changes: { name } })

    return { success: true, message: "Investor added successfully" }
    } catch (error: any) {
        console.error("Failed to create investor:", error)
        return { success: false, error: error.message || "Failed to add investor" }
    }
}

export async function createInvestmentInflow(formData: FormData) {
    const auth = await requireAuthSafe(["SUPER_ADMIN" as any, "ADMIN" as any])
    if (!auth.ok) return { success: false, error: auth.error }

    const investorId = formData.get("investorId") as string
    const amountStr = formData.get("amount") as string
    const dateStr = formData.get("date") as string
    const method = formData.get("method") as string
    const transactionRef = formData.get("transactionRef") as string
    const notes = formData.get("notes") as string

    if (!investorId || !amountStr) return { success: false, error: "Missing required fields" }
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) return { success: false, error: "Invalid amount" }

    try {
        await prisma.investmentInflow.create({
            data: {
                investorId,
                amount,
                date: dateStr ? new Date(dateStr) : undefined,
                method: method || null,
                transactionRef: transactionRef || null,
                notes: notes || null,
            }
        })

        revalidatePath("/dashboard/admin/investments")
        writeAuditLog({ userId: auth.session.userId, action: "CREATE", module: "Investment", changes: { amount } })
        return { success: true, message: "Investment inflow logged successfully" }
    } catch (error: any) {
        console.error("Failed to log investment:", error)
        return { success: false, error: error.message || "Failed to log investment" }
    }
}

export async function createCapitalExpense(formData: FormData) {
    const auth = await requireAuthSafe(["SUPER_ADMIN" as any, "ADMIN" as any])
    if (!auth.ok) return { success: false, error: auth.error }

    const amountStr = formData.get("amount") as string
    const dateStr = formData.get("date") as string
    const category = formData.get("category") as string
    const description = formData.get("description") as string
    const vendor = formData.get("vendor") as string
    const invoiceNumber = formData.get("invoiceNumber") as string
    const transactionRef = formData.get("transactionRef") as string
    const notes = formData.get("notes") as string

    if (!amountStr || !category || !description) return { success: false, error: "Missing required fields" }
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) return { success: false, error: "Invalid amount" }

    try {
        await prisma.capitalExpense.create({
            data: {
                amount,
                category,
                description,
                date: dateStr ? new Date(dateStr) : undefined,
                vendor: vendor || null,
                invoiceNumber: invoiceNumber || null,
                transactionRef: transactionRef || null,
                notes: notes || null,
            }
        })

        revalidatePath("/dashboard/admin/investments")
        writeAuditLog({ userId: auth.session.userId, action: "CREATE", module: "CapitalExpense", changes: { description, amount: amountStr } })
        return { success: true, message: "Capital expense logged successfully" }
    } catch (error: any) {
        console.error("Failed to log expense:", error)
        return { success: false, error: error.message || "Failed to log expense" }
    }
}

export async function updateCapitalExpense(id: string, formData: FormData) {
    const auth = await requireAuthSafe(["SUPER_ADMIN" as any, "ADMIN" as any])
    if (!auth.ok) return { success: false, error: auth.error }

    if (!id) return { success: false, error: "Expense ID is required" }

    const amountStr = formData.get("amount") as string
    const dateStr = formData.get("date") as string
    const category = formData.get("category") as string
    const description = formData.get("description") as string
    const vendor = formData.get("vendor") as string
    const invoiceNumber = formData.get("invoiceNumber") as string
    const transactionRef = formData.get("transactionRef") as string
    const notes = formData.get("notes") as string

    if (!amountStr || !category || !description) return { success: false, error: "Missing required fields" }
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) return { success: false, error: "Invalid amount" }

    try {
        await prisma.capitalExpense.update({
            where: { id },
            data: {
                amount,
                category,
                description,
                date: dateStr ? new Date(dateStr) : undefined,
                vendor: vendor || null,
                invoiceNumber: invoiceNumber || null,
                transactionRef: transactionRef || null,
                notes: notes || null,
            }
        })

        revalidatePath("/dashboard/admin/investments")
        writeAuditLog({ userId: auth.session.userId, action: "UPDATE", module: "CapitalExpense", recordId: id, changes: {} })

    return { success: true, message: "Capital expense updated successfully" }
    } catch (error: any) {
        console.error("Failed to update expense:", error)
        return { success: false, error: error.message || "Failed to update expense" }
    }
}

export async function deleteCapitalExpense(id: string) {
    const auth = await requireAuthSafe(["SUPER_ADMIN" as any, "ADMIN" as any])
    if (!auth.ok) return { success: false, error: auth.error }

    if (!id) return { success: false, error: "Expense ID is required" }

    try {
        await prisma.capitalExpense.delete({
            where: { id }
        })

        revalidatePath("/dashboard/admin/investments")
        writeAuditLog({ userId: auth.session.userId, action: "DELETE", module: "CapitalExpense", recordId: id, changes: {} })

    return { success: true, message: "Capital expense deleted successfully" }
    } catch (error: any) {
        console.error("Failed to delete expense:", error)
        return { success: false, error: error.message || "Failed to delete expense" }
    }
}

// ============================================
// INVESTOR EDIT / DELETE
// ============================================

export async function updateInvestor(id: string, formData: FormData) {
    const auth = await requireAuthSafe(["SUPER_ADMIN" as any, "ADMIN" as any])
    if (!auth.ok) return { success: false, error: auth.error }

    if (!id) return { success: false, error: "Investor ID is required" }

    const name = formData.get("name") as string
    const contactPerson = formData.get("contactPerson") as string
    const email = formData.get("email") as string
    const phone = formData.get("phone") as string
    const address = formData.get("address") as string
    const notes = formData.get("notes") as string

    if (!name) return { success: false, error: "Investor name is required" }

    try {
        await prisma.investor.update({
            where: { id },
            data: {
                name,
                contactPerson: contactPerson || null,
                email: email || null,
                phone: phone || null,
                address: address || null,
                notes: notes || null,
            },
        })

        revalidatePath("/dashboard/admin/investments")
        writeAuditLog({ userId: auth.session.userId, action: "UPDATE", module: "Investor", recordId: id, changes: {} })

    return { success: true, message: "Investor updated successfully" }
    } catch (error: any) {
        console.error("Failed to update investor:", error)
        return { success: false, error: error.message || "Failed to update investor" }
    }
}

export async function deleteInvestor(id: string) {
    const auth = await requireAuthSafe(["SUPER_ADMIN" as any, "ADMIN" as any])
    if (!auth.ok) return { success: false, error: auth.error }

    if (!id) return { success: false, error: "Investor ID is required" }

    try {
        // Delete all inflows first (Restrict constraint prevents cascade)
        await prisma.investmentInflow.deleteMany({ where: { investorId: id } })
        await prisma.investor.delete({ where: { id } })

        revalidatePath("/dashboard/admin/investments")
        writeAuditLog({ userId: auth.session.userId, action: "DELETE", module: "Investor", recordId: id, changes: {} })

    return { success: true, message: "Investor deleted successfully" }
    } catch (error: any) {
        console.error("Failed to delete investor:", error)
        return { success: false, error: error.message || "Failed to delete investor" }
    }
}

// ============================================
// INFLOW EDIT / DELETE
// ============================================

export async function updateInvestmentInflow(id: string, formData: FormData) {
    const auth = await requireAuthSafe(["SUPER_ADMIN" as any, "ADMIN" as any])
    if (!auth.ok) return { success: false, error: auth.error }

    if (!id) return { success: false, error: "Inflow ID is required" }

    const amountStr = formData.get("amount") as string
    const dateStr = formData.get("date") as string
    const method = formData.get("method") as string
    const transactionRef = formData.get("transactionRef") as string
    const notes = formData.get("notes") as string

    if (!amountStr) return { success: false, error: "Amount is required" }
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) return { success: false, error: "Invalid amount" }

    try {
        await prisma.investmentInflow.update({
            where: { id },
            data: {
                amount,
                date: dateStr ? new Date(dateStr) : undefined,
                method: method || null,
                transactionRef: transactionRef || null,
                notes: notes || null,
            }
        })

        revalidatePath("/dashboard/admin/investments")
        writeAuditLog({ userId: auth.session.userId, action: "UPDATE", module: "Investment", recordId: id, changes: {} })
        return { success: true, message: "Inflow updated successfully" }
    } catch (error: any) {
        console.error("Failed to update inflow:", error)
        return { success: false, error: error.message || "Failed to update inflow" }
    }
}

export async function deleteInvestmentInflow(id: string) {
    const auth = await requireAuthSafe(["SUPER_ADMIN" as any, "ADMIN" as any])
    if (!auth.ok) return { success: false, error: auth.error }

    if (!id) return { success: false, error: "Inflow ID is required" }

    try {
        await prisma.investmentInflow.delete({ where: { id } })

        revalidatePath("/dashboard/admin/investments")
        writeAuditLog({ userId: auth.session.userId, action: "DELETE", module: "Investment", recordId: id, changes: {} })
        return { success: true, message: "Inflow deleted successfully" }
    } catch (error: any) {
        console.error("Failed to delete inflow:", error)
        return { success: false, error: error.message || "Failed to delete inflow" }
    }
}
