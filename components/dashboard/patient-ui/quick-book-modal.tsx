"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CalendarBlank,
  Clock,
  Stethoscope,
  Buildings,
  CaretRight,
  CaretLeft,
  CheckCircle,
  Spinner,
  Copy,
  NoteBlank,
  UserCircle,
  Phone,
  Envelope,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";

/* ────────────────────────────────────────────────────────────
   TYPES
   ──────────────────────────────────────────────────────────── */

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

interface QuickBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientInfo;
  departments: string[];
  doctors: Doctor[];
}

/* ────────────────────────────────────────────────────────────
   CONSTANTS
   ──────────────────────────────────────────────────────────── */

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const timeSlots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "02:00 PM",
  "02:30 PM",
  "03:00 PM",
  "03:30 PM",
  "04:00 PM",
  "04:30 PM",
  "05:00 PM",
  "05:30 PM",
  "06:00 PM",
  "06:30 PM",
];

/* ────────────────────────────────────────────────────────────
   MOTION VARIANTS
   ──────────────────────────────────────────────────────────── */

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const } },
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 12,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      duration: 0.45,
      bounce: 0.15,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const },
  },
};

const staggerContainer = {
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0.08 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] as const },
  },
};

/* ────────────────────────────────────────────────────────────
   COMPONENT
   ──────────────────────────────────────────────────────────── */

