"use client";

import { Bell, ChatTeardropText, SignOut, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { signOut } from "next-auth/react";

export default function PatientHeader({ 
  user 
}: { 
  user: { name: string; email: string; id: string; image?: string | null } 
}) {
  const firstName = user.name?.split(" ")[0] || "Patient";

  return (
    <header className="print:hidden flex justify-between items-center py-4 px-4 sm:py-5 sm:px-8 bg-[#f5f6f8]">
      {/* Left: Greeting */}
      <div className="pl-10 lg:pl-0">
        <h1 className="text-xl sm:text-[28px] font-bold text-[#1e293b] leading-tight flex items-center gap-2">
          Hello, {firstName} <span className="text-xl sm:text-2xl">👋</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#64748b] mt-0.5 sm:mt-1 font-medium">
          Here&apos;s your health update for today.
        </p>
      </div>

      {/* Right: Actions Row */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Upgrade Now Button */}
        <button className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-[#1a56db] to-[#0ea5e9] hover:from-[#1e40af] hover:to-[#0284c7] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-md shadow-blue-500/20 transition-all duration-200 active:scale-[0.97]">
          <ArrowUpRight weight="bold" size={14} />
          Upgrade Now
        </button>

        {/* Message Icon */}
        <button className="hidden xs:flex w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full items-center justify-center text-[#64748b] hover:text-[#1e293b] shadow-sm transition-colors border border-gray-100">
          <ChatTeardropText weight="bold" size={18} />
        </button>

        {/* Notification Bell */}
        <button className="relative w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full flex items-center justify-center text-[#64748b] hover:text-[#1e293b] shadow-sm transition-colors border border-gray-100">
          <Bell weight="bold" size={18} />
          <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
        </button>

        {/* Avatar */}
        <div className="ml-0.5 sm:ml-1">
          <img 
            src={user.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1e293b&color=fff`} 
            alt={user.name} 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full shadow-sm border-2 border-white object-cover"
          />
        </div>

        {/* Logout — small, secondary */}
        <button 
          onClick={() => signOut({ callbackUrl: "/patient-login" })}
          className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 active:scale-[0.97]"
        >
          <SignOut weight="bold" size={14} />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
