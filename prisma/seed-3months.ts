import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const START_DATE = new Date('2026-03-01T00:00:00+05:30')
const END_DATE = new Date('2026-05-22T23:59:59+05:30')
const TOTAL_PATIENTS = 200
const HOSPITAL_NAME = 'Shree Kamal Hospital'
const HOSPITAL_GSTIN = '21AABCS1234F1Z5' // Odisha (state code 21)

// ═══════════════════════════════════════════════════════════════
// DATA DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const FIRST_NAMES_M = ['Rajesh','Amit','Rahul','Suresh','Vijay','Arun','Ramesh','Sandeep','Manoj','Ravi','Kiran','Prakash','Ganesh','Ashok','Vinod','Dinesh','Sanjay','Mahesh','Naveen','Abhishek','Siddharth','Arjun','Nikhil','Rohit','Aditya','Karthik','Vishal','Deepak','Ajay','Pankaj','Biswajit','Tapan','Subhas','Goutam','Jagdish']
const FIRST_NAMES_F = ['Priya','Sunita','Kavita','Meera','Anjali','Sneha','Pooja','Nisha','Divya','Deepa','Lakshmi','Rekha','Swati','Varsha','Asha','Shanti','Parvati','Gita','Radha','Usha','Kalpana','Malini','Savitri','Manju','Shalini','Vandana','Bharti','Madhuri','Smita','Rashmi','Sarita','Mamata','Laxmi','Jyoti','Rina']
const LAST_NAMES = ['Kumar','Sharma','Singh','Patel','Reddy','Rao','Nair','Mehta','Gupta','Verma','Joshi','Pandey','Sinha','Agarwal','Jain','Kulkarni','Das','Sahoo','Mohanty','Behera','Panda','Mishra','Nayak','Patnaik','Swain','Jena','Pradhan','Rout','Dash','Tripathy']
const CITIES = ['Bhubaneswar','Cuttack','Puri','Rourkela','Berhampur','Sambalpur','Balasore','Bhadrak','Jharsuguda','Angul']
const BLOOD_GROUPS = ['A+','B+','O+','AB+','A-','B-','O-','AB-']
const OCCUPATIONS = ['Farmer','Teacher','Business','Govt Employee','Housewife','Student','Driver','Shopkeeper','Labourer','Engineer','Doctor','Retired']

const DIAGNOSES = [
  'Acute Upper Respiratory Tract Infection','Viral Fever','Gastroenteritis','Hypertension','Type 2 Diabetes Mellitus',
  'Urinary Tract Infection','Acute Bronchitis','Dengue Fever (Suspected)','Musculoskeletal Pain','Migraine',
  'GERD / Acid Reflux','Allergic Rhinitis','Skin Rash - Dermatitis','Acute Pharyngitis','Lower Back Pain',
  'Knee Osteoarthritis','Anemia (Iron Deficiency)','Asthma (Mild)','Conjunctivitis','Scabies',
  'Typhoid Fever','Malaria (P. vivax)','Pneumonia','Cellulitis','Abscess'
]
const CHIEF_COMPLAINTS = [
  'Fever and body ache for 3 days','Cough and cold since 1 week','Abdominal pain and loose stools','Headache and dizziness',
  'Chest pain on exertion','Difficulty breathing','Joint pain and swelling','Skin rash and itching',
  'Burning micturition','Vomiting and nausea','Back pain radiating to legs','Sore throat and difficulty swallowing',
  'High blood sugar readings','Swelling in feet','General weakness and fatigue','Eye redness and discharge',
  'Ear pain and discharge','Numbness in hands','Recurrent fever','Weight loss and appetite loss'
]

// Doctors (15 total across 8 specializations)
const DOCTOR_SPECS = [
  { spec: 'General Physician', dept: 'General Medicine', fee: 300, count: 3 },
  { spec: 'Cardiologist', dept: 'Cardiology', fee: 600, count: 2 },
  { spec: 'Orthopedic Surgeon', dept: 'Orthopedics', fee: 500, count: 2 },
  { spec: 'Gynecologist', dept: 'Obstetrics & Gynecology', fee: 500, count: 1 },
  { spec: 'Pediatrician', dept: 'Pediatrics', fee: 400, count: 2 },
  { spec: 'ENT Specialist', dept: 'ENT', fee: 450, count: 1 },
  { spec: 'General Surgeon', dept: 'General Surgery', fee: 500, count: 2 },
  { spec: 'Dermatologist', dept: 'Dermatology', fee: 400, count: 2 },
]

// Medicines with Indian GST rates
interface MedicineData {
  name: string; generic: string; type: string; strength: string; price: number
  manufacturer: string; gstRate: number; hsnCode: string; schedule?: string
}

