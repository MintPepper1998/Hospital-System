"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Play, Asterisk } from "@phosphor-icons/react/dist/ssr";

export default function ExcellenceSection() {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      id="services"
      className="relative py-24 px-8 max-w-7xl mx-auto font-landing bg-white text-black scroll-mt-24"
    >
      {/* Ambient floating background glow */}
      <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-blue-100/60 rounded-full blur-[120px] pointer-events-none -z-10"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* Left Column - Large Image Card */}
        <div className="relative">
          {/* Decorative background element */}
          <div className="absolute -inset-4 bg-[#EAF2F1] rounded-[32px] -z-10"></div>
          
          <motion.div 
            whileHover={{ scale: 0.99 }}
            transition={{ duration: 0.4 }}
            className="relative h-[500px] w-full rounded-[24px] overflow-hidden"
          >
            <img src="/images/hospital-room.png" alt="Hospital Room" className="img-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent"></div>
            
            {/* Text Overlay */}
            <div className="absolute top-10 left-10 right-10">
              <h3 className="text-white text-3xl font-medium tracking-tight mb-4 max-w-xs leading-tight">
                Comfortable rooms with excellent care
              </h3>
              <p className="text-white/80 text-sm max-w-xs font-light leading-relaxed">
                Provide the highest standard of health care with state of the art facilities and services.
              </p>
            </div>

            {/* Video Play Pill */}
            <div className="absolute top-[220px] left-10 bg-black text-white rounded-full pl-4 pr-1 py-1 flex items-center gap-3">
              <span className="text-xs font-bold">See video</span>
              <div className="w-8 h-8 bg-white text-black rounded-full flex items-center justify-center">
                <Play weight="fill" size={14} />
              </div>
            </div>

            {/* Arrows */}
            <div className="absolute bottom-6 right-6 flex gap-2">
              <button className="w-10 h-10 rounded-full border border-white/50 text-white flex items-center justify-center hover:bg-white/20 backdrop-blur-md transition-colors">
                <ArrowLeft size={16} />
              </button>
              <button className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-black/80 transition-colors">
                <ArrowRight size={16} />
              </button>
            </div>
            
            {/* Pagination Line */}
            <div className="absolute bottom-10 left-10 flex gap-1 items-center">
              <div className="w-8 h-1 bg-white rounded-full"></div>
              <div className="w-8 h-1 bg-white/30 rounded-full"></div>
              <div className="w-8 h-1 bg-white/30 rounded-full"></div>
            </div>
          </motion.div>
        </div>

        {/* Right Column - Text & Small Card */}
        <div className="flex flex-col justify-center">
          <h2 className="text-4xl md:text-5xl leading-[1.1] font-medium tracking-tight mb-12 max-w-md text-black">
            Discover Excellence at Shree Kamal Hospital.
          </h2>

          <div className="flex items-center gap-6 mt-4">
            {/* Small Image Card */}
            <div className="relative">
              <div className="w-[160px] h-[160px] rounded-[24px] overflow-hidden">
                <img src="/images/hero-hospital.png" alt="Facility" className="img-cover" />
              </div>
              {/* Overlapping black button */}
              <button className="absolute -left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10">
                <ArrowLeft size={16} />
              </button>
            </div>

            {/* Supporting Text */}
            <div className="flex-1 max-w-[200px]">
              <div className="mb-2 text-black">
                <Asterisk weight="bold" size={20} />
              </div>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                A state-of-the-art facility offering specialized treatments by expert medical professionals and comprehensive 24/7 emergency care.
              </p>
            </div>
          </div>
        </div>

      </div>
    </motion.section>
  );
}
