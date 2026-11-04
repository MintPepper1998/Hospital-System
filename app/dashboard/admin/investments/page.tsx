import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { InvestmentsClient } from "./investments-client"

export const metadata = {
    title: "Investment & Capital | Admin | Shree Kamal Hospital",
}

export default async function InvestmentsPage() {
    await requireAuth(["SUPER_ADMIN" as any, "ADMIN" as any])

    // Fetch all investors alongside their capital inflows
    const investors = await prisma.investor.findMany({
        include: {
            inflows: {
                orderBy: { date: "desc" }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    // Fetch all capital deployed (CapEx)
    const expenses = await prisma.capitalExpense.findMany({
        orderBy: { date: "desc" }
    })

    // Aggregate Metrics in memory (or could use prisma.aggregate)
    let totalRaised = 0
    investors.forEach(investor => {
        investor.inflows.forEach(inflow => {
            totalRaised += inflow.amount
        })
    })

    const totalDeployed = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const availableCapital = totalRaised - totalDeployed

    return (
        <InvestmentsClient
            investors={investors}
            expenses={expenses}
            totalRaised={totalRaised}
            totalDeployed={totalDeployed}
            availableCapital={availableCapital}
        />
    )
}
