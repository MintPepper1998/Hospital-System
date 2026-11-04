import { PrismaClient, Role, Gender } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

// Indian first names
const maleFirstNames = [
  "Rajesh", "Amit", "Suresh", "Vijay", "Rahul", "Anil", "Manoj", "Sanjay",
  "Ravi", "Prakash", "Ashok", "Deepak", "Ramesh", "Sandeep", "Vikas",
  "Ajay", "Nitin", "Kiran", "Vishal", "Mukesh", "Arun", "Mahesh",
  "Arjun", "Rohan", "Akash", "Naveen", "Dinesh", "Pradeep", "Mohan"
]

const femaleFirstNames = [
  "Priya", "Anjali", "Pooja", "Neha", "Sneha", "Kavita", "Asha", "Rekha",
  "Sunita", "Sita", "Geeta", "Meera", "Anita", "Radha", "Poonam",
  "Nikita", "Simran", "Ritu", "Divya", "Shruti", "Pallavi", "Swati",
  "Jyoti", "Nisha", "Manisha", "Sapna", "Komal", "Preeti", "Rina"
]

const lastNames = [
  "Kumar", "Sharma", "Singh", "Patel", "Gupta", "Reddy", "Shah", "Mehta",
  "Verma", "Joshi", "Rao", "Nair", "Iyer", "Desai", "Agarwal", "Chopra",
  "Malhotra", "Kapoor", "Pillai", "Menon", "Bhat", "Shetty", "Kulkarni",
  "Jain", "Bansal", "Saxena", "Mishra", "Pandey", "Tiwari", "Yadav"
]

const cities = [
  "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata", "Hyderabad",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Nagpur", "Indore",
  "Chandigarh", "Kochi", "Visakhapatnam", "Surat", "Coimbatore"
]

const states = [
  "Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "West Bengal",
  "Telangana", "Gujarat", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh",
  "Punjab", "Kerala", "Andhra Pradesh"
]

const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]

const doctorSpecializations = [
  { name: "Cardiology", dept: "Cardiology", fee: 800 },
  { name: "Orthopedics", dept: "Orthopedics", fee: 700 },
  { name: "General Surgery", dept: "Surgery", fee: 650 },
  { name: "Pediatrics", dept: "Pediatrics", fee: 600 },
  { name: "Neurology", dept: "Neurology", fee: 900 },
  { name: "Gynecology", dept: "Gynecology", fee: 750 },
  { name: "ENT", dept: "ENT", fee: 550 },
  { name: "Dermatology", dept: "Dermatology", fee: 600 },
  { name: "Ophthalmology", dept: "Ophthalmology", fee: 650 },
  { name: "Psychiatry", dept: "Psychiatry", fee: 700 },
  { name: "Gastroenterology", dept: "Gastroenterology", fee: 750 },
  { name: "Pulmonology", dept: "Pulmonology", fee: 700 }
]

function randomFromArray<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomAge(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomPhone(): string {
  return `${randomFromArray(['98', '97', '96', '95', '94', '93', '92', '91', '90', '89'])}${Math.floor(10000000 + Math.random() * 90000000)}`
}

function randomPincode(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function seedDoctors() {
  console.log("\n👨‍⚕️ Seeding Doctors...")
  
  const hashedPassword = await hash("doctor123", 10)
  const doctorUsers = []

  for (let i = 0; i < 12; i++) {
    const spec = doctorSpecializations[i]
    const gender = i % 2 === 0 ? Gender.MALE : Gender.FEMALE
    const firstName = gender === Gender.MALE 
      ? randomFromArray(maleFirstNames) 
      : randomFromArray(femaleFirstNames)
    const lastName = randomFromArray(lastNames)
    const fullName = `Dr. ${firstName} ${lastName}`
    const email = `dr.${firstName.toLowerCase()}.${lastName.toLowerCase()}@hospital.com`
    const employeeId = `DOC${String(i + 1).padStart(3, '0')}`
    const licenseNumber = `MCI${String(Math.floor(100000 + Math.random() * 900000))}`

    try {
      // Check if doctor already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        console.log(`⏭️  Skipping ${fullName} (already exists)`)
        continue
      }

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: fullName,
          role: Role.DOCTOR,
          isActive: true,
          staff: {
            create: {
              employeeId,
              department: spec.dept,
              designation: "Senior Consultant",
              specialization: spec.name,
              licenseNumber,
              phone: randomPhone(),
              consultationFee: spec.fee,
              address: `${Math.floor(Math.random() * 500) + 1}, ${randomFromArray(['MG Road', 'Park Street', 'Residency Road', 'Nehru Nagar'])}`,
              joiningDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
            }
          }
        }
      })

      doctorUsers.push(user)
      console.log(`✅ Created: ${fullName} - ${spec.name} (Fee: ₹${spec.fee})`)
    } catch (error: any) {
      console.error(`❌ Error creating ${fullName}:`, error.message)
    }
  }

  return doctorUsers
}