const MEDICINES_DATA: MedicineData[] = [
  // 0% GST — Life-Saving / Exempt (HSN 30049011)
  { name: 'Insulin Glargine', generic: 'Insulin Glargine', type: 'INJECTION', strength: '100IU/ml', price: 450, manufacturer: 'Sanofi', gstRate: 0, hsnCode: '30049011' },
  { name: 'ORS Electral', generic: 'Oral Rehydration Salts', type: 'POWDER', strength: '21g', price: 8, manufacturer: 'FDC Ltd', gstRate: 0, hsnCode: '30049020' },
  { name: 'Oral Polio Vaccine', generic: 'Poliomyelitis Vaccine', type: 'DROPS', strength: '2ml', price: 50, manufacturer: 'Serum Institute', gstRate: 0, hsnCode: '30022090' },
  { name: 'Iron Folic Acid', generic: 'Ferrous Sulphate + Folic Acid', type: 'TABLET', strength: '100mg+500mcg', price: 0.50, manufacturer: 'Alkem', gstRate: 0, hsnCode: '30049011' },
  { name: 'Human Albumin 20%', generic: 'Human Albumin', type: 'INJECTION', strength: '100ml', price: 3500, manufacturer: 'Biotest', gstRate: 0, hsnCode: '30021000' },
  // 5% GST — Standard Medicines (HSN 30049099)
  { name: 'Dolo 650', generic: 'Paracetamol', type: 'TABLET', strength: '650mg', price: 2.50, manufacturer: 'Micro Labs', gstRate: 5, hsnCode: '30049099' },
  { name: 'Augmentin 625', generic: 'Amoxicillin + Clavulanic Acid', type: 'TABLET', strength: '625mg', price: 25, manufacturer: 'GSK', gstRate: 5, hsnCode: '30049099' },
  { name: 'Pan-D', generic: 'Pantoprazole + Domperidone', type: 'CAPSULE', strength: '40mg+30mg', price: 8, manufacturer: 'Alkem', gstRate: 5, hsnCode: '30049099' },
  { name: 'Azithromycin 500', generic: 'Azithromycin', type: 'TABLET', strength: '500mg', price: 18, manufacturer: 'Cipla', gstRate: 5, hsnCode: '30049099' },
  { name: 'Crocin Advance', generic: 'Paracetamol', type: 'TABLET', strength: '500mg', price: 3, manufacturer: 'GSK', gstRate: 5, hsnCode: '30049099' },
  { name: 'Sinarest', generic: 'Paracetamol + Phenylephrine', type: 'TABLET', strength: '500mg+10mg', price: 4.50, manufacturer: 'Centrium', gstRate: 5, hsnCode: '30049099' },
  { name: 'Combiflam', generic: 'Ibuprofen + Paracetamol', type: 'TABLET', strength: '400mg+325mg', price: 3.50, manufacturer: 'Sanofi', gstRate: 5, hsnCode: '30049099' },
  { name: 'Cetirizine 10', generic: 'Cetirizine', type: 'TABLET', strength: '10mg', price: 1.50, manufacturer: "Dr. Reddy's", gstRate: 5, hsnCode: '30049099' },
  { name: 'Montek LC', generic: 'Montelukast + Levocetirizine', type: 'TABLET', strength: '10mg+5mg', price: 12, manufacturer: 'Sun Pharma', gstRate: 5, hsnCode: '30049099' },
  { name: 'Rabeprazole 20', generic: 'Rabeprazole', type: 'TABLET', strength: '20mg', price: 6, manufacturer: 'Lupin', gstRate: 5, hsnCode: '30049099' },
  { name: 'Metformin 500', generic: 'Metformin', type: 'TABLET', strength: '500mg', price: 2, manufacturer: 'USV', gstRate: 5, hsnCode: '30049099' },
  { name: 'Amlodipine 5', generic: 'Amlodipine', type: 'TABLET', strength: '5mg', price: 2.50, manufacturer: 'Cipla', gstRate: 5, hsnCode: '30049099' },
  { name: 'Norflox TZ', generic: 'Norfloxacin + Tinidazole', type: 'TABLET', strength: '400mg+600mg', price: 15, manufacturer: 'Cipla', gstRate: 5, hsnCode: '30049099' },
  { name: 'Atorvastatin 10', generic: 'Atorvastatin', type: 'TABLET', strength: '10mg', price: 5, manufacturer: 'Pfizer', gstRate: 5, hsnCode: '30049099' },
  { name: 'Omeprazole 20', generic: 'Omeprazole', type: 'CAPSULE', strength: '20mg', price: 4, manufacturer: 'Cipla', gstRate: 5, hsnCode: '30049099' },
  { name: 'Amoxicillin 500', generic: 'Amoxicillin', type: 'CAPSULE', strength: '500mg', price: 6, manufacturer: 'GSK', gstRate: 5, hsnCode: '30049099' },
  { name: 'Ciprofloxacin 500', generic: 'Ciprofloxacin', type: 'TABLET', strength: '500mg', price: 8, manufacturer: 'Ranbaxy', gstRate: 5, hsnCode: '30049099' },
  { name: 'Diclofenac 50', generic: 'Diclofenac Sodium', type: 'TABLET', strength: '50mg', price: 2, manufacturer: 'Novartis', gstRate: 5, hsnCode: '30049099' },
  { name: 'Losartan 50', generic: 'Losartan', type: 'TABLET', strength: '50mg', price: 4, manufacturer: 'MSD', gstRate: 5, hsnCode: '30049099' },
  { name: 'Telmisartan 40', generic: 'Telmisartan', type: 'TABLET', strength: '40mg', price: 5, manufacturer: 'Glenmark', gstRate: 5, hsnCode: '30049099' },
  { name: 'Clopidogrel 75', generic: 'Clopidogrel', type: 'TABLET', strength: '75mg', price: 6, manufacturer: 'Sun Pharma', gstRate: 5, hsnCode: '30049099' },
  { name: 'Pantoprazole 40', generic: 'Pantoprazole', type: 'TABLET', strength: '40mg', price: 5, manufacturer: 'Alkem', gstRate: 5, hsnCode: '30049099' },
  { name: 'Ondansetron 4', generic: 'Ondansetron', type: 'TABLET', strength: '4mg', price: 3, manufacturer: 'Sun Pharma', gstRate: 5, hsnCode: '30049099' },
  { name: 'Domperidone 10', generic: 'Domperidone', type: 'TABLET', strength: '10mg', price: 2, manufacturer: 'Torrent', gstRate: 5, hsnCode: '30049099' },
  { name: 'Paracetamol Syrup', generic: 'Paracetamol', type: 'SYRUP', strength: '120ml', price: 35, manufacturer: 'GSK', gstRate: 5, hsnCode: '30049099' },
  { name: 'Ambroxol Syrup', generic: 'Ambroxol', type: 'SYRUP', strength: '100ml', price: 60, manufacturer: 'Cipla', gstRate: 5, hsnCode: '30049099' },
  { name: 'Cough Syrup Benadryl', generic: 'Diphenhydramine', type: 'SYRUP', strength: '100ml', price: 85, manufacturer: 'J&J', gstRate: 5, hsnCode: '30049099' },
  { name: 'Betamethasone Cream', generic: 'Betamethasone', type: 'CREAM', strength: '15g', price: 35, manufacturer: 'GSK', gstRate: 5, hsnCode: '30049099' },
  { name: 'Povidone Iodine Ointment', generic: 'Povidone Iodine', type: 'OINTMENT', strength: '15g', price: 40, manufacturer: 'Win-Medicare', gstRate: 5, hsnCode: '30049099' },
  // 18% GST — Nutraceuticals / Health Supplements / Disinfectants
  { name: 'Protinex Powder', generic: 'Protein Supplement', type: 'POWDER', strength: '400g', price: 450, manufacturer: 'Danone', gstRate: 18, hsnCode: '21069099' },
  { name: 'Supradyn Daily', generic: 'Multivitamin', type: 'TABLET', strength: 'strip of 15', price: 85, manufacturer: 'Abbott', gstRate: 18, hsnCode: '21069099' },
  { name: 'Revital H', generic: 'Multivitamin + Ginseng', type: 'CAPSULE', strength: 'strip of 30', price: 320, manufacturer: 'Sun Pharma', gstRate: 18, hsnCode: '21069099' },
  { name: 'Hand Sanitizer 500ml', generic: 'Ethanol-based Sanitizer', type: 'SUSPENSION', strength: '500ml', price: 150, manufacturer: 'Himalaya', gstRate: 18, hsnCode: '38089400' },
  { name: 'Betadine Gargle', generic: 'Povidone Iodine Gargle', type: 'SUSPENSION', strength: '100ml', price: 85, manufacturer: 'Win-Medicare', gstRate: 18, hsnCode: '33049990' },
  { name: 'Dettol Antiseptic', generic: 'Chloroxylenol', type: 'SUSPENSION', strength: '200ml', price: 120, manufacturer: 'Reckitt', gstRate: 18, hsnCode: '38089400' },
]

const LAB_TESTS_DATA = [
  // Pathology
  { name: 'Complete Blood Count (CBC)', code: 'CBC001', category: 'Hematology', price: 300, type: 'PATHOLOGY', normalRange: 'See parameters', params: [{ name: 'Haemoglobin', unit: 'g/dL', normalRange: '12-16' },{ name: 'WBC', unit: 'cells/µL', normalRange: '4000-11000' },{ name: 'Platelet Count', unit: 'lakh/µL', normalRange: '1.5-4.5' },{ name: 'RBC', unit: 'million/µL', normalRange: '4.5-5.5' }] },
  { name: 'Blood Sugar Fasting', code: 'BSF001', category: 'Biochemistry', price: 150, type: 'PATHOLOGY', normalRange: '70-110 mg/dL', params: null },
  { name: 'Blood Sugar PP', code: 'BSPP001', category: 'Biochemistry', price: 150, type: 'PATHOLOGY', normalRange: '<140 mg/dL', params: null },
  { name: 'HbA1c', code: 'HBA1C001', category: 'Biochemistry', price: 600, type: 'PATHOLOGY', normalRange: '<5.7%', params: null },
  { name: 'Lipid Profile', code: 'LIPID001', category: 'Biochemistry', price: 800, type: 'PATHOLOGY', normalRange: 'See parameters', params: [{ name: 'Total Cholesterol', unit: 'mg/dL', normalRange: '<200' },{ name: 'Triglycerides', unit: 'mg/dL', normalRange: '<150' },{ name: 'HDL', unit: 'mg/dL', normalRange: '>40' },{ name: 'LDL', unit: 'mg/dL', normalRange: '<100' }] },
  { name: 'Liver Function Test (LFT)', code: 'LFT001', category: 'Biochemistry', price: 500, type: 'PATHOLOGY', normalRange: 'See parameters', params: [{ name: 'SGOT', unit: 'U/L', normalRange: '5-40' },{ name: 'SGPT', unit: 'U/L', normalRange: '7-56' },{ name: 'Bilirubin Total', unit: 'mg/dL', normalRange: '0.1-1.2' },{ name: 'Albumin', unit: 'g/dL', normalRange: '3.5-5.5' }] },
  { name: 'Kidney Function Test (KFT)', code: 'KFT001', category: 'Biochemistry', price: 500, type: 'PATHOLOGY', normalRange: 'Creatinine 0.6-1.2 mg/dL', params: [{ name: 'Creatinine', unit: 'mg/dL', normalRange: '0.6-1.2' },{ name: 'Urea', unit: 'mg/dL', normalRange: '15-40' },{ name: 'Uric Acid', unit: 'mg/dL', normalRange: '3.5-7.0' }] },
  { name: 'Thyroid Profile', code: 'THYROID001', category: 'Biochemistry', price: 700, type: 'PATHOLOGY', normalRange: 'TSH 0.4-4.0 mIU/L', params: [{ name: 'T3', unit: 'ng/dL', normalRange: '80-200' },{ name: 'T4', unit: 'µg/dL', normalRange: '4.5-12.5' },{ name: 'TSH', unit: 'mIU/L', normalRange: '0.4-4.0' }] },
  { name: 'Widal Test', code: 'WIDAL001', category: 'Serology', price: 200, type: 'PATHOLOGY', normalRange: '<1:80', params: null },
  { name: 'Dengue NS1 Antigen', code: 'DENGUE001', category: 'Serology', price: 600, type: 'PATHOLOGY', normalRange: 'Negative', params: null },
  { name: 'Urine Routine & Microscopy', code: 'URINE001', category: 'Pathology', price: 200, type: 'PATHOLOGY', normalRange: 'No abnormalities', params: null },
  { name: 'ESR', code: 'ESR001', category: 'Hematology', price: 100, type: 'PATHOLOGY', normalRange: '0-20 mm/hr', params: null },
  { name: 'Blood Group & Rh Type', code: 'BGRP001', category: 'Hematology', price: 150, type: 'PATHOLOGY', normalRange: 'N/A', params: null },
  { name: 'CRP (C-Reactive Protein)', code: 'CRP001', category: 'Biochemistry', price: 400, type: 'PATHOLOGY', normalRange: '<6 mg/L', params: null },
  { name: 'Vitamin D', code: 'VITD001', category: 'Biochemistry', price: 800, type: 'PATHOLOGY', normalRange: '30-100 ng/mL', params: null },
  { name: 'Vitamin B12', code: 'VITB12001', category: 'Biochemistry', price: 700, type: 'PATHOLOGY', normalRange: '200-900 pg/mL', params: null },
  { name: 'PT/INR', code: 'PTINR001', category: 'Hematology', price: 300, type: 'PATHOLOGY', normalRange: 'INR 0.8-1.2', params: null },
  { name: 'Malaria (Rapid)', code: 'MAL001', category: 'Serology', price: 250, type: 'PATHOLOGY', normalRange: 'Negative', params: null },
  // Radiology
  { name: 'X-Ray Chest PA View', code: 'XRAY001', category: 'Radiology', price: 400, type: 'RADIOLOGY', normalRange: 'Normal study', params: null },
  { name: 'X-Ray Spine AP/Lat', code: 'XRAY002', category: 'Radiology', price: 500, type: 'RADIOLOGY', normalRange: 'Normal study', params: null },
  { name: 'X-Ray Extremity', code: 'XRAY003', category: 'Radiology', price: 350, type: 'RADIOLOGY', normalRange: 'Normal study', params: null },
  { name: 'Ultrasound Abdomen', code: 'USG001', category: 'Radiology', price: 800, type: 'RADIOLOGY', normalRange: 'Normal study', params: null },
  { name: 'ECG (Electrocardiogram)', code: 'ECG001', category: 'Cardiology', price: 250, type: 'RADIOLOGY', normalRange: 'Normal sinus rhythm', params: null },
  { name: 'CT Scan Head', code: 'CT001', category: 'Radiology', price: 3500, type: 'RADIOLOGY', normalRange: 'Normal study', params: null },
  { name: 'MRI Brain', code: 'MRI001', category: 'Radiology', price: 6000, type: 'RADIOLOGY', normalRange: 'Normal study', params: null },
  { name: '2D Echo', code: 'ECHO001', category: 'Cardiology', price: 1500, type: 'RADIOLOGY', normalRange: 'Normal study', params: null },
]

