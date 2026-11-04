"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="relative bg-white pt-24 pb-8 overflow-hidden font-landing border-t border-gray-100">
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 relative">
        
        {/* Floating Images Over Typography */}
        <div className="absolute top-10 left-10 md:left-32 z-10 hidden md:block">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: -2 }}
            className="w-32 h-32 md:w-48 md:h-48 rounded-[24px] overflow-hidden shadow-2xl border-4 border-white"
          >
            <img src="/images/hero-hospital.png" alt="Hospital" className="img-cover" />
          </motion.div>
        </div>
        
        <div className="absolute top-0 right-10 md:right-32 z-10 hidden md:block">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 2 }}
            className="w-24 h-32 md:w-40 md:h-48 rounded-[24px] overflow-hidden shadow-2xl border-4 border-white"
          >
            <img src="/images/hospital-lobby.png" alt="Lobby" className="img-cover" />
          </motion.div>
        </div>

        {/* Massive Typography */}
        <div className="text-center w-full flex justify-center items-center mb-16 relative z-0">
          <h1 className="text-[9vw] font-medium leading-[0.8] tracking-tighter text-black uppercase whitespace-nowrap">
            SHREE KAMAL- <span className="font-light">CONTACT</span>
          </h1>
        </div>

        {/* Small Footer Links and Info */}
        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-500 font-medium border-t border-gray-200 pt-8 gap-4">
          <div className="flex items-center gap-6">
            <span>© 2026 Shree Kamal Hospital</span>
            <div className="hidden md:flex items-center gap-6">
              <Link href="#" className="hover:text-black transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-black transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-black transition-colors">Cookie Policy</Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-all">in</a>
            <a href="#" className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-all">fb</a>
            <a href="#" className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-all">tw</a>
            <a href="#" className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-all">ig</a>
          </div>
          
          <div className="hidden lg:block text-right">
             Built for Excellence in Healthcare.
          </div>
        </div>

      </div>
    </footer>
  );
}
