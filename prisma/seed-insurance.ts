import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const icdCodes = [
  { code: "A09", description: "Infectious gastroenteritis and colitis", category: "Infectious", isCommon: true },
  { code: "B20", description: "HIV disease", category: "Infectious", isCommon: false },
  { code: "C50.9", description: "Malignant neoplasm of breast", category: "Neoplasm", isCommon: true },
  { code: "C34.9", description: "Malignant neoplasm of lung", category: "Neoplasm", isCommon: true },
  { code: "D50.9", description: "Iron deficiency anaemia", category: "Blood", isCommon: true },
  { code: "E11.9", description: "Type 2 diabetes mellitus", category: "Endocrine", isCommon: true },
  { code: "E10.9", description: "Type 1 diabetes mellitus", category: "Endocrine", isCommon: true },
  { code: "E03.9", description: "Hypothyroidism", category: "Endocrine", isCommon: true },
  { code: "E05.9", description: "Thyrotoxicosis (Hyperthyroidism)", category: "Endocrine", isCommon: true },
  { code: "E78.5", description: "Dyslipidemia", category: "Endocrine", isCommon: true },
  { code: "G40.9", description: "Epilepsy", category: "Nervous System", isCommon: true },
  { code: "G43.9", description: "Migraine", category: "Nervous System", isCommon: true },
  { code: "I10", description: "Essential hypertension", category: "Circulatory", isCommon: true },
  { code: "I21.9", description: "Acute myocardial infarction (Heart Attack)", category: "Circulatory", isCommon: true },
  { code: "I25.1", description: "Atherosclerotic heart disease (CAD)", category: "Circulatory", isCommon: true },
  { code: "I50.9", description: "Heart failure", category: "Circulatory", isCommon: true },
  { code: "I63.9", description: "Cerebral infarction (Stroke)", category: "Circulatory", isCommon: true },
  { code: "I64", description: "Stroke, not specified as haemorrhage or infarction", category: "Circulatory", isCommon: true },
  { code: "J06.9", description: "Acute upper respiratory infection", category: "Respiratory", isCommon: true },
  { code: "J18.9", description: "Pneumonia", category: "Respiratory", isCommon: true },
  { code: "J44.1", description: "COPD with acute exacerbation", category: "Respiratory", isCommon: true },
  { code: "J45.9", description: "Asthma", category: "Respiratory", isCommon: true },
  { code: "K21.0", description: "GERD with esophagitis", category: "Digestive", isCommon: true },
  { code: "K25.9", description: "Gastric ulcer", category: "Digestive", isCommon: true },
  { code: "K35.80", description: "Acute appendicitis", category: "Digestive", isCommon: true },
  { code: "K40.9", description: "Inguinal hernia", category: "Digestive", isCommon: true },
  { code: "K80.2", description: "Gallstone (Cholelithiasis)", category: "Digestive", isCommon: true },
  { code: "K85.9", description: "Acute pancreatitis", category: "Digestive", isCommon: true },
  { code: "L03.9", description: "Cellulitis", category: "Skin", isCommon: true },
  { code: "M17.9", description: "Osteoarthritis of knee", category: "Musculoskeletal", isCommon: true },
  { code: "M54.5", description: "Low back pain", category: "Musculoskeletal", isCommon: true },
  { code: "M79.3", description: "Panniculitis", category: "Musculoskeletal", isCommon: false },
  { code: "N17.9", description: "Acute kidney failure", category: "Genitourinary", isCommon: true },
  { code: "N18.9", description: "Chronic kidney disease", category: "Genitourinary", isCommon: true },
  { code: "N20.0", description: "Calculus of kidney (Kidney Stone)", category: "Genitourinary", isCommon: true },
  { code: "N39.0", description: "Urinary tract infection", category: "Genitourinary", isCommon: true },
  { code: "O80", description: "Single spontaneous delivery (Normal Delivery)", category: "Pregnancy", isCommon: true },
  { code: "O82", description: "Encounter for Caesarean delivery", category: "Pregnancy", isCommon: true },
  { code: "R50.9", description: "Fever (Pyrexia of unknown origin)", category: "Symptoms", isCommon: true },
  { code: "R07.9", description: "Chest pain", category: "Symptoms", isCommon: true },
  { code: "R10.4", description: "Abdominal pain", category: "Symptoms", isCommon: true },
  { code: "S06.0", description: "Concussion", category: "Injury", isCommon: true },
  { code: "S72.0", description: "Fracture of neck of femur (Hip Fracture)", category: "Injury", isCommon: true },
  { code: "T78.2", description: "Anaphylactic shock", category: "Injury", isCommon: true },
  { code: "A90", description: "Dengue fever", category: "Infectious", isCommon: true },
  { code: "A01.0", description: "Typhoid fever", category: "Infectious", isCommon: true },
  { code: "B50.9", description: "Plasmodium falciparum malaria", category: "Infectious", isCommon: true },
  { code: "J12.9", description: "Viral pneumonia", category: "Respiratory", isCommon: true },
  { code: "N40.1", description: "Benign prostatic hyperplasia (BPH)", category: "Genitourinary", isCommon: true },
  { code: "H25.9", description: "Senile cataract", category: "Eye", isCommon: true },
]

