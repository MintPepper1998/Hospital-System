"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

const placeholderData = [
  { name: "Sa", heartRate: 65, bp: 80, sugar: 40 },
  { name: "Su", heartRate: 55, bp: 70, sugar: 45 },
  { name: "Mo", heartRate: 75, bp: 85, sugar: 50 },
  { name: "Tu", heartRate: 60, bp: 75, sugar: 40 },
  { name: "Wed", heartRate: 70, bp: 80, sugar: 48 },
  { name: "Tr", heartRate: 85, bp: 90, sugar: 55 },
  { name: "Fr", heartRate: 65, bp: 85, sugar: 45 },
];

export default function HealthChart({ chartData, isAdmitted }: { chartData?: any[], isAdmitted?: boolean }) {
  const data = chartData && chartData.length > 0 ? chartData : placeholderData;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl xl:rounded-[32px] p-4 sm:p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-2 sm:gap-0">
        <div className="flex items-center gap-3">
          <h3 className="text-base sm:text-lg font-bold text-[#1e293b]">Health Overview</h3>
          {/* Small toolbar icons matching image_8.png */}
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            <button className="w-6 h-6 rounded-md bg-[#f8f9fb] hover:bg-gray-200 flex items-center justify-center text-[#94a3b8] transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="0.5" y="0.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="0.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="0.5" y="7" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="7" y="7" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            </button>
            <button className="w-6 h-6 rounded-md bg-[#f8f9fb] hover:bg-gray-200 flex items-center justify-center text-[#94a3b8] transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="1" y1="3" x2="11" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="1" y1="9" x2="11" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </button>
            <button className="w-6 h-6 rounded-md bg-[#f8f9fb] hover:bg-gray-200 flex items-center justify-center text-[#94a3b8] transition-colors">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
        <div className="flex gap-3 sm:gap-2 flex-wrap">
          {/* Quick legend mimicking design */}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#1a56db]"></div>
            <span className="text-[10px] text-[#64748b] font-medium">Heart Rate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#0ea5e9]"></div>
            <span className="text-[10px] text-[#64748b] font-medium">Blood Pressure</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#2dd4bf]"></div>
            <span className="text-[10px] text-[#64748b] font-medium">Blood Sugar</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[140px] sm:min-h-[160px] flex flex-col justify-center">
        {!isAdmitted ? (
          <div className="flex flex-col items-center justify-center text-center py-6 px-4">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <p className="text-sm font-medium text-gray-500">Available when admitted in the hospital</p>
            <p className="text-xs text-gray-400 mt-1">Daily IPD vitals chart will appear here</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "#94a3b8" }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: "#94a3b8" }} 
                ticks={[0, 10, 25, 50, 75, 95]}
              />
              <Tooltip 
                cursor={{ fill: '#f8f9fb' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
              />
              <Bar dataKey="heartRate" fill="#1a56db" radius={[4, 4, 4, 4]} barSize={5} />
              <Bar dataKey="bp" fill="#0ea5e9" radius={[4, 4, 4, 4]} barSize={5} />
              <Bar dataKey="sugar" fill="#2dd4bf" radius={[4, 4, 4, 4]} barSize={5} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
