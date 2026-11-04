import AnatomyViewer from "@/components/dashboard/patient-ui/anatomy-viewer";
import HealthChart from "@/components/dashboard/patient-ui/health-chart";
import UpcomingAppointment from "@/components/dashboard/patient-ui/upcoming-appointment";
import RecentTests from "@/components/dashboard/patient-ui/recent-tests";
import FitnessRate from "@/components/dashboard/patient-ui/fitness-rate";
import DoctorsList from "@/components/dashboard/patient-ui/doctors-list";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function PatientDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/patient-login");

  // Get patient
  const patient = await prisma.patient.findFirst({
    where: { userId: session.user.id }
  });

  if (!patient) {
    return <div className="p-8 text-center text-gray-500">Patient profile not found. Please complete your registration.</div>;
  }

  // Upcoming appointment
  const upcomingAppt = await prisma.appointment.findFirst({
    where: {
      patientId: patient.id,
      status: { in: ["PENDING", "SCHEDULED", "CONFIRMED"] },
      appointmentDate: { gte: new Date() }
    },
    orderBy: { appointmentDate: "asc" },
    include: {
      doctor: {
        include: { user: true }
      }
    }
  });

  // Pending online booking (shown when no confirmed appointment exists)
  const pendingBooking = !upcomingAppt ? await prisma.onlineBooking.findFirst({
    where: {
      OR: [
        { patientId: patient.id },
        ...(patient.phone ? [{ phone: patient.phone }] : []),
      ],
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    include: {
      preferredDoctor: {
        include: { user: true }
      }
    }
  }) : null;

  // Recent tests
  const recentTests = await prisma.labRequest.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { results: true },
  });

  // Doctors list (distinct doctors from past appointments)
  const pastAppts = await prisma.appointment.findMany({
    where: { patientId: patient.id },
    include: {
      doctor: {
        include: { user: true }
      }
    },
    orderBy: { appointmentDate: "desc" }
  });
  
  // Get unique doctors
  const doctorMap = new Map();
  pastAppts.forEach((appt: any) => {
    if (appt.doctor && !doctorMap.has(appt.doctorId)) {
      doctorMap.set(appt.doctorId, appt.doctor);
    }
  });
  const doctorsFromPast = Array.from(doctorMap.values()).slice(0, 4);

  // ── IPD Admission & Vitals ──
  // Check if patient is currently admitted in IPD
  const activeAdmission = await prisma.iPDAdmission.findFirst({
    where: {
      patientId: patient.id,
      status: "ADMITTED",
    },
    include: {
      clinicalNotes: {
        orderBy: { date: "desc" },
        take: 10, // last 10 vitals entries
      },
      bed: {
        include: { ward: true }
      },
      primaryDoctor: {
        include: { user: true }
      }
    }
  });

  const isAdmitted = !!activeAdmission;

  // Build vitals from the latest clinical note
  const latestNote = activeAdmission?.clinicalNotes?.[0];
  const vitals = isAdmitted && latestNote ? {
    heartRate: latestNote.pulse || null,
    bloodPressure: latestNote.bp || null,
    temperature: latestNote.temperature || null,
    spO2: latestNote.spO2 || null,
    respiratoryRate: latestNote.respiratoryRate || null,
  } : null;

  // Build chart data from clinical notes (most recent 7 entries, reversed for chronological order)
  const chartData = isAdmitted && activeAdmission?.clinicalNotes?.length
    ? activeAdmission.clinicalNotes
        .slice(0, 7)
        .reverse()
        .map((note: any, idx: number) => {
          // Parse pulse: "72 bpm" -> 72
          const pulse = parseInt(note.pulse?.replace(/[^\d]/g, '') || '0', 10);
          // Parse BP: "120/80" -> systolic 120
          const bpStr = note.bp || '';
          const bpMatch = bpStr.match(/(\d+)\s*\/\s*(\d+)/);
          const systolic = bpMatch ? parseInt(bpMatch[1], 10) : 0;
          // Parse temperature: "98.6°F" -> 98.6
          const temp = parseFloat(note.temperature?.replace(/[^\d.]/g, '') || '0');
          // Parse SpO2: "98%" -> 98
          const spo2 = parseInt(note.spO2?.replace(/[^\d]/g, '') || '0', 10);

          const days = ['Sa', 'Su', 'Mo', 'Tu', 'Wed', 'Th', 'Fr'];
          const noteDate = new Date(note.date);
          const dayName = days[noteDate.getDay()] || `D${idx + 1}`;

          return {
            name: dayName,
            heartRate: pulse,
            bp: systolic,
            spo2: spo2,
            temperature: temp,
          };
        })
    : [];

  // ── Fetch departments & doctors for the Quick Book Modal ──
  const departmentsRaw = await prisma.staff.findMany({
    where: {
      user: { role: "DOCTOR", isActive: true },
      department: { not: null },
    },
    select: { department: true },
    distinct: ["department"],
    orderBy: { department: "asc" },
  });

  const departmentList = departmentsRaw
    .map((d) => d.department)
    .filter(Boolean) as string[];

  const availableDoctors = await prisma.staff.findMany({
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
  });

  // Patient info for the quick book modal (pre-fill)
  // name & email come from User (session), phone from Patient record
  const patientInfo = {
    name: session.user.name || "",
    phone: patient.phone || "",
    email: session.user.email || "",
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
      
      {/* Left Column (Anatomy Viewer) — hidden on mobile, visible on xl */}
      <div className="hidden xl:block xl:col-span-4">
        <AnatomyViewer />
      </div>

      {/* Right Content Area */}
      <div className="col-span-1 xl:col-span-8 flex flex-col gap-4 sm:gap-6">
        
        {/* Top Row: Health Chart & Upcoming Appointment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="min-h-[240px] sm:min-h-[260px]">
            <HealthChart chartData={chartData} isAdmitted={isAdmitted} />
          </div>
          <div className="min-h-[240px] sm:min-h-[260px]">
            <UpcomingAppointment 
              appointment={upcomingAppt}
              pendingBooking={pendingBooking}
              patient={patientInfo}
              departments={departmentList}
              doctors={availableDoctors}
            />
          </div>
        </div>

        {/* Middle Row: Recent Tests */}
        <div className="min-h-[120px] sm:min-h-[140px]">
          <RecentTests labRequests={recentTests} />
        </div>

        {/* Bottom Row: Fitness Rate & Doctors List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="min-h-[220px]">
            <FitnessRate vitals={vitals} isAdmitted={isAdmitted} />
          </div>
          <div className="min-h-[280px]">
            <DoctorsList doctors={doctorsFromPast} />
          </div>
        </div>

      </div>

    </div>
  );
}
