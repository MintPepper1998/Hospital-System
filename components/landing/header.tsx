"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, List, X, Phone } from "@phosphor-icons/react/dist/ssr";

const navLinks = [
  { name: "About Us", href: "#about" },
  { name: "Services", href: "#services" },
  { name: "Facilities", href: "#facilities" },
  { name: "Contact", href: "/contact" },
];

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const el = document.getElementById(href.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setIsOpen(false);
    }
  }, []);

  return (
    <>
      {/* Floating Island Navbar */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-4 md:top-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-6xl z-50"
      >
        <div className="bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-[2rem] px-4 md:px-6 py-3 flex items-center justify-between">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 relative z-50 group">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
              <img 
                src="/images/shreekamal-logo.png" 
                alt="Shree Kamal Hospital" 
                className="w-7 h-7 object-contain"
              />
            </div>
            <span className="text-black font-semibold tracking-tight text-[15px]">
              Shree Kamal Hospital
            </span>
          </Link>

          {/* Desktop Links */}
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="text-gray-600 hover:text-black text-[13px] font-medium transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#F5F5F5] border border-gray-200 rounded-full py-1.5 pl-4 pr-1.5">
              <span className="text-gray-600 text-[12px] font-medium">Ambulance</span>
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm">
                <Phone weight="fill" size={14} className="text-blue-600" />
              </div>
            </div>

            <Link 
              href="/book-appointment" 
              className="group flex items-center gap-3 bg-black text-white rounded-full py-1.5 pl-5 pr-1.5 hover:bg-gray-900 transition-colors active:scale-[0.98] duration-300"
            >
              <span className="text-[13px] font-medium">Book Now</span>
              <div className="w-7 h-7 rounded-full bg-white/10 text-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
                <ArrowUpRight weight="bold" size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
              </div>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden relative z-50 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-black"
          >
            {isOpen ? <X size={18} weight="bold" /> : <List size={18} weight="bold" />}
          </button>

        </div>
      </motion.header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 bg-white/95 backdrop-blur-3xl px-6 pt-32 pb-8 flex flex-col md:hidden"
          >
            <nav className="flex flex-col gap-6">
              {navLinks.map((link, i) => (
                <motion.div
                  key={link.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link 
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="text-3xl font-medium tracking-tight text-black"
                  >
                    {link.name}
                  </Link>
                </motion.div>
              ))}
            </nav>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-auto flex flex-col gap-4"
            >
              <div className="flex items-center gap-4 bg-gray-50 rounded-[2rem] p-4 border border-gray-100">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm">
                  <Phone weight="fill" size={20} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-[12px] text-gray-500 font-medium mb-0.5">24/7 Emergency</div>
                  <div className="text-lg font-semibold text-black tracking-tight">Ambulance Service</div>
                </div>
              </div>

              <Link 
                href="/book-appointment" 
                onClick={() => setIsOpen(false)}
                className="w-full bg-black text-white rounded-[2rem] py-4 px-6 flex items-center justify-between text-lg font-medium"
              >
                Book Appointment
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <ArrowUpRight weight="bold" size={16} />
                </div>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