const SUPPLIERS_DATA = [
  { name: 'Apollo Pharma Distributors', contactPerson: 'Rajesh Kumar', phone: '+91 98765 43210', gst: '21AABCA1234F1Z5', address: 'Station Square, Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha' },
  { name: 'Sun Pharma Agencies', contactPerson: 'Amit Shah', phone: '+91 98765 43211', gst: '21FGHIJ5678K2Y6', address: 'Mahanadi Vihar, Cuttack', city: 'Cuttack', state: 'Odisha' },
  { name: 'Cipla Medical Supplies', contactPerson: 'Priya Menon', phone: '+91 98765 43212', gst: '21KLMNO9012M3X7', address: 'Saheed Nagar, Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha' },
]

const WARDS_DATA = [
  { name: 'General Ward (Male)', type: 'GENERAL', floor: 'Ground Floor', desc: 'Non-AC general ward for male patients', beds: 15, price: 800 },
  { name: 'General Ward (Female)', type: 'GENERAL', floor: 'Ground Floor', desc: 'Non-AC general ward for female patients', beds: 15, price: 800 },
  { name: 'Private AC Ward', type: 'PRIVATE', floor: '1st Floor', desc: 'Air-conditioned private rooms', beds: 10, price: 2000 },
  { name: 'ICU (Intensive Care)', type: 'ICU', floor: '2nd Floor', desc: 'Critical care unit with monitoring', beds: 8, price: 5000 },
  { name: 'HDU (High Dependency)', type: 'HDU', floor: '2nd Floor', desc: 'Step-down from ICU', beds: 6, price: 3500 },
  { name: 'Pediatric Ward', type: 'GENERAL', floor: '1st Floor', desc: 'Ward for children', beds: 8, price: 1000 },
]

const SURGERY_PROCEDURES_DATA = [
  { name: 'Appendectomy', category: 'General Surgery', duration: 90, charge: 35000 },
  { name: 'Hernia Repair (Laparoscopic)', category: 'General Surgery', duration: 75, charge: 30000 },
  { name: 'Cholecystectomy (Laparoscopic)', category: 'General Surgery', duration: 60, charge: 40000 },
  { name: 'Cesarean Section (LSCS)', category: 'Obstetrics', duration: 60, charge: 25000 },
  { name: 'Total Knee Replacement', category: 'Orthopedics', duration: 120, charge: 180000 },
  { name: 'Cataract Surgery (Phaco)', category: 'Ophthalmology', duration: 30, charge: 15000 },
  { name: 'Tonsillectomy', category: 'ENT', duration: 45, charge: 15000 },
  { name: 'Fracture Fixation (ORIF)', category: 'Orthopedics', duration: 90, charge: 50000 },
  { name: 'Hysterectomy', category: 'Gynecology', duration: 120, charge: 45000 },
  { name: 'Hemorrhoidectomy', category: 'General Surgery', duration: 45, charge: 20000 },
]

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min }
function randFloat(min: number, max: number): number { return Math.round((Math.random() * (max - min) + min) * 100) / 100 }

function genPhone(): string { return `+91 ${randInt(7000000000, 9999999999)}` }
function genAadhar(): string { return `${randInt(2000, 9999)} ${randInt(1000, 9999)} ${randInt(1000, 9999)}` }

function genName(gender: 'MALE' | 'FEMALE'): string {
  const first = gender === 'MALE' ? rand(FIRST_NAMES_M) : rand(FIRST_NAMES_F)
  return `${first} ${rand(LAST_NAMES)}`
}

function genAddress(): string {
  return `${randInt(1, 500)}, ${rand(['MG Road','Station Road','Gandhi Nagar','Saheed Nagar','Nayapalli','Patia','Chandrasekharpur','Rasulgarh','Mancheswar','Jayadev Vihar'])}, ${rand(CITIES)}`
}