async function seedPatients() {
  console.log("\n👥 Seeding Patients...")
  
  const hashedPassword = await hash("patient123", 10)
  let successCount = 0

  for (let i = 0; i < 100; i++) {
    const gender = i % 3 === 0 ? Gender.FEMALE : i % 3 === 1 ? Gender.MALE : Gender.OTHER
    const firstName = gender === Gender.MALE 
      ? randomFromArray(maleFirstNames) 
      : gender === Gender.FEMALE 
      ? randomFromArray(femaleFirstNames)
      : randomFromArray([...maleFirstNames, ...femaleFirstNames])
    const lastName = randomFromArray(lastNames)
    const fullName = `${firstName} ${lastName}`
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@patient.com`
    const patientId = `PAT${new Date().getFullYear()}${String(i + 1).padStart(4, '0')}`
    const age = randomAge(1, 85)
    const dateOfBirth = new Date(new Date().getFullYear() - age, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
    const city = randomFromArray(cities)
    const state = randomFromArray(states)

    try {
      // Check if patient already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        console.log(`⏭️  Skipping ${fullName} (email exists)`)
        continue
      }

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: fullName,
          role: Role.PATIENT,
          isActive: true,
          patient: {
            create: {
              patientId,
              dateOfBirth,
              gender,
              bloodGroup: randomFromArray(bloodGroups),
              phone: randomPhone(),
              emergencyContact: randomPhone(),
              address: `${Math.floor(Math.random() * 500) + 1}, ${randomFromArray(['Main Street', 'Gandhi Road', 'Nehru Nagar', 'Shastri Colony', 'Lal Bahadur Nagar'])}`,
              city,
              state,
              pincode: randomPincode(),
              medicalHistory: i % 5 === 0 ? randomFromArray([
                "Diabetes mellitus type 2",
                "Hypertension",
                "Asthma",
                "Hypothyroidism",
                "No significant history"
              ]) : null,
              allergies: i % 7 === 0 ? randomFromArray([
                "Penicillin allergy",
                "Peanut allergy",
                "Sulfa drug allergy",
                "No known allergies"
              ]) : null
            }
          }
        }
      })

      successCount++
      if (successCount % 10 === 0) {
        console.log(`✅ Created ${successCount} patients...`)
      }
    } catch (error: any) {
      console.error(`❌ Error creating patient ${i + 1}:`, error.message)
    }
  }

  console.log(`\n✅ Successfully created ${successCount} patients!`)
}

async function main() {
  try {
    console.log("🏥 Starting Hospital Data Seeding...")
    console.log("=" .repeat(60))

    // Seed doctors first
    await seedDoctors()

    // Then seed patients
    await seedPatients()

    console.log("\n" + "=".repeat(60))
    console.log("🎉 Seeding completed successfully!")
    console.log("\n📊 Summary:")
    
    const doctorCount = await prisma.staff.count()
    const patientCount = await prisma.patient.count()
    
    console.log(`👨‍⚕️  Total Doctors: ${doctorCount}`)
    console.log(`👥 Total Patients: ${patientCount}`)
    
    console.log("\n🔑 Login Credentials:")
    console.log("Doctors: dr.[firstname].[lastname]@hospital.com / doctor123")
    console.log("Patients: [firstname].[lastname][number]@patient.com / patient123")
    console.log("\nExample Doctor: dr.rajesh.kumar@hospital.com / doctor123")
    console.log("Example Patient: priya.sharma1@patient.com / patient123")
    
  } catch (error) {
    console.error("\n❌ Seeding failed:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
