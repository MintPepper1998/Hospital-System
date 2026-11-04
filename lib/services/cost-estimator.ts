import { prisma } from "@/lib/prisma"

export interface CostEstimateInput {
  policyId: string
  selectedServices: Array<{
    category: string
    code?: string
    description?: string
    quantity: number
  }>
  roomType?: string
  expectedDays?: number
  expectedIcuDays?: number
}

export interface CostEstimateLineItem {
  service: string
  category: string
  hospitalRate: number
  quantity: number
  totalCost: number
  insuredRate: number
  subLimitApplied: string | null
  amountCovered: number
  patientPays: number
}

export interface CostEstimateResult {
  sumInsured: number
  balanceAvailable: number
  estimatedTotalCost: number
  estimatedInsuranceCoverage: number
  estimatedOutOfPocket: number
  lineItems: CostEstimateLineItem[]
  deductions: {
    copayAmount: number
    copayPercentage: number
    deductibleAmount: number
    roomRentExcess: number
    roomRentProportionalImpact: number
    nonAdmissibleEstimate: number
    totalDeductions: number
  }
  warnings: string[]
}

export async function estimateTreatmentCost(
  input: CostEstimateInput
): Promise<CostEstimateResult> {
  const policy = await prisma.insurancePolicy.findUnique({
    where: { id: input.policyId },
  })

  if (!policy) {
    throw new Error("Insurance policy not found")
  }

  const warnings: string[] = []
  const lineItems: CostEstimateLineItem[] = []

  let totalHospitalCost = 0
  let roomRentTotal = 0
  let policyRoomRentCap = policy.roomRentCap || 0
  let actualRoomRatePerDay = 0

  for (const service of input.selectedServices) {
    const tariff = service.code
      ? await prisma.tariffMaster.findFirst({
          where: { category: service.category, code: service.code, isActive: true },
        })
      : await prisma.tariffMaster.findFirst({
          where: { category: service.category, description: service.description || "", isActive: true },
        })

    const hospitalRate = tariff?.hospitalRate || 0
    const quantity = service.quantity || 1
    const totalCost = hospitalRate * quantity

    if (service.category === "ROOM") {
      actualRoomRatePerDay = hospitalRate
      roomRentTotal = totalCost
    }

    totalHospitalCost += totalCost

    lineItems.push({
      service: tariff?.description || service.description || service.category,
      category: service.category,
      hospitalRate,
      quantity,
      totalCost,
      insuredRate: hospitalRate,
      subLimitApplied: null,
      amountCovered: totalCost,
      patientPays: 0,
    })
  }

  if (input.expectedDays && input.expectedDays > 0 && !input.selectedServices.some(s => s.category === "ROOM")) {
    const roomTariff = await prisma.tariffMaster.findFirst({
      where: { category: "ROOM", code: input.roomType || "GENERAL", isActive: true },
    })
    if (roomTariff) {
      actualRoomRatePerDay = roomTariff.hospitalRate
      roomRentTotal = roomTariff.hospitalRate * input.expectedDays
      totalHospitalCost += roomRentTotal
      lineItems.push({
        service: `Room Rent (${input.roomType || "General"}) x ${input.expectedDays} days`,
        category: "ROOM",
        hospitalRate: roomTariff.hospitalRate,
        quantity: input.expectedDays,
        totalCost: roomRentTotal,
        insuredRate: roomTariff.hospitalRate,
        subLimitApplied: null,
        amountCovered: roomRentTotal,
        patientPays: 0,
      })
    }
  }

  if (input.expectedIcuDays && input.expectedIcuDays > 0) {
    const icuTariff = await prisma.tariffMaster.findFirst({
      where: { category: "ICU", isActive: true },
    })
    if (icuTariff) {
      const icuTotal = icuTariff.hospitalRate * input.expectedIcuDays
      totalHospitalCost += icuTotal
      lineItems.push({
        service: `ICU Charges x ${input.expectedIcuDays} days`,
        category: "ICU",
        hospitalRate: icuTariff.hospitalRate,
        quantity: input.expectedIcuDays,
        totalCost: icuTotal,
        insuredRate: icuTariff.hospitalRate,
        subLimitApplied: null,
        amountCovered: icuTotal,
        patientPays: 0,
      })
    }
  }

  let roomRentExcess = 0
  let proportionalDeductionRatio = 1

  if (policyRoomRentCap > 0 && actualRoomRatePerDay > policyRoomRentCap) {
    proportionalDeductionRatio = policyRoomRentCap / actualRoomRatePerDay
    roomRentExcess = (actualRoomRatePerDay - policyRoomRentCap) * (input.expectedDays || 1)
    warnings.push(
      `Room rent (Rs.${actualRoomRatePerDay}/day) exceeds policy cap (Rs.${policyRoomRentCap}/day). ` +
      `Proportional deduction of ${((1 - proportionalDeductionRatio) * 100).toFixed(1)}% will apply to ALL expenses.`
    )
  }

  let adjustedCoverage = totalHospitalCost * proportionalDeductionRatio

  const copayPercentage = policy.copayPercentage || 0
  const copayAmount = adjustedCoverage * (copayPercentage / 100)
  if (copayPercentage > 0) {
    warnings.push(`Co-pay of ${copayPercentage}% applies on this policy.`)
  }

  const deductibleAmount = policy.deductibleAmount || 0
  if (deductibleAmount > 0) {
    warnings.push(`Deductible of Rs.${deductibleAmount} applies.`)
  }

  const proportionalImpact = totalHospitalCost - adjustedCoverage
  const totalDeductions = copayAmount + deductibleAmount + proportionalImpact

  let insuranceCoverage = Math.max(0, adjustedCoverage - copayAmount - deductibleAmount)

  const balanceAvailable = policy.balanceAvailable ?? policy.coverageAmount
  if (insuranceCoverage > balanceAvailable) {
    insuranceCoverage = balanceAvailable
    warnings.push(
      `Coverage capped at available balance of Rs.${balanceAvailable.toLocaleString("en-IN")}.`
    )
  }

  const outOfPocket = Math.max(0, totalHospitalCost - insuranceCoverage)

  for (const item of lineItems) {
    const adjustedItemCost = item.totalCost * proportionalDeductionRatio
    const itemCopay = adjustedItemCost * (copayPercentage / 100)
    item.amountCovered = Math.max(0, adjustedItemCost - itemCopay)
    item.patientPays = item.totalCost - item.amountCovered
    if (proportionalDeductionRatio < 1) {
      item.subLimitApplied = `Proportional deduction (${((1 - proportionalDeductionRatio) * 100).toFixed(1)}%)`
    }
  }

  return {
    sumInsured: policy.coverageAmount,
    balanceAvailable,
    estimatedTotalCost: totalHospitalCost,
    estimatedInsuranceCoverage: insuranceCoverage,
    estimatedOutOfPocket: outOfPocket,
    lineItems,
    deductions: {
      copayAmount,
      copayPercentage,
      deductibleAmount,
      roomRentExcess,
      roomRentProportionalImpact: proportionalImpact,
      nonAdmissibleEstimate: 0,
      totalDeductions,
    },
    warnings,
  }
}