const tariffItems = [
  { category: "ROOM", code: "GENERAL", description: "General Ward", hospitalRate: 1500, pmjayRate: 1000 },
  { category: "ROOM", code: "SEMI_PRIVATE", description: "Semi-Private Room", hospitalRate: 3000, pmjayRate: 1500 },
  { category: "ROOM", code: "PRIVATE", description: "Private Room", hospitalRate: 5000, pmjayRate: null },
  { category: "ROOM", code: "DELUXE", description: "Deluxe Room", hospitalRate: 8000, pmjayRate: null },
  { category: "ICU", code: "ICU", description: "ICU per day", hospitalRate: 10000, pmjayRate: 5000 },
  { category: "ICU", code: "NICU", description: "NICU per day", hospitalRate: 12000, pmjayRate: 5000 },
  { category: "OT", code: "OT_MINOR", description: "OT Charges - Minor Surgery", hospitalRate: 5000, pmjayRate: 3000 },
  { category: "OT", code: "OT_MAJOR", description: "OT Charges - Major Surgery", hospitalRate: 15000, pmjayRate: 8000 },
  { category: "OT", code: "OT_SUPER", description: "OT Charges - Super Specialty", hospitalRate: 30000, pmjayRate: 15000 },
  { category: "INVESTIGATION", code: "CBC", description: "Complete Blood Count", hospitalRate: 300, pmjayRate: 200 },
  { category: "INVESTIGATION", code: "LFT", description: "Liver Function Test", hospitalRate: 500, pmjayRate: 350 },
  { category: "INVESTIGATION", code: "KFT", description: "Kidney Function Test", hospitalRate: 500, pmjayRate: 350 },
  { category: "INVESTIGATION", code: "TFT", description: "Thyroid Function Test", hospitalRate: 600, pmjayRate: 400 },
  { category: "INVESTIGATION", code: "XRAY", description: "X-Ray", hospitalRate: 400, pmjayRate: 250 },
  { category: "INVESTIGATION", code: "USG", description: "Ultrasonography (USG)", hospitalRate: 800, pmjayRate: 500 },
  { category: "INVESTIGATION", code: "CT_SCAN", description: "CT Scan (Plain)", hospitalRate: 3000, pmjayRate: 2000 },
  { category: "INVESTIGATION", code: "CT_CONTRAST", description: "CT Scan (Contrast)", hospitalRate: 5000, pmjayRate: 3500 },
  { category: "INVESTIGATION", code: "MRI_PLAIN", description: "MRI (Plain)", hospitalRate: 5000, pmjayRate: 3500 },
  { category: "INVESTIGATION", code: "MRI_CONTRAST", description: "MRI (Contrast)", hospitalRate: 8000, pmjayRate: 5000 },
  { category: "INVESTIGATION", code: "ECG", description: "Electrocardiogram (ECG)", hospitalRate: 200, pmjayRate: 150 },
  { category: "INVESTIGATION", code: "ECHO", description: "Echocardiography", hospitalRate: 1500, pmjayRate: 1000 },
  { category: "SURGERY", code: "APPENDECTOMY_LAP", description: "Laparoscopic Appendectomy", hospitalRate: 45000, pmjayRate: 30000 },
  { category: "SURGERY", code: "APPENDECTOMY_OPEN", description: "Open Appendectomy", hospitalRate: 35000, pmjayRate: 25000 },
  { category: "SURGERY", code: "CHOLECYSTECTOMY_LAP", description: "Laparoscopic Cholecystectomy", hospitalRate: 55000, pmjayRate: 35000 },
  { category: "SURGERY", code: "HERNIA_LAP", description: "Laparoscopic Hernia Repair", hospitalRate: 50000, pmjayRate: 30000 },
  { category: "SURGERY", code: "HERNIA_OPEN", description: "Open Hernia Repair", hospitalRate: 35000, pmjayRate: 20000 },
  { category: "SURGERY", code: "CAESAREAN", description: "Caesarean Section", hospitalRate: 40000, pmjayRate: 20000 },
  { category: "SURGERY", code: "NORMAL_DELIVERY", description: "Normal Delivery Package", hospitalRate: 15000, pmjayRate: 9000 },
  { category: "SURGERY", code: "KNEE_REPLACEMENT", description: "Total Knee Replacement", hospitalRate: 200000, pmjayRate: 80000 },
  { category: "SURGERY", code: "HIP_REPLACEMENT", description: "Total Hip Replacement", hospitalRate: 200000, pmjayRate: 80000 },
  { category: "SURGERY", code: "CATARACT", description: "Cataract Surgery (Phaco)", hospitalRate: 25000, pmjayRate: 15000 },
  { category: "SURGERY", code: "CABG", description: "Coronary Artery Bypass Graft", hospitalRate: 300000, pmjayRate: 120000 },
  { category: "SURGERY", code: "ANGIOPLASTY", description: "PTCA / Angioplasty", hospitalRate: 200000, pmjayRate: 60000 },
  { category: "SURGERY", code: "TURP", description: "TURP (Prostate Surgery)", hospitalRate: 50000, pmjayRate: 30000 },
  { category: "CONSULTATION", code: "GENERAL", description: "General Consultation", hospitalRate: 300, pmjayRate: 200 },
  { category: "CONSULTATION", code: "SPECIALIST", description: "Specialist Consultation", hospitalRate: 500, pmjayRate: 300 },
  { category: "CONSULTATION", code: "SUPER_SPECIALIST", description: "Super Specialist Consultation", hospitalRate: 800, pmjayRate: 500 },
  { category: "PROFESSIONAL_FEE", code: "SURGEON_MINOR", description: "Surgeon Fee - Minor", hospitalRate: 5000, pmjayRate: 3000 },
  { category: "PROFESSIONAL_FEE", code: "SURGEON_MAJOR", description: "Surgeon Fee - Major", hospitalRate: 15000, pmjayRate: 8000 },
  { category: "PROFESSIONAL_FEE", code: "ANAESTHETIST", description: "Anaesthetist Fee", hospitalRate: 5000, pmjayRate: 3000 },
  { category: "MEDICINE", code: "DAILY_MEDS", description: "Daily Medicine Package (est.)", hospitalRate: 500, pmjayRate: 400 },
  { category: "MEDICINE", code: "IV_ANTIBIOTICS", description: "IV Antibiotics per day (est.)", hospitalRate: 1500, pmjayRate: 1000 },
]

async function seedInsuranceData() {
  console.log("Seeding ICD-10 codes...")
  for (const code of icdCodes) {
    await prisma.icdCode.upsert({
      where: { code: code.code },
      update: { description: code.description, category: code.category, isCommon: code.isCommon },
      create: code,
    })
  }
  console.log(`Seeded ${icdCodes.length} ICD-10 codes`)

  console.log("Seeding Tariff Master...")
  for (const item of tariffItems) {
    await prisma.tariffMaster.upsert({
      where: { category_code: { category: item.category, code: item.code } },
      update: { description: item.description, hospitalRate: item.hospitalRate, pmjayRate: item.pmjayRate },
      create: item,
    })
  }
  console.log(`Seeded ${tariffItems.length} tariff items`)

  console.log("Insurance seed data complete!")
}

seedInsuranceData()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
