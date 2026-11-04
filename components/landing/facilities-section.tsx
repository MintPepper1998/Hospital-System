"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

const facilities = [
  {
    title: "Emergency Care 24/7 hours area",
    image: "/images/emergency-room.png",
    icon: "🏥",
  },
  {
    title: "Comfortable rooms with excellent care",
    image: "/images/hospital-room.png",
    icon: "🛏️",
  },
  {
    title: "Advanced medical testing and imaging",
    image: "/images/diagnostics-lab.png",
    icon: "🔬",
  },
  {
    title: "State-of-the-art operation theaters",
    image: "/images/hospital-lobby.png",
    icon: "🏢",
  }
];

export default function FacilitiesSection() {
  return (
    <motion.section 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      id="facilities"
      className="py-24 font-landing bg-[#FAFAFA] rounded-[48px] mx-4 my-12 overflow-hidden scroll-mt-24"
    >
      <div className="max-w-7xl mx-auto px-8">
        
        {/* Header Row */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-white border border-gray-200 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-black">
              Facilities
            </div>
            <h2 className="text-2xl md:text-3xl font-medium text-black">
              Explore Our Facilities
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button className="bg-black text-white rounded-full px-6 py-2 text-sm font-bold hover:bg-black/80 transition-colors flex items-center gap-2">
              View All Facilities <ArrowUpRight weight="bold" size={14} />
            </button>
          </div>
        </div>

        {/* Carousel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {facilities.map((facility, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
              className="relative h-[360px] rounded-[24px] overflow-hidden group cursor-pointer bg-black"
            >
              <img 
                src={facility.image} 
                alt={facility.title} 
                className="img-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              
              {/* Top Left Icon Pill */}
              <div className="absolute top-4 left-4 bg-white/20 backdrop-blur-md rounded-full w-8 h-8 flex items-center justify-center border border-white/20 text-xs">
                {facility.icon}
              </div>

              {/* Bottom Content */}
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-white text-lg font-medium leading-tight mb-4">
                  {facility.title}
                </h3>
              </div>

              {/* Hover Button */}
              <div className="absolute bottom-6 right-6 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-lg">
                  <ArrowUpRight weight="bold" size={16} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Footer Area with Navigation */}
        <div className="flex justify-between items-center mt-12">
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white text-black transition-colors">
              <ArrowLeft size={16} />
            </button>
            <button className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white hover:bg-black/80 transition-colors">
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="text-xs text-gray-500 max-w-[200px] text-right">
            Swipe to explore more of our world-class medical facilities and specialized care units.
          </div>
        </div>

      </div>
    </motion.section>
  );
}
