import { PrismaClient, TestType } from '@prisma/client'

const prisma = new PrismaClient()

const labTests = [
  // Hematology
  {
    name: "CBC (Complete Blood Count)",
    code: "CBC001",
    price: 350,
    category: "Hematology",
    type: TestType.PATHOLOGY,
    description: "Complete blood count with differential",
    parameters: [
      { name: "Red Blood Cells (RBC)", unit: "million/μL", normalRange: "4.5-5.5" },
      { name: "White Blood Cells (WBC)", unit: "cells/μL", normalRange: "4000-11000" },
      { name: "Hemoglobin", unit: "g/dL", normalRange: "12.0-17.5" },
      { name: "Hematocrit", unit: "%", normalRange: "38-50" },
      { name: "Platelet Count", unit: "lakhs/μL", normalRange: "1.5-4.5" }
    ]
  },
  {
    name: "Hemoglobin (Hb)",
    code: "HB001",
    price: 150,
    category: "Hematology",
    type: TestType.PATHOLOGY,
    description: "Hemoglobin level measurement",
    parameters: [
      { name: "Hemoglobin", unit: "g/dL", normalRange: "12.0-17.5" }
    ]
  },
  {
    name: "ESR (Erythrocyte Sedimentation Rate)",
    code: "ESR001",
    price: 150,
    category: "Hematology",
    type: TestType.PATHOLOGY,
    description: "Measure of inflammation",
    parameters: [
      { name: "ESR", unit: "mm/hr", normalRange: "0-20" }
    ]
  },
  {
    name: "Blood Grouping & Rh Typing",
    code: "BG001",
    price: 200,
    category: "Hematology",
    type: TestType.PATHOLOGY,
    description: "Determines blood group",
    parameters: [
      { name: "ABO Group", unit: "", normalRange: "-" },
      { name: "Rh Factor", unit: "", normalRange: "-" }
    ]
  },
  
  // Serology / Infectious Diseases
  {
    name: "Widal Test (Typhoid)",
    code: "WIDAL001",
    price: 300,
    category: "Serology",
    type: TestType.PATHOLOGY,
    description: "Test for typhoid fever",
    parameters: [
      { name: "S. Typhi O", unit: "titre", normalRange: "<1:80" },
      { name: "S. Typhi H", unit: "titre", normalRange: "<1:80" }
    ]
  },
  {
    name: "Dengue NS1 Antigen",
    code: "DENGUE001",
    price: 600,
    category: "Serology",
    type: TestType.PATHOLOGY,
    description: "Early detection of dengue infection",
    parameters: [
      { name: "Dengue NS1 Ag", unit: "Index", normalRange: "<0.9 (Negative)" }
    ]
  },
  {
    name: "Dengue IgG & IgM",
    code: "DENGUE002",
    price: 800,
    category: "Serology",
    type: TestType.PATHOLOGY,
    description: "Dengue antibody test",
    parameters: [
      { name: "Dengue IgG", unit: "", normalRange: "Negative" },
      { name: "Dengue IgM", unit: "", normalRange: "Negative" }
    ]
  },
  {
    name: "Malaria Parasite (MP) smear",
    code: "MP001",
    price: 250,
    category: "Serology",
    type: TestType.PATHOLOGY,
    description: "Microscopic examination for malaria parasites",
    parameters: [
      { name: "Malaria Parasite", unit: "", normalRange: "Not Seen" }
    ]
  },
  {
    name: "C-Reactive Protein (CRP)",
    code: "CRP001",
    price: 450,
    category: "Serology",
    type: TestType.PATHOLOGY,
    description: "Marker for inflammation",
    parameters: [
      { name: "CRP", unit: "mg/L", normalRange: "<5.0" }
    ]
  },
  
  // Biochemistry / Blood Sugar
  {
    name: "RBS (Random Blood Sugar)",
    code: "RBS001",
    price: 150,
    category: "Biochemistry",
    type: TestType.PATHOLOGY,
    description: "Random blood glucose level",
    parameters: [
      { name: "Random Blood Sugar", unit: "mg/dL", normalRange: "70-140" }
    ]
  },
  {
    name: "FBS (Fasting Blood Sugar)",
    code: "FBS001",
    price: 150,
    category: "Biochemistry",
    type: TestType.PATHOLOGY,
    description: "Fasting blood glucose level",
    parameters: [
      { name: "Fasting Blood Sugar", unit: "mg/dL", normalRange: "70-100" }
    ]
  },
  {
    name: "PPBS (Post Prandial Blood Sugar)",
    code: "PPBS001",
    price: 150,
    category: "Biochemistry",
    type: TestType.PATHOLOGY,
    description: "Blood sugar 2 hours after meal",
    parameters: [
      { name: "Post Prandial Blood Sugar", unit: "mg/dL", normalRange: "<140" }
    ]
  },
  {
    name: "HbA1c (Glycated Hemoglobin)",
    code: "HBA1C001",
    price: 550,
    category: "Biochemistry",
    type: TestType.PATHOLOGY,
    description: "3-month average blood sugar",
    parameters: [
      { name: "HbA1c", unit: "%", normalRange: "<5.7" },
      { name: "Estimated Average Glucose", unit: "mg/dL", normalRange: "90-120" }
    ]
  },
  
  // Liver Function Tests
  {
    name: "LFT (Liver Function Test)",
    code: "LFT001",
    price: 750,
    category: "Biochemistry",
    type: TestType.PATHOLOGY,
    description: "Complete liver function panel",
    parameters: [
      { name: "Total Bilirubin", unit: "mg/dL", normalRange: "0.3-1.2" },
      { name: "Direct Bilirubin", unit: "mg/dL", normalRange: "0.0-0.3" },
      { name: "SGOT (AST)", unit: "U/L", normalRange: "5-40" },
      { name: "SGPT (ALT)", unit: "U/L", normalRange: "7-56" },
      { name: "Alkaline Phosphatase", unit: "U/L", normalRange: "44-147" },
      { name: "Total Protein", unit: "g/dL", normalRange: "6.4-8.3" },
      { name: "Albumin", unit: "g/dL", normalRange: "3.5-5.0" }
    ]
  },
  
  // Kidney Function Tests
  {
    name: "KFT (Kidney Function Test)",
    code: "KFT001",
    price: 750,
    category: "Biochemistry",
    type: TestType.PATHOLOGY,
    description: "Complete kidney function panel",
    parameters: [
      { name: "Blood Urea", unit: "mg/dL", normalRange: "15-40" },
      { name: "Serum Creatinine", unit: "mg/dL", normalRange: "0.6-1.2" },
      { name: "Uric Acid", unit: "mg/dL", normalRange: "3.5-7.2" },
      { name: "Sodium", unit: "mEq/L", normalRange: "135-145" },
      { name: "Potassium", unit: "mEq/L", normalRange: "3.5-5.0" },
      { name: "Chloride", unit: "mEq/L", normalRange: "96-106" }
    ]
  },
  
  // Lipid Profile
  {
    name: "Lipid Profile",
    code: "LIPID001",
    price: 850,
    category: "Biochemistry",
    type: TestType.PATHOLOGY,
    description: "Complete cholesterol and triglycerides panel",
    parameters: [
      { name: "Total Cholesterol", unit: "mg/dL", normalRange: "<200" },
      { name: "Triglycerides", unit: "mg/dL", normalRange: "<150" },
      { name: "HDL Cholesterol", unit: "mg/dL", normalRange: ">40" },
      { name: "LDL Cholesterol", unit: "mg/dL", normalRange: "<100" },
      { name: "VLDL Cholesterol", unit: "mg/dL", normalRange: "2-30" }
    ]
  },
  
  // Thyroid Tests
  {
    name: "Thyroid Profile (T3, T4, TSH)",
    code: "THYROID001",
    price: 650,
    category: "Biochemistry",
    type: TestType.PATHOLOGY,
    description: "Complete thyroid function test",
    parameters: [
      { name: "Total T3", unit: "ng/dL", normalRange: "80-200" },
      { name: "Total T4", unit: "μg/dL", normalRange: "4.5-12.0" },
      { name: "TSH", unit: "μIU/mL", normalRange: "0.4-4.0" }
    ]
  },
  
  // Advanced Diagnostics & Vitamins
  {
    name: "Vitamin D (25-OH)",
    code: "VITD001",
    price: 1200,
    category: "Biochemistry",
    type: TestType.PATHOLOGY,
    description: "Measures Vitamin D levels",
    parameters: [
      { name: "Vitamin D Total", unit: "ng/mL", normalRange: "30-100" }
    ]
  },
  {
    name: "Vitamin B12",
    code: "VITB1201",
    price: 1000,
    category: "Biochemistry",
    type: TestType.PATHOLOGY,
    description: "Measures Vitamin B12 levels",
    parameters: [
      { name: "Vitamin B12", unit: "pg/mL", normalRange: "200-900" }
    ]
  },
  
  // Urine Tests
  {
    name: "Urine Routine & Microscopy",
    code: "URINE001",
    price: 250,
    category: "Urine Analysis",
    type: TestType.PATHOLOGY,
    description: "Complete urine analysis",
    parameters: [
      { name: "Color", unit: "", normalRange: "Pale Yellow" },
      { name: "Appearance", unit: "", normalRange: "Clear" },
      { name: "pH", unit: "", normalRange: "4.5-8.0" },
      { name: "Specific Gravity", unit: "", normalRange: "1.005-1.030" },
      { name: "Glucose", unit: "", normalRange: "Absent" },
      { name: "Protein", unit: "", normalRange: "Absent" },
      { name: "Pus Cells", unit: "/HPF", normalRange: "0-5" },
      { name: "RBCs", unit: "/HPF", normalRange: "Absent" }
    ]
  },
  
  // Radiology
  {
    name: "X-Ray Chest PA View",
    code: "XRAY001",
    price: 600,
    category: "Radiology",
    type: TestType.RADIOLOGY,
    description: "Chest X-ray posteroanterior view",
    parameters: [
      { name: "Impression", unit: "", normalRange: "" }
    ]
  },
  {
    name: "USG Whole Abdomen",
    code: "USG001",
    price: 1200,
    category: "Radiology",
    type: TestType.RADIOLOGY,
    description: "Ultrasound of whole abdomen",
    parameters: [
      { name: "Impression", unit: "", normalRange: "" }
    ]
  },
  {
    name: "ECG (Electrocardiogram)",
    code: "ECG001",
    price: 400,
    category: "Cardiology",
    type: TestType.PATHOLOGY,  // For billing purposes, often categorized under pathology in simple setups, or we can just leave it as PATHOLOGY
    description: "Records the electrical signal from your heart",
    parameters: [
      { name: "Heart Rate", unit: "bpm", normalRange: "60-100" },
      { name: "Rhythm", unit: "", normalRange: "Sinus" },
      { name: "Impression", unit: "", normalRange: "Normal ECG" }
    ]
  }
]

async function main() {
  console.log('🧪 Seeding Lab Test Catalog with Advanced Parameters...')

  for (const test of labTests) {
    await prisma.labTestCatalog.upsert({
      where: { code: test.code },
      update: {
        ...test,
        parameters: test.parameters || [],
      },
      create: {
        ...test,
        parameters: test.parameters || [],
      },
    })
    console.log(`✓ ${test.name} (${test.code}) - ₹${test.price}`)
  }

  console.log(`\n✅ Seeded ${labTests.length} advanced lab tests successfully!`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding lab tests:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