export default function QuickBookModal({
  isOpen,
  onClose,
  patient,
  departments,
  doctors,
}: QuickBookModalProps) {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    token: string;
    message: string;
  } | null>(null);

  // Form state
  const [department, setDepartment] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [reason, setReason] = useState("");

  // Derived
  const filteredDoctors = department
    ? doctors.filter((d) => d.department === department)
    : doctors;
  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
  const today = new Date().toISOString().split("T")[0];

  // Doctor availability check
  const selectedDateDay = preferredDate
    ? new Date(preferredDate + "T00:00:00").getDay()
    : -1;
  const doctorScheduleForDay = selectedDoctor?.doctorSchedules.filter(
    (s) => s.dayOfWeek === selectedDateDay
  );
  const doctorAvailableOnDay =
    doctorScheduleForDay && doctorScheduleForDay.length > 0;

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(0);
        setDepartment("");
        setSelectedDoctorId("");
        setPreferredDate("");
        setPreferredTime("");
        setReason("");
        setBookingResult(null);
        setIsSubmitting(false);
      }, 250);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const canProceedStep0 =
    department && preferredDate && preferredTime;

  const handleSubmit = useCallback(async () => {
    if (!department || !preferredDate || !preferredTime) {
      toast.error("Please fill all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/public/book-appointment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientName: patient.name,
          phone: patient.phone,
          email: patient.email || undefined,
          department,
          preferredDoctorId: selectedDoctorId || undefined,
          preferredDate,
          preferredTime,
          reason: reason || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBookingResult({
          token: result.bookingToken,
          message: result.message,
        });
        toast.success("Appointment booked successfully!");
      } else {
        toast.error(result.message || "Failed to book appointment");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    department,
    preferredDate,
    preferredTime,
    patient,
    selectedDoctorId,
    reason,
  ]);

  const copyToken = () => {
    if (bookingResult?.token) {
      navigator.clipboard.writeText(bookingResult.token);
      toast.success("Token copied to clipboard");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* Scrim */}
          <motion.div
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.25 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          />

          {/* ── MODAL SHELL (Double-Bezel Architecture) ── */}
          <motion.div
            className="relative w-full sm:max-w-[580px] max-h-[100dvh] sm:max-h-[90vh] overflow-hidden"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Outer Bezel */}
            <div className="sm:rounded-[1.75rem] bg-white/5 ring-1 ring-white/10 sm:p-[3px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)]">
              {/* Inner Core */}
              <div className="rounded-t-[1.25rem] sm:rounded-[calc(1.75rem-3px)] bg-white overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-4 sm:px-7 pt-5 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1a56db]/8 flex items-center justify-center">
                      <CalendarBlank
                        weight="duotone"
                        size={20}
                        className="text-[#1a56db]"
                      />
                    </div>
                    <div>
                      <h2 className="text-[17px] font-bold text-zinc-900 tracking-tight">
                        Quick Book
                      </h2>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                        {bookingResult
                          ? "Booking confirmed"
                          : step === 0
                          ? "Select appointment details"
                          : "Review & confirm"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.93]"
                    aria-label="Close modal"
                  >
                    <X weight="bold" size={14} />
                  </button>
                </div>

                {/* ── Body ── */}
                <div className="overflow-y-auto max-h-[calc(100dvh-140px)] sm:max-h-[calc(90vh-140px)] overscroll-contain">
                  <AnimatePresence mode="wait">
                    {bookingResult ? (
                      <SuccessView
                        key="success"
                        bookingResult={bookingResult}
                        department={department}
                        selectedDoctor={selectedDoctor}
                        preferredDate={preferredDate}
                        preferredTime={preferredTime}
                        copyToken={copyToken}
                        onClose={onClose}
                      />
                    ) : step === 0 ? (
                      <StepOne
                        key="step0"
                        departments={departments}
                        department={department}
                        setDepartment={(v) => {
                          setDepartment(v);
                          setSelectedDoctorId("");
                        }}
                        filteredDoctors={filteredDoctors}
                        selectedDoctorId={selectedDoctorId}
                        setSelectedDoctorId={setSelectedDoctorId}
                        preferredDate={preferredDate}
                        setPreferredDate={setPreferredDate}
                        preferredTime={preferredTime}
                        setPreferredTime={setPreferredTime}
                        today={today}
                        selectedDoctor={selectedDoctor}
                        doctorAvailableOnDay={doctorAvailableOnDay}
                        doctorScheduleForDay={doctorScheduleForDay}
                        selectedDateDay={selectedDateDay}
                      />
                    ) : (
                      <StepTwo
                        key="step1"
                        patient={patient}
                        department={department}
                        selectedDoctor={selectedDoctor}
                        preferredDate={preferredDate}
                        preferredTime={preferredTime}
                        reason={reason}
                        setReason={setReason}
                      />
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Footer ── */}
                {!bookingResult && (
                  <div className="px-4 sm:px-7 py-3 sm:py-4 border-t border-gray-100 bg-zinc-50/50 flex items-center justify-between gap-3">
                    {step === 1 && (
                      <button
                        onClick={() => setStep(0)}
                        className="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-500 hover:text-zinc-700 px-4 py-2.5 rounded-xl hover:bg-zinc-100 transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
                      >
                        <CaretLeft weight="bold" size={14} />
                        Back
                      </button>
                    )}

                    <div className={step === 0 ? "ml-auto" : ""}>
                      {step === 0 ? (
                        <button
                          onClick={() => setStep(1)}
                          disabled={!canProceedStep0}
                          className="flex items-center gap-2 text-[13px] font-semibold text-white bg-[#1a56db] hover:bg-[#1544b8] disabled:bg-zinc-200 disabled:text-zinc-400 px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/15 disabled:shadow-none transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] disabled:active:scale-100"
                        >
                          Review & Confirm
                          <CaretRight weight="bold" size={14} />
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="flex items-center gap-2 text-[13px] font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400 px-6 py-2.5 rounded-xl shadow-md shadow-emerald-500/20 disabled:shadow-none transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] disabled:active:scale-100"
                        >
                          {isSubmitting ? (
                            <>
                              <Spinner
                                weight="bold"
                                size={16}
                                className="animate-spin"
                              />
                              Booking...
                            </>
                          ) : (
                            <>
                              <CheckCircle weight="bold" size={16} />
                              Confirm Booking
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ════════════════════════════════════════════════════════════
   STEP ONE — Department, Doctor, Date, Time
   ════════════════════════════════════════════════════════════ */

function StepOne({
  departments,
  department,
  setDepartment,
  filteredDoctors,
  selectedDoctorId,
  setSelectedDoctorId,
  preferredDate,
  setPreferredDate,
  preferredTime,
  setPreferredTime,
  today,
  selectedDoctor,
  doctorAvailableOnDay,
  doctorScheduleForDay,
  selectedDateDay,
}: {
  departments: string[];
  department: string;
  setDepartment: (v: string) => void;
  filteredDoctors: Doctor[];
  selectedDoctorId: string;
  setSelectedDoctorId: (v: string) => void;
  preferredDate: string;
  setPreferredDate: (v: string) => void;
  preferredTime: string;
  setPreferredTime: (v: string) => void;
  today: string;
  selectedDoctor: Doctor | undefined;
  doctorAvailableOnDay: boolean | undefined;
  doctorScheduleForDay: DoctorSchedule[] | undefined;
  selectedDateDay: number;
}) {
  return (
    <motion.div
      className="px-4 sm:px-7 py-4 sm:py-5 space-y-4 sm:space-y-5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
    >
      {/* Department */}
      <motion.div variants={staggerItem} className="space-y-2.5">
        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
          <Buildings weight="duotone" size={14} />
          Department
          <span className="text-red-400">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setDepartment(dept)}
              className={`px-4 py-2 rounded-xl text-[13px] font-medium border transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] ${
                department === dept
                  ? "bg-[#1a56db] text-white border-[#1a56db] shadow-md shadow-blue-500/15"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Doctor (optional) */}
      {department && (
        <motion.div variants={staggerItem} className="space-y-2.5">
          <label className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
            <Stethoscope weight="duotone" size={14} />
            Doctor
            <span className="text-zinc-300 text-[10px] normal-case tracking-normal font-normal ml-1">
              optional
            </span>
          </label>
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 overscroll-contain">
            {/* Any doctor */}
            <button
              onClick={() => setSelectedDoctorId("")}
              className={`w-full p-3 rounded-xl border text-left transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] ${
                !selectedDoctorId
                  ? "border-[#1a56db]/30 bg-[#1a56db]/4 ring-1 ring-[#1a56db]/10"
                  : "border-zinc-200 hover:border-zinc-300 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
                  <UserCircle
                    weight="duotone"
                    size={18}
                    className="text-zinc-400"
                  />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-zinc-700">
                    Any Available Doctor
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Best available will be assigned
                  </p>
                </div>
              </div>
            </button>

            {filteredDoctors.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setSelectedDoctorId(doc.id)}
                className={`w-full p-3 rounded-xl border text-left transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] ${
                  selectedDoctorId === doc.id
                    ? "border-[#1a56db]/30 bg-[#1a56db]/4 ring-1 ring-[#1a56db]/10"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1a56db]/8 flex items-center justify-center">
                    <Stethoscope
                      weight="fill"
                      size={16}
                      className="text-[#1a56db]"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-zinc-700">
                      Dr. {doc.user.name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      {doc.specialization && (
                        <span className="text-[11px] text-zinc-400">
                          {doc.specialization}
                        </span>
                      )}
                      <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                        Rs. {doc.consultationFee}
                      </span>
                    </div>
                    {doc.doctorSchedules.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Clock
                          weight="regular"
                          size={10}
                          className="text-zinc-300"
                        />
                        {doc.doctorSchedules.map((s, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded"
                          >
                            {dayNames[s.dayOfWeek].slice(0, 3)} {s.startTime}-
                            {s.endTime}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Date */}
      <motion.div variants={staggerItem} className="space-y-2.5">
        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
          <CalendarBlank weight="duotone" size={14} />
          Preferred Date
          <span className="text-red-400">*</span>
        </label>
        <input
          type="date"
          value={preferredDate}
          onChange={(e) => setPreferredDate(e.target.value)}
          min={today}
          className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-[13px] text-zinc-700 bg-white hover:border-zinc-300 focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/10 outline-none transition-all duration-200"
        />
        {preferredDate && selectedDoctor && !doctorAvailableOnDay && (
          <p className="text-[11px] text-amber-600 bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
            Dr. {selectedDoctor.user.name} may not be available on{" "}
            {dayNames[selectedDateDay]}. Reception will confirm.
          </p>
        )}
        {preferredDate &&
          selectedDoctor &&
          doctorScheduleForDay &&
          doctorScheduleForDay.length > 0 && (
            <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
              Dr. {selectedDoctor.user.name} is scheduled on{" "}
              {dayNames[selectedDateDay]}:{" "}
              {doctorScheduleForDay
                .map((s) => `${s.startTime}-${s.endTime}`)
                .join(", ")}
            </p>
          )}
      </motion.div>

      {/* Time Slots */}
      <motion.div variants={staggerItem} className="space-y-2.5">
        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
          <Clock weight="duotone" size={14} />
          Preferred Time
          <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
          {timeSlots.map((slot) => (
            <button
              key={slot}
              onClick={() => setPreferredTime(slot)}
              className={`py-2 px-1 rounded-lg text-[11px] font-medium border transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.95] ${
                preferredTime === slot
                  ? "bg-[#1a56db] text-white border-[#1a56db] shadow-sm shadow-blue-500/15"
                  : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50"
              }`}
            >
              {slot}
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   STEP TWO — Review & Confirm
   ════════════════════════════════════════════════════════════ */

function StepTwo({
  patient,
  department,
  selectedDoctor,
  preferredDate,
  preferredTime,
  reason,
  setReason,
}: {
  patient: PatientInfo;
  department: string;
  selectedDoctor: Doctor | undefined;
  preferredDate: string;
  preferredTime: string;
  reason: string;
  setReason: (v: string) => void;
}) {
  const formattedDate = (() => {
    try {
      return new Date(preferredDate + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return preferredDate;
    }
  })();

  return (
    <motion.div
      className="px-4 sm:px-7 py-4 sm:py-5 space-y-4 sm:space-y-5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
    >
      {/* Patient Info (read-only) */}
      <motion.div variants={staggerItem}>
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
          Your Details
        </p>
        <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-4 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <UserCircle weight="duotone" size={16} className="text-zinc-400" />
            <span className="text-[13px] font-medium text-zinc-700">
              {patient.name}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Phone weight="duotone" size={16} className="text-zinc-400" />
            <span className="text-[13px] text-zinc-600">{patient.phone}</span>
          </div>
          {patient.email && (
            <div className="flex items-center gap-2.5">
              <Envelope
                weight="duotone"
                size={16}
                className="text-zinc-400"
              />
              <span className="text-[13px] text-zinc-600">
                {patient.email}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Appointment Summary */}
      <motion.div variants={staggerItem}>
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">
          Appointment
        </p>
        <div className="rounded-xl border border-zinc-100 overflow-hidden">
          <SummaryRow
            icon={
              <Buildings weight="duotone" size={14} className="text-[#1a56db]" />
            }
            label="Department"
            value={department}
          />
          <SummaryRow
            icon={
              <Stethoscope
                weight="duotone"
                size={14}
                className="text-[#1a56db]"
              />
            }
            label="Doctor"
            value={
              selectedDoctor
                ? `Dr. ${selectedDoctor.user.name}`
                : "Any Available"
            }
          />
          <SummaryRow
            icon={
              <CalendarBlank
                weight="duotone"
                size={14}
                className="text-[#1a56db]"
              />
            }
            label="Date"
            value={formattedDate}
          />
          <SummaryRow
            icon={
              <Clock weight="duotone" size={14} className="text-[#1a56db]" />
            }
            label="Time"
            value={preferredTime}
            isLast
          />
        </div>
      </motion.div>

      {/* Reason / Symptoms */}
      <motion.div variants={staggerItem} className="space-y-2.5">
        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
          <NoteBlank weight="duotone" size={14} />
          Reason / Symptoms
          <span className="text-zinc-300 text-[10px] normal-case tracking-normal font-normal ml-1">
            optional
          </span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Briefly describe your symptoms or reason for visit..."
          rows={3}
          className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-[13px] text-zinc-700 bg-white hover:border-zinc-300 focus:border-[#1a56db] focus:ring-2 focus:ring-[#1a56db]/10 outline-none transition-all duration-200 resize-none placeholder:text-zinc-300"
        />
      </motion.div>

      {/* Info note */}
      <motion.div
        variants={staggerItem}
        className="bg-[#1a56db]/4 rounded-xl p-3.5 border border-[#1a56db]/10"
      >
        <p className="text-[11px] font-medium text-[#1a56db]/80 leading-relaxed">
          Your request will be reviewed by our reception team. You will receive
          a WhatsApp confirmation once approved. Payment is collected at the
          hospital during your visit.
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   SUCCESS VIEW
   ════════════════════════════════════════════════════════════ */

function SuccessView({
  bookingResult,
  department,
  selectedDoctor,
  preferredDate,
  preferredTime,
  copyToken,
  onClose,
}: {
  bookingResult: { token: string; message: string };
  department: string;
  selectedDoctor: Doctor | undefined;
  preferredDate: string;
  preferredTime: string;
  copyToken: () => void;
  onClose: () => void;
}) {
  const formattedDate = (() => {
    try {
      return new Date(preferredDate + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return preferredDate;
    }
  })();

  return (
    <motion.div
      className="px-7 py-8 text-center space-y-5"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0.1 }}
    >
      {/* Checkmark */}
      <motion.div
        className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", delay: 0.1, duration: 0.5, bounce: 0.25 }}
      >
        <CheckCircle weight="fill" size={36} className="text-emerald-500" />
      </motion.div>

      <div>
        <h3 className="text-[18px] font-bold text-zinc-900 tracking-tight">
          Booking Submitted
        </h3>
        <p className="text-[13px] text-zinc-400 mt-1">
          Our reception will confirm shortly
        </p>
      </div>

      {/* Token */}
      <motion.div
        className="bg-zinc-50 rounded-xl p-4 border border-zinc-100"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Booking Token
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl font-mono font-bold text-[#1a56db] tracking-wide">
            {bookingResult.token}
          </span>
          <button
            onClick={copyToken}
            className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:border-zinc-300 transition-all duration-200 active:scale-[0.93]"
          >
            <Copy weight="bold" size={14} />
          </button>
        </div>
      </motion.div>

      {/* Quick summary */}
      <motion.div
        className="text-left rounded-xl border border-zinc-100 overflow-hidden"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      >
        <SummaryRow
          icon={
            <Buildings
              weight="duotone"
              size={14}
              className="text-emerald-500"
            />
          }
          label="Department"
          value={department}
        />
        <SummaryRow
          icon={
            <Stethoscope
              weight="duotone"
              size={14}
              className="text-emerald-500"
            />
          }
          label="Doctor"
          value={
            selectedDoctor
              ? `Dr. ${selectedDoctor.user.name}`
              : "Any Available"
          }
        />
        <SummaryRow
          icon={
            <CalendarBlank
              weight="duotone"
              size={14}
              className="text-emerald-500"
            />
          }
          label="Date"
          value={formattedDate}
        />
        <SummaryRow
          icon={
            <Clock weight="duotone" size={14} className="text-emerald-500" />
          }
          label="Time"
          value={preferredTime}
          isLast
        />
      </motion.div>

      <button
        onClick={onClose}
        className="w-full py-3 rounded-xl bg-[#1a56db] hover:bg-[#1544b8] text-white text-[13px] font-semibold shadow-md shadow-blue-500/15 transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
      >
        Done
      </button>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ════════════════════════════════════════════════════════════ */

function SummaryRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${
        isLast ? "" : "border-b border-zinc-100"
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-[12px] text-zinc-400 font-medium">{label}</span>
      </div>
      <span className="text-[13px] font-semibold text-zinc-700 text-right max-w-[55%] truncate">
        {value}
      </span>
    </div>
  );
}
