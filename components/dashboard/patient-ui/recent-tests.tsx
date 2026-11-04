"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TestTube,
  Heartbeat,
  ShieldPlus,
  WarningCircle,
  X,
  CalendarBlank,
  ClipboardText,
  CheckCircle,
  Clock,
  Flask,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { format, isToday, isTomorrow } from "date-fns";

/* ────────────────────────────────────────────────────────────
   TYPES
   ──────────────────────────────────────────────────────────── */

interface LabResult {
  id: string;
  testName: string;
  resultValue: string;
  unit?: string | null;
  normalRange?: string | null;
  remarks?: string | null;
  enteredAt: string | Date;
}

interface LabRequestWithResults {
  id: string;
  testName: string;
  testType: string;
  status: string;
  priority: string;
  notes?: string | null;
  reportContent?: string | null;
  impression?: string | null;
  parameterResults?: Record<string, string> | null;
  completedAt?: string | Date | null;
  createdAt: string | Date;
  results: LabResult[];
}

/* ────────────────────────────────────────────────────────────
   MOTION VARIANTS
   ──────────────────────────────────────────────────────────── */

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 16 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, duration: 0.45, bounce: 0.12 },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: 8,
    transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] as const },
  },
};

/* ────────────────────────────────────────────────────────────
   HELPERS
   ──────────────────────────────────────────────────────────── */

function getIcon(type: string, name: string) {
  if (type === "RADIOLOGY" || name.toLowerCase().includes("x-ray"))
    return <ShieldPlus weight="fill" size={18} />;
  if (name.toLowerCase().includes("ecg") || name.toLowerCase().includes("heart"))
    return <Heartbeat weight="fill" size={18} />;
  return <TestTube weight="fill" size={18} />;
}

function getColorClass(type: string, name: string) {
  if (type === "RADIOLOGY" || name.toLowerCase().includes("x-ray"))
    return "bg-yellow-50 text-yellow-500";
  if (name.toLowerCase().includes("ecg") || name.toLowerCase().includes("heart"))
    return "bg-green-50 text-green-500";
  return "bg-blue-50 text-blue-500";
}

