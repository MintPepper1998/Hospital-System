"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowRight, ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default function AboutSection() {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      id="about"
      className="py-24 px-8 max-w-7xl mx-auto font-landing bg-white text-black scroll-mt-24"
    >
      {/* Top Heading Area */}
      <div className="text-center mb-16 flex flex-col items-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white border border-gray-200 rounded-full px-4 py-1.5 mb-6 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm"
        >
          <span>About Us</span>
          <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
        </motion.div>
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-4xl md:text-5xl lg:text-[56px] leading-[1.1] font-medium tracking-tight max-w-4xl mx-auto"
        >
          World-Class Care, <span className="font-bold">About Shree Kamal,</span> Your Health, Our Priority
        </motion.h2>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column - Text & CTA */}
        <div className="lg:col-span-4 flex flex-col gap-8 pt-4">
          <p className="text-xl md:text-2xl font-medium leading-snug tracking-tight text-black">
            Shree Kamal Hospital is a premier medical institution dedicated to providing advanced healthcare, compassionate treatment, and cutting-edge diagnostics.
          </p>
          <div>
            <button className="bg-black text-white rounded-full px-6 py-3 flex items-center gap-3 hover:bg-black/80 transition-colors">
              <span className="font-bold text-sm">Learn More</span>
              <div className="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center">
                <ArrowUpRight weight="bold" size={12} />
              </div>
            </button>
          </div>
        </div>

        {/* Right Column - Bento Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Large Image (Left half of bento) */}
          <motion.div 
            whileHover={{ scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="relative h-[400px] rounded-[24px] overflow-hidden"
          >
            <img src="/images/hero-hospital.png" alt="Hospital" className="img-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/20"></div>
            <div className="absolute top-6 left-6 right-6 text-white">
              <div className="flex justify-between items-start">
                <div className="bg-white/20 backdrop-blur-md rounded-full w-10 h-10 flex items-center justify-center border border-white/30">
                  <ArrowUpRight weight="bold" size={16} />
                </div>
                <p className="text-sm font-medium w-48 text-right leading-tight">
                  A super specialty offering a wide range of medical services.
                </p>
              </div>
            </div>
            <div className="absolute bottom-6 left-6">
              <div className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                24/7 Emergency Care
              </div>
            </div>
          </motion.div>

          {/* Stacked Cards (Right half of bento) */}
          <div className="flex flex-col gap-4 h-[400px]">
            
            {/* Top Image Card */}
            <motion.div 
              whileHover={{ scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="relative h-1/2 rounded-[24px] overflow-hidden bg-gray-100"
            >
              <img src="/images/hospital-lobby.png" alt="Lobby" className="img-cover" />
              <div className="absolute bottom-4 left-4">
                <div className="bg-white/90 backdrop-blur-sm text-black px-3 py-1.5 rounded-full text-xs font-bold">
                  New Delhi, India
                </div>
              </div>
            </motion.div>

            {/* Bottom Text Card */}
            <motion.div 
              whileHover={{ scale: 0.98 }}
              transition={{ duration: 0.4 }}
              className="h-1/2 rounded-[24px] bg-white border border-gray-200 p-6 flex flex-col justify-between"
            >
              <p className="text-sm text-gray-600 font-medium leading-relaxed">
                Dedicated to a culture of wellness and empathy where patient care comes naturally.
              </p>
              <div className="flex justify-end gap-2">
                <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 text-black transition-colors">
                  <ArrowLeft size={16} />
                </button>
                <button className="w-10 h-10 rounded-full bg-black flex items-center justify-center hover:bg-black/80 text-white transition-colors">
                  <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>

          </div>
        </div>

      </div>
    </motion.section>
  );
}
