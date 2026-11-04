import { prisma } from "@/lib/prisma"
import { BookingForm } from "@/components/booking/booking-form"
import Header from "@/components/landing/header"
import Footer from "@/components/landing/footer"

// Prevent static prerendering — this page needs a live DB connection
export const dynamic = "force-dynamic"

export const metadata = {
  title: "Book Appointment | Shree Kamal Hospital",
  description:
    "Book an appointment online at Shree Kamal Hospital. Choose your department, preferred doctor, and convenient time slot. No registration required.",
}

export default async function BookAppointmentPage() {
  // Fetch departments from active doctors
  const departments = await prisma.staff.findMany({
    where: {
      user: { role: "DOCTOR", isActive: true },
      department: { not: null },
    },
    select: { department: true },
    distinct: ["department"],
    orderBy: { department: "asc" },
  })

  const departmentList = departments
    .map((d) => d.department)
    .filter(Boolean) as string[]

  // Fetch available doctors with schedules
  const doctors = await prisma.staff.findMany({
    where: {
      user: { role: "DOCTOR", isActive: true },
      isOnLeave: false,
    },
    select: {
      id: true,
      department: true,
      specialization: true,
      consultationFee: true,
      user: {
        select: { name: true },
      },
      doctorSchedules: {
        where: { isActive: true },
        select: {
          dayOfWeek: true,
          startTime: true,
          endTime: true,
          slotDuration: true,
          maxPatients: true,
        },
      },
    },
    orderBy: { user: { name: "asc" } },
  })

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <Header />

      {/* Decorative top spacer for fixed header */}
      <div className="pt-28 md:pt-32" />

      {/* Heading area */}
      <div className="container mx-auto px-6 mb-8">
        <div className="text-center max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-8 h-[2px] bg-[#13A89E]" />
            <span className="text-[#13A89E] text-sm font-semibold tracking-wider uppercase">
              Schedule a Visit
            </span>
            <div className="w-8 h-[2px] bg-[#13A89E]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#0B2545] mb-3">
            Book Your <span className="text-[#13A89E]">Appointment</span>
          </h1>
          <p className="text-[#6B7280]">
            Choose your department, preferred doctor, and a convenient time
            slot. No registration required for your first visit.
          </p>
        </div>
      </div>

      <main className="container mx-auto px-6 pb-16">
        <BookingForm departments={departmentList} doctors={doctors} />
      </main>

      <Footer />
    </div>
  )
}