function getStatusConfig(status: string) {
  switch (status) {
    case "COMPLETED":
      return { label: "Completed", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100" };
    case "CANCELLED":
      return { label: "Cancelled", bg: "bg-red-50", text: "text-red-600", border: "border-red-100" };
    case "SAMPLE_COLLECTED":
      return { label: "Processing", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" };
    case "PAID_PENDING_SAMPLE":
      return { label: "Awaiting Sample", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100" };
    case "PENDING_PAYMENT":
      return { label: "Payment Pending", bg: "bg-red-50", text: "text-red-600", border: "border-red-100" };
    default:
      return { label: "Pending", bg: "bg-zinc-50", text: "text-zinc-600", border: "border-zinc-100" };
  }
}

function formatDate(date: string | Date) {
  try {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isTomorrow(d)) return "Tomorrow";
    return format(d, "MMM dd, yyyy");
  } catch {
    return "Unknown Date";
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-[#2dd4bf] text-white text-[7px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full leading-tight">
          Completed
        </div>
      );
    case "CANCELLED":
      return (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-red-500 text-white text-[7px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full leading-tight">
          Cancelled
        </div>
      );
    default:
      return (
        <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-[#1a56db] text-white text-[7px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full leading-tight">
          Scheduled
        </div>
      );
  }
}

/* ────────────────────────────────────────────────────────────
   MAIN COMPONENT
   ──────────────────────────────────────────────────────────── */

export default function RecentTests({ labRequests }: { labRequests: any[] }) {
  const [selectedTest, setSelectedTest] = useState<LabRequestWithResults | null>(null);

  return (
    <>
      <div className="bg-white rounded-2xl sm:rounded-3xl xl:rounded-[32px] p-4 sm:p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-full">
        <div className="flex justify-between items-center mb-3 sm:mb-6">
          <h3 className="text-base sm:text-lg font-bold text-[#1e293b]">Recent Tests</h3>
          <button className="text-[10px] sm:text-[11px] font-bold text-[#64748b] bg-[#f8f9fb] hover:bg-gray-100 px-2.5 sm:px-3 py-1 rounded-full border border-gray-200 transition-colors active:scale-[0.97]">
            See All
          </button>
        </div>

        <div className="flex gap-2.5 sm:gap-4 overflow-x-auto pb-1 sm:pb-2 scrollbar-hide flex-1 items-center -mx-1 px-1">
          {!labRequests || labRequests.length === 0 ? (
            <div className="w-full flex flex-col items-center justify-center text-center text-[#64748b]">
              <WarningCircle size={22} className="mb-2 text-gray-300" />
              <p className="text-xs">No recent tests found.</p>
            </div>
          ) : (
            labRequests.map((test) => (
              <button
                key={test.id}
                onClick={() => setSelectedTest(test)}
                className="min-w-[160px] sm:min-w-[200px] h-full max-h-[64px] sm:max-h-[72px] bg-[#f8f9fb] hover:bg-[#eef0f4] rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center gap-2.5 sm:gap-3 relative border border-gray-100 flex-shrink-0 text-left transition-all duration-200 active:scale-[0.97] group cursor-pointer"
              >
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center ${getColorClass(
                    test.testType,
                    test.testName
                  )}`}
                >
                  {getIcon(test.testType, test.testName)}
                </div>
                <div className="pr-10 sm:pr-12 min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-[#1e293b] truncate">
                    {test.testName}
                  </h4>
                  <p className="text-[9px] sm:text-[10px] text-[#64748b] mt-0.5 flex items-center gap-1">
                    {formatDate(test.createdAt)}
                    <ArrowRight
                      weight="bold"
                      size={9}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[#1a56db]"
                    />
                  </p>
                </div>
                {getStatusBadge(test.status)}
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── TEST REPORT DETAIL MODAL ── */}
      <AnimatePresence>
        {selectedTest && (
          <TestReportModal
            test={selectedTest}
            onClose={() => setSelectedTest(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ════════════════════════════════════════════════════════════
   TEST REPORT MODAL
   ════════════════════════════════════════════════════════════ */

function TestReportModal({
  test,
  onClose,
}: {
  test: LabRequestWithResults;
  onClose: () => void;
}) {
  const statusCfg = getStatusConfig(test.status);
  const params = test.parameterResults as Record<string, string> | null;
  const hasParams = params && Object.keys(params).length > 0;
  const hasResults = test.results && test.results.length > 0;
  const isCompleted = test.status === "COMPLETED";

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-4"
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

      {/* Modal Shell */}
      <motion.div
        className="relative w-full sm:max-w-[560px] max-h-[100dvh] sm:max-h-[85vh] overflow-hidden"
        variants={modalVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <div className="sm:rounded-[1.75rem] bg-white/5 ring-1 ring-white/10 sm:p-[3px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)]">
          <div className="rounded-t-[1.25rem] sm:rounded-[calc(1.75rem-3px)] bg-white overflow-hidden">
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-4 sm:px-7 pt-5 sm:pt-6 pb-3 sm:pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${getColorClass(
                    test.testType,
                    test.testName
                  )}`}
                >
                  {getIcon(test.testType, test.testName)}
                </div>
                <div className="min-w-0">
                  <h2 className="text-[15px] sm:text-[17px] font-bold text-zinc-900 tracking-tight truncate">
                    {test.testName}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span
                      className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text} border ${statusCfg.border}`}
                    >
                      {statusCfg.label}
                    </span>
                    {test.priority !== "ROUTINE" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                        {test.priority}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-all duration-200 active:scale-[0.93] flex-shrink-0 ml-3"
                aria-label="Close"
              >
                <X weight="bold" size={14} />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="overflow-y-auto max-h-[calc(100dvh-120px)] sm:max-h-[calc(85vh-120px)] overscroll-contain px-4 sm:px-7 py-4 sm:py-5 space-y-5">
              {/* Meta Row */}
              <div className="grid grid-cols-2 gap-3">
                <MetaCard
                  icon={<CalendarBlank weight="duotone" size={16} className="text-[#1a56db]" />}
                  label="Ordered"
                  value={formatDate(test.createdAt)}
                />
                <MetaCard
                  icon={
                    isCompleted ? (
                      <CheckCircle weight="duotone" size={16} className="text-emerald-500" />
                    ) : (
                      <Clock weight="duotone" size={16} className="text-amber-500" />
                    )
                  }
                  label={isCompleted ? "Completed" : "Status"}
                  value={
                    isCompleted && test.completedAt
                      ? formatDate(test.completedAt)
                      : statusCfg.label
                  }
                />
              </div>

              {/* ── Results Section ── */}
              {isCompleted ? (
                <>
                  {/* Parameter Results (JSON table) */}
                  {hasParams && (
                    <div>
                      <SectionLabel icon={<Flask weight="duotone" size={14} />} text="Test Parameters" />
                      <div className="rounded-xl border border-zinc-100 overflow-hidden mt-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-zinc-50/80">
                              <th className="text-left px-3 sm:px-4 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                                Parameter
                              </th>
                              <th className="text-left px-3 sm:px-4 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                                Result
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(params!).map(([key, value], idx) => (
                              <tr
                                key={key}
                                className={`border-t border-zinc-50 ${
                                  idx % 2 === 0 ? "bg-white" : "bg-zinc-50/30"
                                }`}
                              >
                                <td className="px-3 sm:px-4 py-2.5 text-[13px] text-zinc-500">
                                  {key}
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 text-[13px] font-semibold text-zinc-800">
                                  {String(value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* LabResult rows (individual result entries) */}
                  {hasResults && !hasParams && (
                    <div>
                      <SectionLabel icon={<Flask weight="duotone" size={14} />} text="Test Results" />
                      <div className="rounded-xl border border-zinc-100 overflow-hidden mt-2">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-zinc-50/80">
                              <th className="text-left px-3 sm:px-4 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                                Test
                              </th>
                              <th className="text-left px-3 sm:px-4 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                                Result
                              </th>
                              <th className="text-left px-3 sm:px-4 py-2 text-[11px] font-semibold text-zinc-500 uppercase tracking-wide hidden sm:table-cell">
                                Normal Range
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {test.results.map((result, idx) => (
                              <tr
                                key={result.id}
                                className={`border-t border-zinc-50 ${
                                  idx % 2 === 0 ? "bg-white" : "bg-zinc-50/30"
                                }`}
                              >
                                <td className="px-3 sm:px-4 py-2.5 text-[13px] text-zinc-500">
                                  {result.testName}
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 text-[13px] font-semibold text-zinc-800">
                                  {result.resultValue}
                                  {result.unit && (
                                    <span className="text-[11px] text-zinc-400 ml-1 font-normal">
                                      {result.unit}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 sm:px-4 py-2.5 text-[12px] text-zinc-400 hidden sm:table-cell">
                                  {result.normalRange || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Observations / Report Content */}
                  {test.reportContent && (
                    <div>
                      <SectionLabel
                        icon={<ClipboardText weight="duotone" size={14} />}
                        text="Observations"
                      />
                      <div className="mt-2 rounded-xl bg-zinc-50 border border-zinc-100 p-4">
                        <p className="text-[13px] text-zinc-700 leading-relaxed whitespace-pre-wrap">
                          {test.reportContent}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Impression / Conclusion */}
                  {test.impression && (
                    <div>
                      <SectionLabel
                        icon={<CheckCircle weight="duotone" size={14} />}
                        text="Impression / Conclusion"
                      />
                      <div className="mt-2 rounded-xl bg-emerald-50/60 border border-emerald-100 p-4">
                        <p className="text-[13px] text-emerald-800 leading-relaxed whitespace-pre-wrap font-medium">
                          {test.impression}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Fallback if completed but no structured data */}
                  {!hasParams && !hasResults && !test.reportContent && !test.impression && (
                    <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-6 text-center">
                      <Flask weight="duotone" size={32} className="text-zinc-300 mx-auto mb-2" />
                      <p className="text-[13px] text-zinc-500">
                        Report completed. Detailed results are available at the lab counter.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* ── Not yet completed ── */
                <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-6 text-center">
                  <Clock weight="duotone" size={32} className="text-amber-400 mx-auto mb-2" />
                  <p className="text-[13px] text-zinc-700 font-medium mb-1">
                    Results Not Yet Available
                  </p>
                  <p className="text-[12px] text-zinc-500">
                    This test is still being processed. Results will appear here once the report is ready.
                  </p>
                </div>
              )}

              {/* Notes from ordering doctor */}
              {test.notes && (
                <div>
                  <SectionLabel
                    icon={<ClipboardText weight="duotone" size={14} />}
                    text="Doctor's Notes"
                  />
                  <div className="mt-2 rounded-xl bg-blue-50/50 border border-blue-100 p-4">
                    <p className="text-[13px] text-blue-800 leading-relaxed whitespace-pre-wrap">
                      {test.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="px-4 sm:px-7 py-3 sm:py-4 border-t border-gray-100 bg-zinc-50/50">
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-[13px] font-semibold text-zinc-600 transition-all duration-200 active:scale-[0.97]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════
   SHARED SUBCOMPONENTS
   ════════════════════════════════════════════════════════════ */

function MetaCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3 flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-white border border-zinc-100 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="text-[13px] font-semibold text-zinc-700 truncate">{value}</p>
      </div>
    </div>
  );
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <p className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-semibold text-zinc-500 uppercase tracking-wide">
      {icon}
      {text}
    </p>
  );
}
