"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"

export const CardShell = ({ children, className = "", title, icon: Icon, action, defaultExpanded = true }: any) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className={`p-1.5 bg-slate-50/50 border border-slate-100 rounded-[2rem] ${className}`}>
      <div className="bg-white rounded-[calc(2rem-0.375rem)] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] border border-slate-100/50 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
        
        {/* Header - Clickable for toggle */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
          className={`w-full flex items-center justify-between transition-all duration-300 hover:bg-slate-50/30 active:bg-slate-100/50 focus:outline-none cursor-pointer ${isExpanded ? 'px-6 pt-5 pb-4 border-b border-slate-100/60' : 'px-5 py-3.5'}`}
        >
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 bg-blue-50/50 text-blue-600 rounded-full">
                <Icon className="w-4 h-4 stroke-[2]" />
              </div>
            )}
            {title && <h3 className="text-sm font-semibold text-slate-800 tracking-tight">{title}</h3>}
          </div>
          <div className="flex items-center gap-4">
            {action && <div onClick={(e) => e.stopPropagation()}>{action}</div>}
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="p-1 rounded-full bg-slate-100/50 text-slate-400 hover:bg-slate-200/50 hover:text-slate-600 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </div>
        </div>

        {/* Content - Animated Height */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            >
              <div className="p-6 pt-6 flex flex-col h-full">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
}
