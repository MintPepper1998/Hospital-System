"use client";

import { motion } from "framer-motion";
import { 
  House, 
  Heartbeat, 
  Dna, 
  Tooth, 
  ChartLineUp, 
  Gear,
  SignOut,
  Moon,
  MagnifyingGlass,
  CalendarBlank,
  Bell
} from "@phosphor-icons/react/dist/ssr";

export default function MedicalMonitorPage() {
  return (
    <div className="min-h-screen w-full bg-[#FDF2F0] p-4 md:p-6 flex font-sans overflow-hidden">
      
      {/* Floating Sidebar */}
      <nav className="w-[80px] bg-white rounded-[40px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center py-8 mr-6 h-[calc(100vh-48px)] flex-shrink-0 relative z-20">
        {/* Logo */}
        <div className="flex flex-col items-center mb-16 cursor-pointer">
          <span className="text-[#3CB4E5] font-bold text-xl leading-none">bio</span>
          <span className="text-black font-bold text-sm tracking-widest">track</span>
        </div>

        {/* Menu Icons */}
        <div className="flex flex-col gap-8 flex-1">
          <button className="w-12 h-12 bg-[#F3F4F6] rounded-[18px] flex items-center justify-center text-gray-800 shadow-sm transition-transform hover:scale-105">
            <House weight="fill" size={22} />
          </button>
          <button className="w-12 h-12 text-gray-400 hover:text-gray-800 flex items-center justify-center transition-colors">
            <Heartbeat weight="regular" size={24} />
          </button>
          <button className="w-12 h-12 text-gray-400 hover:text-gray-800 flex items-center justify-center transition-colors">
            <Dna weight="regular" size={24} />
          </button>
          <button className="w-12 h-12 text-gray-400 hover:text-gray-800 flex items-center justify-center transition-colors">
            <Tooth weight="regular" size={24} />
          </button>
          <button className="w-12 h-12 text-gray-400 hover:text-gray-800 flex items-center justify-center transition-colors">
            <ChartLineUp weight="regular" size={24} />
          </button>
          <button className="w-12 h-12 text-gray-400 hover:text-gray-800 flex items-center justify-center transition-colors">
            <Gear weight="regular" size={24} />
          </button>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-col gap-6 mt-auto items-center">
          <button className="text-gray-400 hover:text-gray-800 transition-colors">
            <SignOut weight="regular" size={24} />
          </button>
          
          {/* Theme Toggle */}
          <div className="w-14 h-[30px] bg-[#3CB4E5] rounded-full p-1 flex items-center cursor-pointer shadow-inner">
            <div className="w-6 h-6 bg-white rounded-full shadow-sm flex items-center justify-center ml-auto">
              <Moon weight="fill" size={14} className="text-[#3CB4E5]" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 h-[calc(100vh-48px)] flex flex-col relative z-10 overflow-y-auto pr-2 custom-scrollbar">
        
        {/* Header */}
        <header className="flex justify-between items-start mb-6">
          <div className="w-1/3"></div>
          
          {/* Search */}
          <div className="flex-1 flex justify-center">
            <div className="bg-white rounded-full py-2.5 px-5 flex items-center justify-between w-[380px] shadow-sm">
              <input 
                type="text" 
                placeholder="Search" 
                className="bg-transparent border-none outline-none text-sm text-gray-600 w-full"
              />
              <MagnifyingGlass size={18} className="text-gray-400" />
            </div>
          </div>

          {/* Right Profile Actions */}
          <div className="w-1/3 flex justify-end items-center gap-4">
            <button className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm hover:shadow-md transition-shadow">
              <CalendarBlank weight="regular" size={20} />
            </button>
            <button className="w-11 h-11 bg-white rounded-full flex items-center justify-center text-gray-600 shadow-sm hover:shadow-md transition-shadow relative">
              <Bell weight="regular" size={20} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-red-400 rounded-full"></span>
            </button>
            
            <div className="flex items-center gap-3 ml-2 cursor-pointer">
              <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-white shadow-sm bg-gray-200">
                <img src="https://i.pravatar.cc/150?img=11" alt="Profile" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="text-gray-900 font-semibold text-sm leading-tight">Charles Robbie</span>
                <span className="text-gray-400 text-[11px]">25 years old &bull; New York, USA</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="flex gap-8 flex-1">
          
          {/* Left Column (3D Visuals & Title) */}
          <div className="w-[45%] flex flex-col relative">
            <h1 className="text-[64px] font-light leading-[1.05] tracking-tight text-gray-800 mb-8 mt-10">
              Medical<br />
              <span className="font-medium">Dashboard</span>
            </h1>

            {/* Futuristic 3D Model Area */}
            <div className="relative w-full flex-1 flex items-center justify-center min-h-[400px]">
              {/* Note: This img should ideally be a transparent PNG of the glass heart or body */}
              <motion.img 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2 }}
                src="https://images.unsplash.com/photo-1530213786676-412202b39f1c?q=80&w=600&auto=format&fit=crop&bg=transparent"
                alt="Medical Scan"
                className="w-full max-w-[380px] h-auto object-contain drop-shadow-2xl opacity-90 rounded-full mix-blend-multiply filter contrast-125"
                style={{ clipPath: 'circle(40% at 50% 50%)' }} // Placeholder masking to make the stock image look a bit abstract
              />

              {/* Floating Stat Pills */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                className="absolute top-[10%] right-[10%] bg-white/90 backdrop-blur-md rounded-2xl py-3 px-5 shadow-lg border border-white flex flex-col items-center"
              >
                <span className="text-gray-400 text-[11px] mb-1">Oxygen Saturation</span>
                <span className="text-gray-900 font-bold text-xl leading-none">97 <span className="text-sm">%</span></span>
                <span className="text-gray-400 text-[9px] mt-0.5">SpO2</span>
              </motion.div>

              <motion.div 
                initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                className="absolute top-[45%] -right-[5%] bg-white/90 backdrop-blur-md rounded-2xl py-3 px-5 shadow-lg border border-white flex flex-col items-center"
              >
                <span className="text-gray-400 text-[11px] mb-1">Blood Pressure</span>
                <span className="text-gray-900 font-bold text-2xl leading-none">122<span className="text-gray-300">/</span>78</span>
                <span className="text-gray-400 text-[9px] mt-0.5">mmHg</span>
              </motion.div>

              <motion.div 
                initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                className="absolute bottom-[10%] left-[10%] bg-white/90 backdrop-blur-md rounded-2xl py-3 px-5 shadow-lg border border-white flex flex-col items-center"
              >
                <span className="text-gray-400 text-[11px] mb-1">Temperature</span>
                <span className="text-gray-900 font-bold text-xl leading-none">36.8 <span className="text-sm">°C</span></span>
              </motion.div>
            </div>
          </div>

          {/* Right Column (Data & Charts) */}
          <div className="w-[55%] flex flex-col gap-6 pt-4">
            
            {/* Top Stats */}
            <div className="flex justify-end gap-12 pr-6">
              <div className="flex flex-col items-end">
                <span className="text-gray-900 font-medium text-3xl leading-none">O+</span>
                <span className="text-gray-400 text-xs mt-1">Blood</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-gray-900 font-medium text-3xl leading-none">186<span className="text-xl">cm</span></span>
                <span className="text-gray-400 text-xs mt-1">Height</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-gray-900 font-medium text-3xl leading-none">90<span className="text-xl">kg</span></span>
                <span className="text-gray-400 text-xs mt-1">Weight</span>
              </div>
            </div>

            {/* Heart Rate Trends Chart Card */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-white flex flex-col relative overflow-hidden mt-2">
              <h3 className="text-gray-800 font-medium text-[15px] mb-6">Heart Rate Trends</h3>
              <div className="w-full h-[180px] flex items-end relative">
                {/* Y Axis */}
                <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-[10px] text-gray-400">
                  <span>280</span>
                  <span>52</span>
                  <span>32</span>
                  <span>0</span>
                </div>
                
                {/* Mock Chart Area */}
                <div className="ml-8 w-full h-full relative">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 flex flex-col justify-between border-l border-gray-100">
                    <div className="w-full border-t border-gray-100 border-dashed h-0"></div>
                    <div className="w-full border-t border-gray-100 border-dashed h-0"></div>
                    <div className="w-full border-t border-gray-100 border-dashed h-0"></div>
                    <div className="w-full border-t border-gray-100 border-dashed h-0"></div>
                  </div>
                  
                  {/* Mock SVG Curves */}
                  <svg className="absolute inset-0 w-full h-[80%] top-[10%] overflow-visible" preserveAspectRatio="none">
                    {/* Top Red Curve */}
                    <path d="M 0 50 C 30 10, 60 80, 100 40 C 140 10, 180 60, 220 20 C 260 -10, 300 70, 350 30 C 400 0, 450 50, 500 20" 
                          fill="none" stroke="#FF8A8A" strokeWidth="2.5" />
                    <path d="M 0 50 C 30 10, 60 80, 100 40 C 140 10, 180 60, 220 20 C 260 -10, 300 70, 350 30 C 400 0, 450 50, 500 20 L 500 100 L 0 100 Z" 
                          fill="url(#redGrad)" opacity="0.15" />
                          
                    {/* Bottom Green Curve */}
                    <path d="M 0 90 C 40 70, 80 110, 120 85 C 160 60, 200 120, 250 90 C 300 60, 340 130, 400 80 C 450 40, 480 100, 500 70" 
                          fill="none" stroke="#68D391" strokeWidth="2.5" />
                    <path d="M 0 90 C 40 70, 80 110, 120 85 C 160 60, 200 120, 250 90 C 300 60, 340 130, 400 80 C 450 40, 480 100, 500 70 L 500 130 L 0 130 Z" 
                          fill="url(#greenGrad)" opacity="0.15" />
                          
                    <defs>
                      <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FF8A8A" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                      <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#68D391" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* X Axis */}
                <div className="absolute left-8 right-0 bottom-0 flex justify-between text-[10px] text-gray-400">
                  <span>1pm</span><span>2pm</span><span>3pm</span><span>4pm</span><span>5pm</span><span>6pm</span><span>7pm</span><span>8pm</span>
                </div>
              </div>
            </div>

            {/* Bottom Table Card */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-white flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] text-gray-400 border-b border-gray-50">
                    <th className="pb-3 font-medium">Date / Time</th>
                    <th className="pb-3 font-medium">HR (bpm)</th>
                    <th className="pb-3 font-medium">mmHg</th>
                    <th className="pb-3 font-medium">SpO2 (%)</th>
                    <th className="pb-3 font-medium">HRV (ms)</th>
                    <th className="pb-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-gray-700">
                  {[
                    { date: "2025-10-15", time: "18:50", hr: "78", mmhg: "120/80", spo2: "98", hrv: "55", status: "Normal", color: "bg-[#E6F8EF] text-[#34C759]" },
                    { date: "2025-10-15", time: "18:50", hr: "95", mmhg: "135/85", spo2: "95", hrv: "40", status: "Low", color: "bg-[#F3F7FD] text-[#3CB4E5]" },
                    { date: "2025-10-15", time: "18:50", hr: "110", mmhg: "140/90", spo2: "96", hrv: "30", status: "High", color: "bg-[#FFF0F0] text-[#FF3B30]" },
                    { date: "2025-10-15", time: "18:50", hr: "98", mmhg: "120/80", spo2: "94", hrv: "34", status: "Normal", color: "bg-[#E6F8EF] text-[#34C759]" }
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-50 last:border-0">
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span>{row.date}</span>
                          <span className="text-[10px] text-gray-400">{row.time}</span>
                        </div>
                      </td>
                      <td className="py-3 font-medium text-gray-900">{row.hr}</td>
                      <td className="py-3 font-medium text-gray-900">{row.mmhg}</td>
                      <td className="py-3 text-gray-500">{row.spo2}</td>
                      <td className="py-3 text-gray-500">{row.hrv}</td>
                      <td className="py-3 text-center">
                        <span className={`px-3 py-1.5 rounded-full font-medium text-[10px] ${row.color}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #E2E8F0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
