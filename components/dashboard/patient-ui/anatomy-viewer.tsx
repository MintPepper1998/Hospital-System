"use client";

import { motion } from "framer-motion";
import { MagnifyingGlassPlus, ArrowsOutSimple, HandPointing, Sparkle, Heartbeat } from "@phosphor-icons/react/dist/ssr";

export default function AnatomyViewer() {
  return (
    <div className="relative w-full h-[360px] sm:h-[440px] xl:h-[520px] p-4 sm:p-6 flex items-center justify-center overflow-hidden">
      
      {/* 3D Model Placeholder */}
      <img 
        src="/images/3d_anatomy_model.png" 
        alt="3D Anatomy Model" 
        className="h-full object-contain mix-blend-multiply opacity-90 scale-110 translate-y-4"
      />

      {/* Floating Badge (Heart Rate) */}
      <motion.div 
        initial={{ y: 0 }}
        animate={{ y: [-5, 5, -5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 right-4 sm:left-1/2 sm:ml-16 bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3 shadow-xl border border-gray-100 flex items-center gap-2 sm:gap-3 z-10"
      >
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-red-50 rounded-lg sm:rounded-xl flex items-center justify-center text-red-500">
          <Heartbeat weight="fill" size={20} className="sm:hidden" />
          <Heartbeat weight="fill" size={24} className="hidden sm:block" />
        </div>
        <div>
          <p className="text-[9px] sm:text-[10px] text-[#64748b] font-medium uppercase tracking-wider mb-0.5">Heart Rate</p>
          <p className="text-[#1e293b] font-bold text-xs sm:text-sm">72 bpm</p>
        </div>
      </motion.div>

      {/* Floating Badge (Joint/Knee) */}
      <div className="absolute top-[60%] left-[30%] w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full border-2 border-white shadow-md animate-pulse"></div>
      
      {/* Floating Badge (Head) */}
      <div className="absolute top-[20%] left-[48%] w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full border-2 border-white shadow-md"></div>

      {/* Control Tools (Right side) — hidden on mobile */}
      <div className="hidden sm:flex absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 flex-col gap-2 sm:gap-3">
        <button className="w-9 h-9 sm:w-10 sm:h-10 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-[#64748b] shadow-sm border border-gray-100 transition-colors active:scale-[0.95]">
          <MagnifyingGlassPlus weight="bold" size={18} />
        </button>
        <button className="w-9 h-9 sm:w-10 sm:h-10 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-[#64748b] shadow-sm border border-gray-100 transition-colors active:scale-[0.95]">
          <ArrowsOutSimple weight="bold" size={18} />
        </button>
        <button className="w-9 h-9 sm:w-10 sm:h-10 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-[#64748b] shadow-sm border border-gray-100 transition-colors active:scale-[0.95]">
          <HandPointing weight="bold" size={18} />
        </button>
        <button className="w-9 h-9 sm:w-10 sm:h-10 bg-white hover:bg-gray-100 rounded-full flex items-center justify-center text-[#64748b] shadow-sm border border-gray-100 transition-colors active:scale-[0.95]">
          <Sparkle weight="fill" size={18} />
        </button>
      </div>

      {/* Bottom Mini Thumbnails */}
      <div className="absolute bottom-4 sm:bottom-6 flex gap-2 sm:gap-3 z-10">
        <div className="w-11 h-11 sm:w-14 sm:h-14 bg-white rounded-lg sm:rounded-xl overflow-hidden border border-gray-100 shadow-sm flex items-center justify-center">
          <img src="/images/3d_anatomy_model.png" className="w-[200%] h-[200%] object-cover object-top opacity-80" alt="Head" />
        </div>
        <div className="w-11 h-11 sm:w-14 sm:h-14 bg-white rounded-lg sm:rounded-xl overflow-hidden border border-gray-100 shadow-sm flex items-center justify-center">
          <img src="/images/3d_anatomy_model.png" className="w-[120%] h-[120%] object-cover object-center opacity-80" alt="Torso" />
        </div>
        <div className="w-11 h-11 sm:w-14 sm:h-14 bg-white rounded-lg sm:rounded-xl overflow-hidden border border-gray-100 shadow-sm flex items-center justify-center p-1.5 sm:p-2">
          {/* Heart icon substitute for thumbnail */}
          <Heartbeat weight="fill" size={20} className="text-red-400" />
        </div>
      </div>

      {/* Bottom base ellipse */}
      <div className="absolute bottom-16 sm:bottom-24 w-48 sm:w-64 h-6 sm:h-8 border border-gray-200 rounded-[100%] z-0"></div>
    </div>
  );
}