function daysBetween(d1: Date, d2: Date): number {
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

function setTimeOfDay(d: Date, hour: number, minute: number): Date {
  const r = new Date(d)
  r.setHours(hour, minute, 0, 0)
  return r
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

let billCounter = { PH: 0, OPD: 0, LAB: 0, IPD: 0, OT: 0, CAN: 0, AMB: 0 }
function nextBillNumber(prefix: string): string {
  const key = prefix as keyof typeof billCounter
  billCounter[key]++
  return `${prefix}-2026-${String(billCounter[key]).padStart(4, '0')}`
}

let patientCounter = 0
function nextPatientId(): string {
  patientCounter++
  return `PAT-${String(patientCounter).padStart(4, '0')}`
}

const PAYMENT_METHODS = ['CASH', 'CASH', 'CASH', 'UPI', 'UPI', 'CARD'] // weighted toward cash
function randPaymentMethod(): string { return rand(PAYMENT_METHODS) }

// ═══════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════')
  console.log('🏥 HOSPITAL ERP — 3-MONTH BIG HOSPITAL SEED (FAST)')
  console.log('═══════════════════════════════════════════════════\n')

  // ───────────────────────────────────────────────────────────
  // PHASE 1: NUCLEAR CLEANUP — Wipe EVERYTHING
  // ───────────────────────────────────────────────────────────
  console.log('💀 PHASE 1: Nuclear cleanup — wiping ALL data...')

  // Use raw SQL TRUNCATE CASCADE for speed and safety
  await prisma.$executeRawUnsafe(`
    DO $$ 
    DECLARE
      r RECORD;
    BEGIN
      FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations') LOOP
        EXECUTE 'TRUNCATE TABLE "' || r.tablename || '" CASCADE';
      END LOOP;
    END $$;
  `)
  console.log('✅ All tables truncated.\n')

  // ───────────────────────────────────────────────────────────
  // PHASE 2: MASTER DATA
  // ───────────────────────────────────────────────────────────
  console.log('📦 PHASE 2: Seeding master data...\n')

  // 2.1 Hospital Settings
  console.log('  🏥 Hospital Settings...')
  await prisma.hospitalSettings.create({
    data: {
      id: 1,
      name: HOSPITAL_NAME,
      address: 'Plot No. 123, Saheed Nagar, Bhubaneswar, Odisha - 751007',
      phone: '+91 674 2540123',
      email: 'info@shreekamal.hospital',
      website: 'https://shreekamal.hospital',
      gstNo: HOSPITAL_GSTIN,
      rohiniId: 'OR-BBR-0123',
      nabhAccreditation: 'NABH/H-2024-0456',
    }
  })
  await prisma.printSettings.create({ data: { id: 1 } })

  // 2.2 Users & Staff
  console.log('  👤 Creating Admin & Staff...')
  const hashedPwd = await bcrypt.hash('Admin123', 10)
  const docPwd = await bcrypt.hash('doctor123', 10)
  const staffPwd = await bcrypt.hash('staff123', 10)

  const admin = await prisma.user.create({
    data: { email: 'admin@hospital.com', password: hashedPwd, name: 'Super Admin', role: 'SUPER_ADMIN', isActive: true }
  })
  await prisma.staff.create({
    data: { employeeId: 'ADMIN001', userId: admin.id, department: 'Administration', designation: 'Hospital Administrator', phone: '+91 9876543210', consultationFee: 0 }
  })
  await prisma.employee.create({
    data: { userId: admin.id, name: 'Super Admin', role: 'SUPER_ADMIN', department: 'Administration', basicSalary: 80000 }
  })

  // Doctors
  const doctorRecords: { id: string; userId: string; dept: string; fee: number }[] = []
  let docIdx = 1
  for (const spec of DOCTOR_SPECS) {
    for (let i = 0; i < spec.count; i++) {
      const name = `Dr. ${genName('MALE')}`
      const email = `doctor${docIdx}@hospital.com`
      const user = await prisma.user.create({ data: { email, password: docPwd, name, role: 'DOCTOR', isActive: true } })
      const staff = await prisma.staff.create({
        data: {
          employeeId: `DOC${String(docIdx).padStart(3, '0')}`, userId: user.id,
          department: spec.dept, designation: spec.spec, specialization: spec.spec,
          licenseNumber: `MCI-${randInt(100000, 999999)}`, phone: genPhone(), consultationFee: spec.fee, basicSalary: randInt(60000, 150000)
        }
      })
      await prisma.employee.create({ data: { userId: user.id, name, role: 'DOCTOR', department: spec.dept, basicSalary: randInt(60000, 150000) } })
      doctorRecords.push({ id: staff.id, userId: user.id, dept: spec.dept, fee: spec.fee })
      docIdx++
    }
  }

  // Support Staff
  const staffRoles = [
    { role: 'RECEPTIONIST' as const, prefix: 'REC', dept: 'Front Desk', desg: 'Receptionist', count: 3, salary: 18000 },
    { role: 'PHARMACIST' as const, prefix: 'PHR', dept: 'Pharmacy', desg: 'Pharmacist', count: 3, salary: 22000 },
    { role: 'LAB_TECHNICIAN' as const, prefix: 'LAB', dept: 'Laboratory', desg: 'Lab Technician', count: 2, salary: 20000 },
    { role: 'NURSE' as const, prefix: 'NUR', dept: 'Nursing', desg: 'Staff Nurse', count: 4, salary: 20000 },
    { role: 'ACCOUNTANT' as const, prefix: 'ACC', dept: 'Finance', desg: 'Accountant', count: 2, salary: 25000 },
    { role: 'CANTEEN_STAFF' as const, prefix: 'CAN', dept: 'Canteen', desg: 'Canteen Staff', count: 2, salary: 12000 },
    { role: 'AMBULANCE_DRIVER' as const, prefix: 'AMB', dept: 'Ambulance', desg: 'Ambulance Driver', count: 2, salary: 15000 },
  ]
  for (const sr of staffRoles) {
    for (let i = 1; i <= sr.count; i++) {
      const name = genName(i % 2 === 0 ? 'FEMALE' : 'MALE')
      const email = `${sr.prefix.toLowerCase()}${i}@hospital.com`
      const user = await prisma.user.create({ data: { email, password: staffPwd, name, role: sr.role, isActive: true } })
      await prisma.staff.create({
        data: { employeeId: `${sr.prefix}${String(i).padStart(3, '0')}`, userId: user.id, department: sr.dept, designation: sr.desg, phone: genPhone(), basicSalary: sr.salary }
      })
      await prisma.employee.create({ data: { userId: user.id, name, role: sr.role, department: sr.dept, basicSalary: sr.salary } })
    }
  }

  // Wards & Beds
  const wardRecords: { id: string; name: string; type: string }[] = []
  const bedRecords: { id: string; wardId: string; bedNumber: string; price: number; wardName: string }[] = []
  for (const w of WARDS_DATA) {
    const ward = await prisma.ward.create({
      data: { name: w.name, type: w.type, floor: w.floor, capacity: w.beds, description: w.desc, isActive: true }
    })
    wardRecords.push({ id: ward.id, name: w.name, type: w.type })
    for (let b = 1; b <= w.beds; b++) {
      const bedNumber = `${w.name.substring(0, 3).toUpperCase()}-${String(b).padStart(2, '0')}`
      const bed = await prisma.bed.create({
        data: { wardId: ward.id, bedNumber, pricePerDay: w.price, status: 'AVAILABLE' }
      })
      bedRecords.push({ id: bed.id, wardId: ward.id, bedNumber, price: w.price, wardName: w.name })
    }
  }

  // Suppliers
  const supplierRecords: { id: string; name: string }[] = []
  for (const s of SUPPLIERS_DATA) {
    const sup = await prisma.supplier.create({
      data: { name: s.name, contactPerson: s.contactPerson, phone: s.phone, gstNumber: s.gst, address: s.address, city: s.city, state: s.state }
    })
    supplierRecords.push({ id: sup.id, name: s.name })
  }

  // Medicines & Inventory
  const medicineRecords: { id: string; name: string; price: number; gstRate: number; hsnCode: string; type: string; strength: string }[] = []
  for (const m of MEDICINES_DATA) {
    const med = await prisma.medicine.create({
      data: {
        name: m.name, genericName: m.generic, manufacturer: m.manufacturer,
        type: m.type as any, strength: m.strength, unitPrice: m.price,
        hsnCode: m.hsnCode, minStockLevel: 50, schedule: m.schedule || null
      }
    })
    medicineRecords.push({ id: med.id, name: m.name, price: m.price, gstRate: m.gstRate, hsnCode: m.hsnCode, type: m.type, strength: m.strength })

    const batchData = []
    for (let b = 1; b <= randInt(2, 3); b++) {
      const expiry = new Date()
      expiry.setMonth(expiry.getMonth() + randInt(12, 36))
      const qty = randInt(200, 800)
      batchData.push({
        medicineId: med.id, batchNumber: `B-${m.name.substring(0, 4).toUpperCase()}-${String(b).padStart(2, '0')}`,
        supplierId: rand(supplierRecords).id, quantity: qty, originalQuantity: qty,
        purchasePrice: Math.round(m.price * 0.7 * 100) / 100, sellingPrice: m.price, expiryDate: expiry
      })
    }
    await prisma.inventoryBatch.createMany({ data: batchData })
  }

  // Lab Test Catalog
  const labTestRecords: { id: string; name: string; code: string; price: number; type: string }[] = []
  for (const t of LAB_TESTS_DATA) {
    const test = await prisma.labTestCatalog.create({
      data: {
        name: t.name, code: t.code, category: t.category, price: t.price,
        type: t.type as any, normalRange: t.normalRange,
        parameters: t.params ? t.params : undefined, isActive: true
      }
    })
    labTestRecords.push({ id: test.id, name: t.name, code: t.code, price: t.price, type: t.type })
  }

  // Operation Theaters
  const theaterRecords: { id: string; name: string }[] = []
  const theaters = [
    { name: 'Main OT 1', type: 'MAJOR' as const },
    { name: 'Main OT 2', type: 'MAJOR' as const },
    { name: 'Minor OT', type: 'MINOR' as const },
    { name: 'Emergency OT', type: 'EMERGENCY' as const },
  ]
  for (const t of theaters) {
    const ot = await prisma.operationTheater.create({ data: { name: t.name, type: t.type, isOperational: true } })
    theaterRecords.push({ id: ot.id, name: t.name })
  }

  for (const sp of SURGERY_PROCEDURES_DATA) {
    const proc = await prisma.surgeryProcedure.create({
      data: { name: sp.name, category: sp.category, estimatedDuration: sp.duration, totalCharge: sp.charge, isActive: true }
    })
    const charges = [
      { label: 'OT Charges', type: 'OT', amount: sp.charge * 0.2 },
      { label: 'Surgeon Fee', type: 'SURGEON', amount: sp.charge * 0.4 },
      { label: 'Anesthesia', type: 'ANESTHESIA', amount: sp.charge * 0.15 },
      { label: 'Consumables', type: 'CONSUMABLES', amount: sp.charge * 0.15 },
      { label: 'Nursing', type: 'NURSING', amount: sp.charge * 0.1 },
    ]
    for (let ci = 0; ci < charges.length; ci++) {
      await prisma.surgeryChargeComponent.create({
        data: { procedureId: proc.id, chargeLabel: charges[ci].label, chargeType: charges[ci].type, amount: charges[ci].amount, sortOrder: ci }
      })
    }
  }

  // Financial Accounts
  const cashAccount = await prisma.financialAccount.create({ data: { name: 'Main Cash Drawer', type: 'CASH', openingBalance: 50000, currentBalance: 50000 } })
  const bankAccount = await prisma.financialAccount.create({ data: { name: 'HDFC Current Account', type: 'BANK', openingBalance: 500000, currentBalance: 500000 } })
  await prisma.financialAccount.create({ data: { name: 'SBI Savings Account', type: 'BANK', openingBalance: 200000, currentBalance: 200000 } })

  function getAccountForMethod(method: string): string {
    return method === 'CASH' ? cashAccount.id : bankAccount.id
  }

  // Canteen Setup
  const mealSlots = [
    { name: 'Breakfast', code: 'BF', start: '07:00', end: '09:00', order: 1 },
    { name: 'Lunch', code: 'LN', start: '12:00', end: '14:00', order: 2 },
    { name: 'Evening Snacks', code: 'ES', start: '16:00', end: '17:30', order: 3 },
    { name: 'Dinner', code: 'DN', start: '19:00', end: '21:00', order: 4 },
  ]
  const mealSlotRecords: { id: string; name: string }[] = []
  for (const ms of mealSlots) {
    const slot = await prisma.canteenMealSlot.create({ data: { name: ms.name, code: ms.code, startTime: ms.start, endTime: ms.end, sortOrder: ms.order } })
    mealSlotRecords.push({ id: slot.id, name: ms.name })
  }
  const dietPlans = [
    { name: 'Normal', code: 'NRM', description: 'Regular hospital diet' },
    { name: 'Diabetic', code: 'DIA', description: 'Low sugar, high fiber diet' },
    { name: 'Cardiac', code: 'CAR', description: 'Low sodium, low fat diet' },
    { name: 'Liquid', code: 'LIQ', description: 'Only liquids for post-operative patients' },
    { name: 'Soft', code: 'SFT', description: 'Soft foods for patients with swallowing difficulty' },
  ]
  await prisma.canteenDietPlan.createMany({ data: dietPlans })

  const menuItems = [
    { name: 'Plain Rice', cat: 'VEG' as const, sub: 'Main Course', price: 30 },
    { name: 'Dal Fry', cat: 'VEG' as const, sub: 'Main Course', price: 40 },
    { name: 'Roti (2 pcs)', cat: 'VEG' as const, sub: 'Main Course', price: 20 },
    { name: 'Mixed Veg Curry', cat: 'VEG' as const, sub: 'Main Course', price: 50 },
    { name: 'Paneer Butter Masala', cat: 'VEG' as const, sub: 'Main Course', price: 80 },
    { name: 'Chicken Curry', cat: 'NON_VEG' as const, sub: 'Main Course', price: 100 },
    { name: 'Egg Bhurji', cat: 'EGG' as const, sub: 'Main Course', price: 50 },
    { name: 'Idli Sambar', cat: 'VEG' as const, sub: 'Breakfast', price: 30 },
    { name: 'Upma', cat: 'VEG' as const, sub: 'Breakfast', price: 25 },
    { name: 'Bread Omelette', cat: 'EGG' as const, sub: 'Breakfast', price: 35 },
    { name: 'Tea', cat: 'VEG' as const, sub: 'Beverage', price: 10 },
    { name: 'Coffee', cat: 'VEG' as const, sub: 'Beverage', price: 15 },
    { name: 'Fruit Juice', cat: 'VEG' as const, sub: 'Beverage', price: 30 },
    { name: 'Curd Rice', cat: 'VEG' as const, sub: 'Main Course', price: 25 },
    { name: 'Samosa (2 pcs)', cat: 'VEG' as const, sub: 'Snacks', price: 20 },
  ]
  const menuItemRecords: { id: string; name: string; price: number }[] = []
  for (const mi of menuItems) {
    const item = await prisma.canteenMenuItem.create({
      data: { name: mi.name, category: mi.cat, subCategory: mi.sub, price: mi.price, ipdPrice: Math.round(mi.price * 0.8) }
    })
    menuItemRecords.push({ id: item.id, name: mi.name, price: mi.price })
  }

  // Ambulances
  const ambulanceRecords: { id: string; number: string }[] = []
  const ambs = [
    { num: 'OD-02-AB-1234', type: 'BASIC_LIFE_SUPPORT' as const },
    { num: 'OD-02-CD-5678', type: 'ADVANCED_LIFE_SUPPORT' as const },
    { num: 'OD-02-EF-9012', type: 'PATIENT_TRANSPORT' as const },
  ]
  for (const a of ambs) {
    const amb = await prisma.ambulance.create({ data: { vehicleNumber: a.num, type: a.type, status: 'AVAILABLE', isActive: true } })
    ambulanceRecords.push({ id: amb.id, number: a.num })
  }
  await prisma.ambulanceBillingConfig.create({ data: { id: 1 } })

  // Shifts
  const shifts = [
    { name: 'Morning A', code: 'MA', startTime: '06:00', endTime: '14:00', color: '#FFD700' },
    { name: 'Evening B', code: 'EB', startTime: '14:00', endTime: '22:00', color: '#FF8C00' },
    { name: 'Night C', code: 'NC', startTime: '22:00', endTime: '06:00', color: '#4169E1' },
  ]
  await prisma.shift.createMany({ data: shifts })

  await prisma.hospitalFee.create({ data: { name: 'Registration Fee', amount: 50, feeType: 'FIXED', applyToOPD: true, chargeOnce: true } })
  await prisma.hospitalFee.create({ data: { name: 'Admission Fee', amount: 500, feeType: 'FIXED', applyToIPD: true, chargeOnce: false } })

  // ───────────────────────────────────────────────────────────
  // PHASE 3: PATIENTS (200) - FAST
  // ───────────────────────────────────────────────────────────
  console.log('👨‍👩‍👧‍👦 PHASE 3: Creating 200 patients...')
  const patientRecords: { id: string; patientId: string; userId: string; name: string }[] = []
  const patientPromises = Array.from({ length: TOTAL_PATIENTS }).map(async (_, idx) => {
    const gender = Math.random() > 0.5 ? 'MALE' : 'FEMALE' as const
    const name = genName(gender as 'MALE' | 'FEMALE')
    const age = randInt(5, 80)
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - age)
    const user = await prisma.user.create({ data: { email: `patient${idx+1}@email.com`, name, role: 'PATIENT', isActive: true } })
    const patient = await prisma.patient.create({
      data: {
        userId: user.id, patientId: `PAT-${String(idx+1).padStart(4, '0')}`, dateOfBirth: dob, gender: gender as any,
        phone: genPhone(), address: genAddress(), city: rand(CITIES), state: 'Odisha', pincode: `76${randInt(1000, 9999)}`,
        bloodGroup: rand(BLOOD_GROUPS), emergencyContact: genPhone(), occupation: rand(OCCUPATIONS),
        nationality: 'Indian', maritalStatus: age > 22 ? rand(['Married', 'Single', 'Widowed']) : 'Single',
        fatherOrHusbandName: genName('MALE'),
      }
    })
    return { id: patient.id, patientId: patient.patientId, userId: user.id, name }
  })
  
  // Batch process patients to avoid overwhelming connection pool
  for (let i = 0; i < patientPromises.length; i += 50) {
    const batch = await Promise.all(patientPromises.slice(i, i + 50))
    patientRecords.push(...batch)
  }
  patientCounter = TOTAL_PATIENTS
  console.log(`✅ Created ${TOTAL_PATIENTS} patients\n`)

  // ───────────────────────────────────────────────────────────
  // PHASE 4: 3 MONTHS OF TRANSACTIONAL DATA - FAST PARALLEL PROCESSING
  // ───────────────────────────────────────────────────────────
  console.log('📊 PHASE 4: Generating 3 months of transactional data (Fast Parallel)...\n')

  let totalCashIncome = 0
  let totalBankIncome = 0
  let totalCashExpense = 0
  let totalBankExpense = 0

  const ipdSchedule: { admitDay: number; stayDays: number; patientIdx: number; bedIdx: number; doctorIdx: number; surgeryIdx: number | null }[] = []
  const totalDays = daysBetween(START_DATE, END_DATE)
  for (let i = 0; i < 35; i++) {
    const admitDay = randInt(0, totalDays - 10)
    const stayDays = randInt(3, 8)
    ipdSchedule.push({
      admitDay, stayDays,
      patientIdx: randInt(0, TOTAL_PATIENTS - 1),
      bedIdx: randInt(0, bedRecords.length - 1),
      doctorIdx: randInt(0, doctorRecords.length - 1),
      surgeryIdx: Math.random() > 0.5 ? randInt(0, SURGERY_PROCEDURES_DATA.length - 1) : null
    })
  }

  const ambTripDays = new Set<number>()
  for (let i = 0; i < 50; i++) ambTripDays.add(randInt(0, totalDays))

  let ambTripCounter = 0
  let canteenOrderCounter = 0

  for (let dayOffset = 0; dayOffset <= totalDays; dayOffset++) {
    const currentDate = addDays(START_DATE, dayOffset)
    const dayOfWeek = currentDate.getDay()
    const isSunday = dayOfWeek === 0
    const isToday = dayOffset === totalDays
    const isPast = dayOffset < totalDays

    if (dayOffset % 7 === 0) console.log(`  📅 Processing ${currentDate.toLocaleDateString('en-IN')}...`)

    const dayPromises: Promise<void>[] = []

    // OPD
    const numAppts = isSunday ? randInt(5, 10) : randInt(15, 30)
    for (let a = 0; a < numAppts; a++) {
      // PRE-COMPUTE SYNCHRONOUS THINGS
      const patient = rand(patientRecords)
      const doctor = rand(doctorRecords)
      const hour = randInt(9, 17)
      const minute = rand([0, 15, 30, 45])
      const appointmentDate = setTimeOfDay(currentDate, hour, minute)
      
      let status: string
      let diagnosis: string | null = null
      let chiefComplaint: string | null = rand(CHIEF_COMPLAINTS)
      if (isToday) {
        if (a < numAppts * 0.4) status = 'PENDING'
        else if (a < numAppts * 0.6) status = 'VITALS_DONE'
        else if (a < numAppts * 0.8) status = 'IN_PROGRESS'
        else status = 'COMPLETED'
      } else {
        status = Math.random() > 0.05 ? 'COMPLETED' : 'CANCELLED'
      }

      const opdBillNum = (status === 'COMPLETED' && isPast) ? nextBillNumber('OPD') : null
      const phBillNum = (status === 'COMPLETED' && isPast && Math.random() > 0.4) ? nextBillNumber('PH') : null
      const labBillNum = (status === 'COMPLETED' && isPast && Math.random() > 0.75) ? nextBillNumber('LAB') : null

      dayPromises.push((async () => {
        let vitals: any = {}
        if (status === 'COMPLETED' || status === 'IN_PROGRESS') {
          diagnosis = rand(DIAGNOSES)
          vitals = {
            pulse: `${randInt(60, 100)}`, temperature: `${randFloat(97.5, 99.5)}`,
            weight: `${randInt(40, 100)}`, height: `${randInt(140, 185)}`,
            bloodPressure: `${randInt(110, 150)}/${randInt(60, 90)}`, spo2: `${randInt(95, 100)}`
          }
        }

        const appt = await prisma.appointment.create({
          data: {
            patientId: patient.id, doctorId: doctor.id, appointmentDate, appointmentTime: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            status: status as any, reason: chiefComplaint, chiefComplaint,
            diagnosis, prescription: status === 'COMPLETED' ? 'Medication prescribed. Follow-up as advised.' : null,
            notes: status === 'COMPLETED' ? 'Patient examined and treated.' : null,
            pulse: vitals.pulse, temperature: vitals.temperature, weight: vitals.weight, height: vitals.height,
            bloodPressure: vitals.bloodPressure, spo2: vitals.spo2,
          }
        })

        if (status === 'COMPLETED' && isPast) {
          const payMethod = randPaymentMethod()
          const opdBill = await prisma.billing.create({
            data: {
              billNumber: opdBillNum!, patientId: patient.id, appointmentId: appt.id, type: 'OPD', billDate: appointmentDate,
              totalAmount: doctor.fee, taxAmount: 0, netAmount: doctor.fee, paidAmount: doctor.fee, balanceAmount: 0,
              status: 'PAID', paymentMethod: payMethod
            }
          })
          await prisma.billingItem.create({ data: { billingId: opdBill.id, description: `Consultation - ${doctor.dept}`, quantity: 1, unitPrice: doctor.fee, amount: doctor.fee, gstRate: 0, gstAmount: 0, totalAmount: doctor.fee, serviceCategory: 'CONSULTATION', serviceDate: appointmentDate } })
          await prisma.payment.create({ data: { billingId: opdBill.id, amount: doctor.fee, method: payMethod as any, paymentDate: appointmentDate } })
          await prisma.transaction.create({ data: { accountId: getAccountForMethod(payMethod), type: 'INCOME', amount: doctor.fee, category: 'PATIENT_BILL', paymentMethod: payMethod, referenceId: opdBill.id, description: `OPD Consultation - ${patient.name}`, date: appointmentDate } })
          if (payMethod === 'CASH') totalCashIncome += doctor.fee; else totalBankIncome += doctor.fee;

          if (phBillNum) {
            const numMeds = randInt(1, 5)
            const selectedMeds = []
            let billTaxable = 0, billTax = 0
            for (let m = 0; m < numMeds; m++) {
              const med = rand(medicineRecords)
              const qty = randInt(5, 30)
              const taxableAmount = med.price * qty
              const gstAmount = Math.round(taxableAmount * med.gstRate / 100 * 100) / 100
              const totalAmount = Math.round((taxableAmount + gstAmount) * 100) / 100
              billTaxable += taxableAmount; billTax += gstAmount;
              selectedMeds.push({ medicineId: med.id, medicineName: med.name, qty, unitPrice: med.price, taxableAmount, gstRate: med.gstRate, gstAmount, totalAmount, batchRef: `B-${med.name.substring(0, 4).toUpperCase()}-01` })
            }
            const billNet = Math.round((billTaxable + billTax) * 100) / 100
            const phPayMethod = randPaymentMethod()

            const phBill = await prisma.billing.create({
              data: {
                billNumber: phBillNum, patientId: patient.id, appointmentId: appt.id, type: 'PHARMACY', billDate: appointmentDate,
                totalAmount: Math.round(billTaxable * 100) / 100, taxAmount: Math.round(billTax * 100) / 100, netAmount: billNet, paidAmount: billNet, balanceAmount: 0,
                status: 'PAID', paymentMethod: phPayMethod
              }
            })
            await prisma.billingItem.createMany({
              data: selectedMeds.map(sm => ({ billingId: phBill.id, description: `${sm.medicineName} (Batch: ${sm.batchRef})`, quantity: sm.qty, unitPrice: sm.unitPrice, amount: sm.taxableAmount, gstRate: sm.gstRate, gstAmount: sm.gstAmount, totalAmount: sm.totalAmount, serviceCategory: 'PHARMACY', serviceDate: appointmentDate }))
            })
            await prisma.payment.create({ data: { billingId: phBill.id, amount: billNet, method: phPayMethod as any, paymentDate: appointmentDate } })
            await prisma.transaction.create({ data: { accountId: getAccountForMethod(phPayMethod), type: 'INCOME', amount: billNet, category: 'PATIENT_BILL', paymentMethod: phPayMethod, referenceId: phBill.id, description: `Pharmacy Sale - ${patient.name}`, date: appointmentDate } })
            if (phPayMethod === 'CASH') totalCashIncome += billNet; else totalBankIncome += billNet;
          }

          if (labBillNum) {
            const numTests = randInt(1, 3)
            let labBillTotal = 0
            const testsToCreate = []
            for (let t = 0; t < numTests; t++) {
              const test = rand(labTestRecords)
              labBillTotal += test.price
              testsToCreate.push(test)
            }
            const labPayMethod = randPaymentMethod()
            const labBill = await prisma.billing.create({
              data: {
                billNumber: labBillNum, patientId: patient.id, appointmentId: appt.id, type: 'LABORATORY', billDate: appointmentDate,
                totalAmount: labBillTotal, taxAmount: 0, netAmount: labBillTotal, paidAmount: labBillTotal, balanceAmount: 0, status: 'PAID', paymentMethod: labPayMethod
              }
            })
            
            for (const test of testsToCreate) {
              await prisma.labRequest.create({
                data: { patientId: patient.id, appointmentId: appt.id, orderedBy: doctor.id, testCatalogId: test.id, testName: test.name, testPrice: test.price, testType: test.type as any, status: 'COMPLETED', billingId: labBill.id, completedAt: appointmentDate, reportContent: `Test performed. Normal limits.`, impression: 'Normal study' }
              })
            }
            await prisma.billingItem.createMany({
              data: testsToCreate.map(test => ({ billingId: labBill.id, description: `Lab Test: ${test.name}`, quantity: 1, unitPrice: test.price, amount: test.price, gstRate: 0, gstAmount: 0, totalAmount: test.price, serviceCategory: 'LABORATORY', serviceDate: appointmentDate }))
            })
            await prisma.payment.create({ data: { billingId: labBill.id, amount: labBillTotal, method: labPayMethod as any, paymentDate: appointmentDate } })
            await prisma.transaction.create({ data: { accountId: getAccountForMethod(labPayMethod), type: 'INCOME', amount: labBillTotal, category: 'PATIENT_BILL', paymentMethod: labPayMethod, referenceId: labBill.id, description: `Lab Tests - ${patient.name}`, date: appointmentDate } })
            if (labPayMethod === 'CASH') totalCashIncome += labBillTotal; else totalBankIncome += labBillTotal;
          }
        }
      })())
    }

    // IPD
    for (const ipd of ipdSchedule) {
      if (ipd.admitDay === dayOffset) {
        const ipdBillNum = nextBillNumber('IPD')
        const otBillNum = nextBillNumber('OT')
        dayPromises.push((async () => {
          const patient = patientRecords[ipd.patientIdx]
          const doctor = doctorRecords[ipd.doctorIdx]
          const bed = bedRecords[ipd.bedIdx]
          const admitDate = setTimeOfDay(currentDate, randInt(8, 16), 0)
          const dischargeDate = addDays(admitDate, ipd.stayDays)
          const isCurrentlyAdmitted = dischargeDate > END_DATE
          const deposit = randInt(10000, 30000)
          const bedCharges = bed.price * ipd.stayDays
          const labCharges = randInt(500, 3000)
          const pharmacyCharges = randInt(1000, 5000)
          const totalBill = bedCharges + labCharges + pharmacyCharges
          const admission = await prisma.iPDAdmission.create({
            data: {
              patientId: patient.id, bedId: bed.id, primaryDoctorId: doctor.id, admissionDate: admitDate, status: isCurrentlyAdmitted ? 'ADMITTED' : 'DISCHARGED', dischargeDate: isCurrentlyAdmitted ? null : dischargeDate, reason: rand(DIAGNOSES), diagnosis: rand(DIAGNOSES), initialDeposit: deposit, dischargeType: isCurrentlyAdmitted ? null : 'NORMAL', dischargeSummary: isCurrentlyAdmitted ? null : 'Patient recovered.', totalBedCharges: bedCharges, totalLabCharges: labCharges, totalPharmacyCharges: pharmacyCharges, totalBillAmount: totalBill, amountPaid: isCurrentlyAdmitted ? deposit : totalBill, balanceDue: isCurrentlyAdmitted ? totalBill - deposit : 0,
            }
          })

          const notesData = []
          for (let d = 0; d < Math.min(ipd.stayDays, 10); d++) {
            notesData.push({ admissionId: admission.id, authorId: doctor.userId, authorName: `Dr. ${patient.name}`, date: addDays(admitDate, d), note: `Day ${d + 1}: Vitals stable.`, bp: `120/80`, pulse: `72`, temperature: `98.6`, spO2: `98%` })
          }
          await prisma.clinicalNote.createMany({ data: notesData })

          if (!isCurrentlyAdmitted) {
            await prisma.discharge.create({ data: { admissionId: admission.id, dischargeDate, type: 'NORMAL', summary: 'Patient recovered.', totalBillAmount: totalBill, amountPaid: totalBill, balanceDue: 0 } })
            const ipdPayMethod = randPaymentMethod()
            const ipdBill = await prisma.billing.create({
              data: { billNumber: ipdBillNum, patientId: patient.id, type: 'IPD', billDate: dischargeDate, totalAmount: totalBill, taxAmount: 0, netAmount: totalBill, paidAmount: totalBill, balanceAmount: 0, status: 'PAID', paymentMethod: ipdPayMethod }
            })
            await prisma.billingItem.createMany({
              data: [
                { billingId: ipdBill.id, description: `Bed Charges (${bed.wardName})`, quantity: ipd.stayDays, unitPrice: bed.price, amount: bedCharges, gstRate: 0, gstAmount: 0, totalAmount: bedCharges, serviceCategory: 'ROOM_RENT' },
                { billingId: ipdBill.id, description: 'Lab Investigations', quantity: 1, unitPrice: labCharges, amount: labCharges, gstRate: 0, gstAmount: 0, totalAmount: labCharges, serviceCategory: 'LABORATORY' },
                { billingId: ipdBill.id, description: 'Pharmacy', quantity: 1, unitPrice: pharmacyCharges, amount: pharmacyCharges, gstRate: 0, gstAmount: 0, totalAmount: pharmacyCharges, serviceCategory: 'PHARMACY' }
              ]
            })
            await prisma.payment.create({ data: { billingId: ipdBill.id, amount: totalBill, method: ipdPayMethod as any, paymentDate: dischargeDate } })
            await prisma.transaction.create({ data: { accountId: getAccountForMethod(ipdPayMethod), type: 'INCOME', amount: totalBill, category: 'PATIENT_BILL', paymentMethod: ipdPayMethod, referenceId: ipdBill.id, description: `IPD Discharge - ${patient.name}`, date: dischargeDate } })
            if (ipdPayMethod === 'CASH') totalCashIncome += totalBill; else totalBankIncome += totalBill;
          }

          if (ipd.surgeryIdx !== null) {
            const proc = SURGERY_PROCEDURES_DATA[ipd.surgeryIdx]
            const surgDate = addDays(admitDate, 1)
            await prisma.surgery.create({
              data: { patientId: patient.id, leadSurgeonId: doctor.id, theaterId: rand(theaterRecords).id, procedureName: proc.name, category: proc.category, scheduledDate: surgDate, durationMinutes: proc.duration, actualStartTime: setTimeOfDay(surgDate, 9, 0), actualEndTime: setTimeOfDay(surgDate, 10, 0), status: 'COMPLETED', pacStatus: 'FIT', estimatedCost: proc.charge, actualCost: proc.charge, diagnosis: rand(DIAGNOSES), surgeryCharge: proc.charge, paymentStatus: 'PAID', }
            })
            const otBill = await prisma.billing.create({
              data: { billNumber: otBillNum, patientId: patient.id, type: 'OT', billDate: surgDate, totalAmount: proc.charge, taxAmount: 0, netAmount: proc.charge, paidAmount: proc.charge, balanceAmount: 0, status: 'PAID', paymentMethod: 'CASH' }
            })
            await prisma.billingItem.create({ data: { billingId: otBill.id, description: `Surgery: ${proc.name}`, quantity: 1, unitPrice: proc.charge, amount: proc.charge, gstRate: 0, gstAmount: 0, totalAmount: proc.charge, serviceCategory: 'SURGERY' } })
            await prisma.payment.create({ data: { billingId: otBill.id, amount: proc.charge, method: 'CASH', paymentDate: surgDate } })
            await prisma.transaction.create({ data: { accountId: cashAccount.id, type: 'INCOME', amount: proc.charge, category: 'PATIENT_BILL', paymentMethod: 'CASH', referenceId: otBill.id, description: `Surgery: ${proc.name} - ${patient.name}`, date: surgDate } })
            totalCashIncome += proc.charge
          }
        })())
      }
    }

    // Canteen
    if (isPast) {
      const numCanteenOrders = isSunday ? randInt(2, 5) : randInt(5, 12)
      for (let c = 0; c < numCanteenOrders; c++) {
        canteenOrderCounter++
        const orderNum = `CMO-2026-${String(canteenOrderCounter).padStart(4, '0')}`
        const canBillNum = nextBillNumber('CAN')
        dayPromises.push((async () => {
          const isWalkIn = Math.random() > 0.5
          const mealSlot = rand(mealSlotRecords)
          const numItems = randInt(1, 4)
          let orderTotal = 0
          const itemsData = []
          for (let ci = 0; ci < numItems; ci++) {
            const menuItem = rand(menuItemRecords)
            const qty = randInt(1, 2)
            const total = menuItem.price * qty
            orderTotal += total
            itemsData.push({ menuItemId: menuItem.id, itemName: menuItem.name, quantity: qty, unitPrice: menuItem.price, totalPrice: total })
          }

          const order = await prisma.canteenMealOrder.create({
            data: { orderNumber: orderNum, orderType: isWalkIn ? 'WALK_IN' : 'IPD', mealSlotId: mealSlot.id, orderDate: setTimeOfDay(currentDate, 12, 0), status: 'SERVED', servedAt: setTimeOfDay(currentDate, 12, 30), totalAmount: orderTotal }
          })
          await prisma.canteenMealOrderItem.createMany({ data: itemsData.map(i => ({ orderId: order.id, ...i })) })

          if (isWalkIn) {
            const pat = rand(patientRecords)
            const canBill = await prisma.billing.create({
              data: { billNumber: canBillNum, patientId: pat.id, type: 'CANTEEN', billDate: currentDate, totalAmount: orderTotal, taxAmount: 0, netAmount: orderTotal, paidAmount: orderTotal, balanceAmount: 0, status: 'PAID', paymentMethod: 'CASH' }
            })
            await prisma.billingItem.create({ data: { billingId: canBill.id, description: `Canteen`, quantity: 1, unitPrice: orderTotal, amount: orderTotal, gstRate: 0, gstAmount: 0, totalAmount: orderTotal, serviceCategory: 'CANTEEN' } })
            await prisma.transaction.create({ data: { accountId: cashAccount.id, type: 'INCOME', amount: orderTotal, category: 'PATIENT_BILL', paymentMethod: 'CASH', referenceId: canBill.id, description: `Canteen Sale`, date: currentDate } })
            totalCashIncome += orderTotal
          }
        })())
      }
    }

    // Ambulance
    if (ambTripDays.has(dayOffset) && isPast) {
      ambTripCounter++
      const tripNum = `AMB-TRIP-2026-${String(ambTripCounter).padStart(4, '0')}`
      const ambBillNum = nextBillNumber('AMB')
      dayPromises.push((async () => {
        const amb = rand(ambulanceRecords)
        const pat = rand(patientRecords)
        const dist = randFloat(5, 50)
        const totalCharge = 500 + Math.round(dist * 15 * 100) / 100

        const trip = await prisma.ambulanceTrip.create({
          data: { tripNumber: tripNum, ambulanceId: amb.id, patientId: pat.id, patientName: pat.name, patientPhone: genPhone(), pickupLocation: genAddress(), dropLocation: HOSPITAL_NAME, distanceKm: dist, status: 'COMPLETED', requestedAt: currentDate, completedAt: currentDate, chiefComplaint: rand(CHIEF_COMPLAINTS) }
        })
        await prisma.ambulanceBilling.create({ data: { tripId: trip.id, bookingFee: 500, perKmRate: 15, distanceKm: dist, distanceCharge: totalCharge - 500, totalAmount: totalCharge, paymentStatus: 'PAID', paymentMethod: 'CASH', paidAt: currentDate } })
        const ambBill = await prisma.billing.create({
          data: { billNumber: ambBillNum, patientId: pat.id, type: 'AMBULANCE', billDate: currentDate, totalAmount: totalCharge, taxAmount: 0, netAmount: totalCharge, paidAmount: totalCharge, balanceAmount: 0, status: 'PAID', paymentMethod: 'CASH' }
        })
        await prisma.billingItem.create({ data: { billingId: ambBill.id, description: `Ambulance Trip ${tripNum}`, quantity: 1, unitPrice: totalCharge, amount: totalCharge, gstRate: 0, gstAmount: 0, totalAmount: totalCharge, serviceCategory: 'AMBULANCE' } })
        await prisma.transaction.create({ data: { accountId: cashAccount.id, type: 'INCOME', amount: totalCharge, category: 'PATIENT_BILL', paymentMethod: 'CASH', referenceId: ambBill.id, description: `Ambulance Trip - ${pat.name}`, date: currentDate } })
        totalCashIncome += totalCharge
      })())
    }

    if (isPast && !isSunday) {
      dayPromises.push((async () => {
        const expenseAmount = randInt(200, 1000)
        await prisma.transaction.create({ data: { accountId: cashAccount.id, type: 'EXPENSE', amount: expenseAmount, category: 'UTILITY', paymentMethod: 'CASH', description: 'Daily Utility / Misc Expense', date: currentDate } })
        totalCashExpense += expenseAmount
      })())
    }

    // Execute day batch in parallel
    if (dayPromises.length > 0) {
      // Chunking if necessary, but 50-80 concurrent inserts is fine for Postgres
      await Promise.all(dayPromises)
    }
  }

  console.log('\n  ✅ Daily transactional data complete\n')

  // ───────────────────────────────────────────────────────────
  // PHASE 5: MONTHLY OPERATIONS
  // ───────────────────────────────────────────────────────────
  console.log('💵 PHASE 5: Monthly operations (salary, purchases)...\n')

  const months = [
    { name: 'March', year: 2026, label: 'MARCH', date: new Date('2026-03-31T00:00:00+05:30') },
    { name: 'April', year: 2026, label: 'APRIL', date: new Date('2026-04-30T00:00:00+05:30') },
    { name: 'May', year: 2026, label: 'MAY', date: new Date('2026-05-20T00:00:00+05:30') },
  ]

  const employees = await prisma.employee.findMany()
  for (const m of months) {
    console.log(`  📅 ${m.name} ${m.year}:`)
    let monthSalaryTotal = 0
    const salaryData = []
    for (const emp of employees) {
      const bonus = Math.random() > 0.9 ? randInt(1000, 5000) : 0
      const deductions = randInt(500, 2000)
      const net = emp.basicSalary + bonus - deductions
      salaryData.push({ employeeId: emp.id, month: m.label, year: m.year, amountPaid: net, bonus, deductions, status: 'PAID' as any, paymentDate: m.date })
      monthSalaryTotal += net
    }
    await prisma.salaryRecord.createMany({ data: salaryData })
    await prisma.transaction.create({ data: { accountId: bankAccount.id, type: 'EXPENSE', amount: monthSalaryTotal, category: 'SALARY', paymentMethod: 'BANK_TRANSFER', description: `Staff Salary - ${m.name} ${m.year}`, date: m.date } })
    totalBankExpense += monthSalaryTotal
    console.log(`    ✓ Salary: ₹${monthSalaryTotal.toLocaleString('en-IN')}`)

    for (const sup of supplierRecords) {
      const numItems = randInt(5, 12)
      let subTotal = 0, taxTotal = 0
      const purchaseDate = new Date(m.date)
      purchaseDate.setDate(randInt(1, 15))

      const invoice = await prisma.purchaseInvoice.create({
        data: { invoiceNumber: `PI-${sup.name.substring(0, 3).toUpperCase()}-${m.label}-${randInt(100, 999)}`, date: purchaseDate, supplierId: sup.id, subTotal: 0, taxTotal: 0, grandTotal: 0, amountPaid: 0, status: 'PAID' }
      })

      const pItemsData = []
      for (let pi = 0; pi < numItems; pi++) {
        const med = rand(medicineRecords)
        const qty = randInt(50, 300)
        const rate = Math.round(med.price * 0.7 * 100) / 100
        const itemTax = Math.round(qty * rate * med.gstRate / 100 * 100) / 100
        const itemTotal = Math.round((qty * rate + itemTax) * 100) / 100
        subTotal += qty * rate; taxTotal += itemTax;
        pItemsData.push({ invoiceId: invoice.id, itemName: med.name, medicineId: med.id, batchNumber: `B-${med.name.substring(0, 4).toUpperCase()}-${String(pi + 1).padStart(2, '0')}`, hsnCode: med.hsnCode, quantity: qty, rate, sellPrice: med.price, taxPercent: med.gstRate, totalAmount: itemTotal })
      }
      await prisma.purchaseItem.createMany({ data: pItemsData })
      const grandTotal = Math.round((subTotal + taxTotal) * 100) / 100
      await prisma.purchaseInvoice.update({ where: { id: invoice.id }, data: { subTotal: Math.round(subTotal * 100) / 100, taxTotal: Math.round(taxTotal * 100) / 100, grandTotal, amountPaid: grandTotal } })
      await prisma.transaction.create({ data: { accountId: bankAccount.id, type: 'EXPENSE', amount: grandTotal, category: 'PURCHASE', paymentMethod: 'BANK_TRANSFER', referenceId: invoice.id, description: `Medicine Purchase - ${sup.name}`, date: purchaseDate } })
      totalBankExpense += grandTotal
    }

    const rent = 50000; const maintenance = randInt(10000, 25000);
    await prisma.transaction.createMany({ data: [
      { accountId: bankAccount.id, type: 'EXPENSE', amount: rent, category: 'UTILITY', paymentMethod: 'BANK_TRANSFER', description: `Monthly Rent - ${m.name}`, date: m.date },
      { accountId: bankAccount.id, type: 'EXPENSE', amount: maintenance, category: 'UTILITY', paymentMethod: 'BANK_TRANSFER', description: `Building Maintenance - ${m.name}`, date: m.date }
    ]})
    totalBankExpense += rent + maintenance
  }

  // ───────────────────────────────────────────────────────────
  // PHASE 6: UPDATE ACCOUNT BALANCES
  // ───────────────────────────────────────────────────────────
  await prisma.financialAccount.update({ where: { id: cashAccount.id }, data: { currentBalance: 50000 + totalCashIncome - totalCashExpense } })
  await prisma.financialAccount.update({ where: { id: bankAccount.id }, data: { currentBalance: 500000 + totalBankIncome - totalBankExpense } })

  console.log('\n═══════════════════════════════════════════════════')
  console.log('✨ SEEDING COMPLETED SUCCESSFULLY!')
  console.log('═══════════════════════════════════════════════════\n')

  console.log('🔐 Login Credentials:')
  console.log('  Admin: admin@hospital.com / Admin123')
  console.log('  Doctor: doctor1@hospital.com / doctor123')
}

main().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); })
