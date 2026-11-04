"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowRight } from "@phosphor-icons/react/dist/ssr";

export default function NearbyHospitals() {
  return (
    <section className="py-24 px-8 max-w-7xl mx-auto font-landing text-black text-center bg-white">
      
      {/* Header Area */}
      <h2 className="text-4xl md:text-5xl leading-[1.1] font-medium tracking-tight max-w-3xl mx-auto mb-6">
        Expert Care is here,<br />
        Book Your Consultation Today!
      </h2>
      <p className="text-gray-500 text-sm max-w-2xl mx-auto mb-8">
        We ensure that you receive the care you need when you need it most. Reach out to our specialized departments and get immediate support from our experts.
      </p>
      
      <button className="bg-black text-white rounded-full px-6 py-3 mx-auto flex items-center gap-3 hover:bg-black/80 transition-colors mb-16 shadow-xl hover:shadow-2xl">
        <span className="font-bold text-sm">Contact Us</span>
        <div className="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center">
          <ArrowRight weight="bold" size={12} />
        </div>
      </button>

      {/* Partner Logos -> Departments */}
      <div className="flex flex-wrap justify-center items-center gap-12 mb-20 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
        {['Cardiology', 'Neurology', 'Oncology', 'Pediatrics', 'Orthopedics', 'Urology'].map(dept => (
          <span key={dept} className="text-lg font-bold uppercase tracking-widest">{dept}</span>
        ))}
      </div>

      {/* Asymmetric Image Grid */}
      <div className="flex flex-col md:flex-row gap-4 items-end justify-center h-auto md:h-[300px]">
        
        {/* Card 1 */}
        <motion.div whileHover={{ y: -10 }} className="w-full md:w-48 h-48 rounded-[24px] overflow-hidden">
          <img src="/images/hero-hospital.png" alt="Hospital" className="img-cover" />
        </motion.div>

        {/* Card 2 */}
        <motion.div whileHover={{ y: -10 }} className="w-full md:w-32 h-[260px] rounded-[24px] overflow-hidden">
          <img src="/images/hospital-lobby.png" alt="Hospital" className="img-cover" />
        </motion.div>

        {/* Card 3 */}
        <motion.div whileHover={{ y: -10 }} className="w-full md:w-56 h-[220px] rounded-[24px] overflow-hidden relative">
          <img src="/images/hospital-room.png" alt="Hospital" className="img-cover" />
          <div className="absolute top-4 right-4 bg-white text-red-500 w-8 h-8 flex items-center justify-center rounded-full text-lg font-bold shadow-md">
            +
          </div>
        </motion.div>

        {/* Card 4 - Dark Text Box */}
        <motion.div whileHover={{ y: -10 }} className="w-full md:w-64 h-[240px] rounded-[24px] bg-black text-white p-6 flex flex-col justify-between text-left relative overflow-hidden">
          {/* Subtle orb background */}
          <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          
          <h3 className="text-xl font-medium leading-tight relative z-10">
            Join over 500k+ healed patients
          </h3>
          <button className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full py-2 px-4 flex items-center justify-between text-xs font-bold w-full hover:bg-white/20 transition-colors relative z-10">
            <span>Learn More</span>
            <div className="bg-white text-black w-6 h-6 rounded-full flex items-center justify-center">
              <ArrowUpRight size={12} weight="bold" />
            </div>
          </button>
        </motion.div>

        {/* Card 5 */}
        <motion.div whileHover={{ y: -10 }} className="w-full md:w-32 h-40 rounded-[24px] overflow-hidden">
          <img src="/images/emergency-room.png" alt="Hospital" className="img-cover" />
        </motion.div>

        {/* Card 6 */}
        <motion.div whileHover={{ y: -10 }} className="w-full md:w-56 h-48 rounded-[24px] overflow-hidden">
          <img src="/images/doctor-team.png" alt="Hospital" className="img-cover" />
        </motion.div>

      </div>

    </section>
  );
}
