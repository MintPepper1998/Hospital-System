// Standard OT charge type templates
export const DEFAULT_CHARGE_TYPES = [
  { chargeType: "OT", chargeLabel: "OT Charges", sortOrder: 1 },
  { chargeType: "SURGEON", chargeLabel: "Surgeon Charges", sortOrder: 2 },
  { chargeType: "ASST_SURGEON", chargeLabel: "Assistant Surgeon Charges", sortOrder: 3 },
  { chargeType: "OT_TECHNICIAN", chargeLabel: "OT Technician Charges", sortOrder: 4 },
  { chargeType: "OT_PHARMACY", chargeLabel: "OT Pharmacy Charges", sortOrder: 5 },
  { chargeType: "ANESTHESIA", chargeLabel: "Anesthesia Charges", sortOrder: 6 },
  { chargeType: "NURSING", chargeLabel: "Nursing Charges", sortOrder: 7 },
  { chargeType: "PER_DIEM", chargeLabel: "Per Diem Charges", sortOrder: 8 },
  { chargeType: "MISCELLANEOUS", chargeLabel: "Miscellaneous Charges", sortOrder: 9 },
] as const
