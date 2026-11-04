import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { hospitalPurchaseWhere, hospitalTransactionWhere } from "@/lib/finance-scope"

export const runtime = "nodejs"

function getMonthRange(month: number, year: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 1, 0, 0, 0, 0)
  return { start, end }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const month = Number(searchParams.get("month") || new Date().getMonth() + 1)
    const year = Number(searchParams.get("year") || new Date().getFullYear())

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return new Response("Invalid month. Use 1-12.", { status: 400 })
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return new Response("Invalid year.", { status: 400 })
    }

    const { start, end } = getMonthRange(month, year)

    const [purchases, income] = await Promise.all([
      prisma.purchaseInvoice.findMany({
        where: hospitalPurchaseWhere({ date: { gte: start, lt: end } }),
        include: {
          supplier: {
            select: {
              name: true,
              gstNumber: true,
            },
          },
        },
        orderBy: { date: "asc" },
      }),
      prisma.transaction.findMany({
        where: hospitalTransactionWhere({
          type: "INCOME",
          date: { gte: start, lt: end },
        }),
        orderBy: { date: "asc" },
      }),
    ])

    const purchaseRows = purchases.map((p) => ({
      Date: p.date.toISOString().slice(0, 10),
      "Invoice Number": p.invoiceNumber,
      "Supplier Name": p.supplier.name,
      GSTIN: p.supplier.gstNumber || "",
      SubTotal: p.subTotal,
      "Tax Amount": p.taxTotal,
      "Grand Total": p.grandTotal,
    }))

    const incomeRows = income.map((t) => ({
      Date: t.date.toISOString().slice(0, 10),
      Category: t.category,
      Amount: t.amount,
      Description: t.description || "",
    }))

    const wb = XLSX.utils.book_new()
    const purchasesSheet = XLSX.utils.json_to_sheet(purchaseRows)
    const incomeSheet = XLSX.utils.json_to_sheet(incomeRows)
    XLSX.utils.book_append_sheet(wb, purchasesSheet, "Purchases (GSTR-2)")
    XLSX.utils.book_append_sheet(wb, incomeSheet, "Income (GSTR-1)")

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    const monthLabel = new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "short",
    })
    const fileName = `Tax_Report_${monthLabel}_${year}.xlsx`

    return new Response(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error("[ERROR] tax-report route:", error)
    return new Response(error?.message || "Failed to generate tax report", {
      status: 500,
    })
  }
}
