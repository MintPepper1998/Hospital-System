"use client";

import { motion } from "framer-motion";
import { Quotes } from "@phosphor-icons/react/dist/ssr";

export default function TestimonialSection() {
  return (
    <section className="py-24 px-8 max-w-5xl mx-auto font-landing bg-white text-black relative overflow-hidden">
      
      {/* Giant Arc Background Graphic */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full border-[1px] border-gray-200/50 -z-10 pointer-events-none"></div>
      
      <div className="flex flex-col items-center text-center pt-16">
        
        {/* Quote Icon */}
        <div className="mb-8 text-black">
          <Quotes weight="fill" size={32} className="opacity-80" />
        </div>

        {/* Quote Text */}
        <h3 className="text-xl md:text-2xl lg:text-3xl font-medium leading-relaxed max-w-3xl mb-12 tracking-tight">
          "With our dedication and expertise in healthcare, we strive to provide services that are not just treatments, but a comforting journey toward better health."
        </h3>

        {/* Author Details */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-200">
             <img src="/images/doctor-team.png" alt="Alan Coleman" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col items-start text-left">
            <span className="font-bold text-sm text-black">Alan Coleman</span>
            <span className="text-xs text-gray-500 font-medium">Verified Patient</span>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="mt-16 flex gap-1">
           <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
           <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
           <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
        </div>

      </div>
    </section>
  );
}
