"use client";

import { Drop, Heartbeat, FirstAid, Thermometer } from "@phosphor-icons/react/dist/ssr";

export default function FitnessRate({ vitals, isAdmitted }: { vitals: any, isAdmitted?: boolean }) {
  // Map dynamic vitals or fallback to reference-matching placeholders
  const parsedVitals = [
    { 
      name: "Heart Rate", 
      value: vitals?.heartRate || vitals?.HeartRate || "72 bpm", 
      icon: Heartbeat, 
      color: "text-red-500", 
      bg: "bg-red-50" 
    },
    { 
      name: "Blood\nPressure", 
      value: vitals?.bloodPressure || vitals?.BloodPressure || "120/80", 
      icon: Drop, 
      color: "text-rose-500", 
      bg: "bg-rose-50" 
    },
    { 
      name: "Blood\nSugar", 
      value: vitals?.oxygenSaturation || vitals?.SpO2 || "95 mg/dL", 
      icon: FirstAid, 
      color: "text-purple-500", 
      bg: "bg-purple-50" 
    },
    { 
      name: "Diabetics", 
      value: vitals?.temperature || vitals?.Temperature || "07 mmol/L", 
      icon: Thermometer, 
      color: "text-pink-500", 
      bg: "bg-pink-50" 
    },
  ];

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl xl:rounded-[32px] p-4 sm:p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      <h3 className="text-base sm:text-lg font-bold text-[#1e293b] mb-4 sm:mb-5">Fitness Rate</h3>
      
      {/* Grid layout matching image_8.png — vertical list with icon, name, value */}
      <div className="flex flex-col gap-3.5 sm:gap-4 flex-1 justify-center">
        {!isAdmitted ? (
          <div className="flex flex-col items-center justify-center text-center py-4">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-3">
              <Heartbeat weight="fill" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Available when admitted in the hospital</p>
            <p className="text-xs text-gray-400 mt-1">Daily IPD vitals will appear here</p>
          </div>
        ) : (
          parsedVitals.map((vital, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${vital.bg} ${vital.color}`}>
                <vital.icon weight="fill" size={18} />
              </div>
              <span className="text-xs sm:text-sm font-medium text-[#64748b] flex-1 whitespace-pre-line leading-tight">{vital.name}</span>
              <span className="text-sm sm:text-base font-bold text-[#1e293b] flex-shrink-0 tabular-nums">{vital.value}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
