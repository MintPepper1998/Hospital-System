"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowRight, VideoCamera, FileText, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { BlurText } from "@/components/ui/blur-text";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="min-h-[100dvh] pt-32 pb-12 md:pt-40 md:pb-24 px-4 md:px-8 lg:px-12 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 items-center font-landing overflow-hidden">
      
      {/* =========================================
          LEFT SIDE: EDITORIAL TYPOGRAPHY
          ========================================= */}
      <div className="col-span-1 lg:col-span-6 flex flex-col items-start z-10">
        
        {/* Eyebrow badge */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-8 flex items-center gap-3 shadow-sm"
        >
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-800">
            Brand New Facility
          </span>
        </motion.div>

        {/* Massive Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-[72px] leading-[1.05] font-normal tracking-[-0.04em] text-black mb-6 flex flex-col items-start">
          <BlurText text="Advanced" delay={0.1} />
          <BlurText text="Multi-Specialty" delay={0.2} className="text-gray-400" />
          <BlurText text="Care, Redefined." delay={0.3} />
        </h1>

        {/* Subtext */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-lg md:text-[20px] leading-relaxed text-gray-600 max-w-[480px] mb-10 font-normal tracking-tight"
        >
          Welcome to our state-of-the-art hospital. We bring together world-class medical expertise, advanced diagnostics, and compassionate care all under one roof.
        </motion.p>

        {/* Action Area */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto"
        >
          {/* Main CTA */}
          <button className="group flex items-center justify-between gap-6 bg-black text-white rounded-full py-2.5 pl-6 pr-2.5 hover:bg-gray-900 transition-colors active:scale-[0.98] duration-300 w-full sm:w-auto shadow-xl shadow-black/10">
            <span className="text-[15px] font-medium tracking-tight">Book Appointment</span>
            <div className="w-10 h-10 rounded-full bg-white/15 text-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
              <ArrowRight weight="bold" size={16} className="group-hover:translate-x-0.5 transition-transform duration-300" />
            </div>
          </button>

          {/* Secondary CTA / Social Proof Replacement */}
          <button className="group flex items-center gap-4 border border-gray-200 bg-white hover:bg-gray-50 transition-colors rounded-full py-2 pl-2 pr-5 shadow-sm active:scale-[0.98] duration-300">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
              <VideoCamera weight="fill" className="text-blue-600" size={18} />
            </div>
            <span className="text-[13px] font-bold tracking-tight text-black">
              Book Video Consultation
            </span>
          </button>
        </motion.div>

      </div>


      {/* =========================================
          RIGHT SIDE: DOUBLE-BEZEL SHOWCASE
          ========================================= */}
      <div className="col-span-1 lg:col-span-6 relative z-0 mt-8 lg:mt-0">
        
        {/* Floating Test Reports Pill */}
        <Link href="/patient-login">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="absolute -left-6 md:-left-12 top-12 z-20 bg-white/90 backdrop-blur-xl border border-white rounded-[2rem] p-2 pr-5 shadow-2xl flex items-center gap-4 hover:bg-white transition-colors cursor-pointer active:scale-[0.98]"
        >
          <div className="w-10 h-10 bg-black rounded-full shadow-sm flex items-center justify-center text-white">
            <FileText weight="fill" size={20} />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">Patient Portal</span>
            <span className="text-[14px] font-bold text-black tracking-tight leading-tight">Check Test Reports</span>
          </div>
        </motion.div>
        </Link>

        {/* Double-Bezel Hardware Frame */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full aspect-[4/5] sm:aspect-square lg:aspect-[4/5] max-h-[800px] bg-gray-100 rounded-[2.5rem] p-2 md:p-3 shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-white overflow-hidden"
        >
          {/* Inner Core Image */}
          <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-gray-200 shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)]">
            <img 
              src="/images/hero-hospital-final.jpg" 
              alt="Hospital Building" 
              className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-[2s] ease-[cubic-bezier(0.16,1,0.3,1)]"
            />
            {/* Soft inner glow overlay */}
            <div className="absolute inset-0 border border-white/20 rounded-[2rem] pointer-events-none"></div>
            {/* Base gradient for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none"></div>
            
            {/* Floating Tag inside image */}
            <div className="absolute bottom-6 md:bottom-8 left-6 md:left-8 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-white text-xs font-semibold tracking-wide">24/7 Emergency Active</span>
            </div>
          </div>
        </motion.div>

        {/* Decorative background blur blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-100/40 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      </div>

    </section>
  );
}
