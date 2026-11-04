"use client";

import { useState } from "react";
import { VideoCamera, CalendarBlank, Plus, Clock, HourglassHigh, Buildings } from "@phosphor-icons/react/dist/ssr";
import { format, isToday, isTomorrow } from "date-fns";
import QuickBookModal from "./quick-book-modal";

interface DoctorSchedule {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDuration: number;
  maxPatients: number;
}

interface Doctor {
  id: string;
  department: string | null;
  specialization: string | null;
  consultationFee: number;
  user: { name: string | null };
  doctorSchedules: DoctorSchedule[];
}

interface PatientInfo {
  name: string;
  phone: string;
  email: string;
}

interface UpcomingAppointmentProps {
  appointment: any;
  pendingBooking?: any;
  patient?: PatientInfo;
  departments?: string[];
  doctors?: Doctor[];
}

export default function UpcomingAppointment({ 
  appointment,
  pendingBooking,
  patient, 
  departments = [], 
  doctors = [] 
}: UpcomingAppointmentProps) {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  // Show pending booking when no confirmed appointment
  if (!appointment && pendingBooking) {
    let bookingDateText = "";
    try {
      const d = new Date(pendingBooking.preferredDate);
      if (isToday(d)) bookingDateText = "Today";
      else if (isTomorrow(d)) bookingDateText = "Tomorrow";
      else bookingDateText = format(d, "MMM dd, yyyy");
    } catch {
      bookingDateText = "Requested Date";
    }

    const doctorName = pendingBooking.preferredDoctor?.user?.name;

    return (
      <div className="bg-white rounded-2xl sm:rounded-3xl xl:rounded-[32px] p-4 sm:p-6 shadow-sm border border-amber-100 h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-bold text-[#1e293b]">Booking Request</h3>
          <span className="ua-pulse-badge">
            <span className="ua-pulse-dot" />
            Awaiting Confirmation
          </span>
        </div>

        <div className="flex flex-col items-center text-center mb-4 sm:mb-5 flex-1 justify-center">
          <div className="w-14 h-14 sm:w-[68px] sm:h-[68px] rounded-full bg-amber-50 flex items-center justify-center mb-3 border-2 border-amber-100">
            <HourglassHigh weight="fill" size={30} className="text-amber-500" />
          </div>
          <h4 className="text-sm sm:text-[15px] font-bold text-[#1e293b]">
            {pendingBooking.department}
          </h4>
          {doctorName && (
            <p className="text-[11px] sm:text-xs text-[#64748b] font-medium">
              Preferred: Dr. {doctorName}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#64748b] mt-2">
            <Clock weight="regular" size={14} className="text-[#94a3b8]" />
            {bookingDateText}, {pendingBooking.preferredTime}
          </div>
          {pendingBooking.reason && (
            <p className="text-[10px] sm:text-[11px] text-[#94a3b8] mt-2 max-w-[220px]">
              Reason: {pendingBooking.reason}
            </p>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl sm:rounded-2xl p-3 text-center">
          <p className="text-[11px] sm:text-xs text-amber-700 font-medium">
            Your booking is being reviewed by the hospital. You&apos;ll be notified once confirmed.
          </p>
        </div>

        <style>{`
          .ua-pulse-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:10px;font-weight:700;color:#d97706;background:#fffbeb;border:1px solid #fde68a;letter-spacing:.03em;text-transform:uppercase}
          .ua-pulse-dot{width:6px;height:6px;border-radius:50%;background:#f59e0b;animation:uaPulse 2s ease-in-out infinite}
          @keyframes uaPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(.8)}}
        `}</style>
      </div>
    );
  }

  if (!appointment) {
    return (
      <>
        <div className="bg-white rounded-2xl sm:rounded-3xl xl:rounded-[32px] p-4 sm:p-6 shadow-sm border border-gray-100 h-full flex flex-col justify-between items-center text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 text-[#1a56db] rounded-full flex items-center justify-center mb-3 sm:mb-4">
            <CalendarBlank weight="fill" size={28} className="sm:hidden" />
            <CalendarBlank weight="fill" size={32} className="hidden sm:block" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#1e293b] mb-1.5 sm:mb-2">No Upcoming Appointments</h3>
            <p className="text-xs sm:text-sm text-[#64748b] mb-4 sm:mb-6">
              You don&apos;t have any consultations scheduled. Book a new one to consult with our doctors.
            </p>
          </div>
          <button 
            onClick={() => setIsBookingOpen(true)}
            className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.97]"
          >
            <Plus weight="bold" size={18} />
            Book Appointment
          </button>
        </div>

        {patient && (
          <QuickBookModal
            isOpen={isBookingOpen}
            onClose={() => setIsBookingOpen(false)}
            patient={patient}
            departments={departments}
            doctors={doctors}
          />
        )}
      </>
    );
  }

  // Format date nicely
  let dateText = "";
  try {
    const d = new Date(appointment.appointmentDate);
    if (isToday(d)) dateText = "Today";
    else if (isTomorrow(d)) dateText = "Tomorrow";
    else dateText = format(d, "MMM dd, yyyy");
  } catch (e) {
    dateText = "Unknown Date";
  }

  const doctorName = appointment.doctor?.user?.name || "Unknown Doctor";
  const specialization = appointment.doctor?.specialization || appointment.doctor?.department || "Consultant";
  const avatarUrl = appointment.doctor?.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=e0f2fe&color=0369a1`;

  return (
    <>
      <div className="bg-white rounded-2xl sm:rounded-3xl xl:rounded-[32px] p-4 sm:p-6 shadow-sm border border-gray-100 h-full flex flex-col">
        <h3 className="text-base sm:text-lg font-bold text-[#1e293b] mb-4 sm:mb-5">Upcoming Appointment</h3>
        
        {/* Doctor Info — centered layout matching image_8.png */}
        <div className="flex flex-col items-center text-center mb-4 sm:mb-5 flex-1">
          <img 
            src={avatarUrl}
            alt={doctorName} 
            className="w-14 h-14 sm:w-[68px] sm:h-[68px] rounded-full shadow-md border-2 border-white object-cover mb-3"
          />
          <h4 className="text-sm sm:text-[15px] font-bold text-[#1e293b]">{doctorName}</h4>
          <p className="text-[11px] sm:text-xs text-[#64748b] font-medium mb-2">{specialization}</p>
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#64748b]">
            <Clock weight="regular" size={14} className="text-[#94a3b8]" />
            {dateText}, {appointment.appointmentTime}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button className="w-full bg-[#1a56db] hover:bg-[#1e40af] text-white py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.97]">
            <VideoCamera weight="fill" size={18} />
            Join Video Call
          </button>
          <button className="w-full text-[#64748b] hover:text-[#1e293b] py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
            <CalendarBlank weight="bold" size={16} />
            Reschedule
          </button>
        </div>
      </div>

      {patient && (
        <QuickBookModal
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
          patient={patient}
          departments={departments}
          doctors={doctors}
        />
      )}
    </>
  );
}
