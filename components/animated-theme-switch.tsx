"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { Sun, Moon } from "@phosphor-icons/react"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

export function AnimatedThemeSwitch() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <DropdownMenuItem className="cursor-pointer py-2.5 opacity-50">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            <span>Theme</span>
          </div>
        </div>
      </DropdownMenuItem>
    )
  }

  const isDark = theme === "dark"

  const toggleTheme = (e: Event | React.MouseEvent) => {
    e.preventDefault()
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <DropdownMenuItem 
      onClick={toggleTheme}
      onSelect={(e) => e.preventDefault()}
      className="cursor-pointer py-2.5 flex items-center justify-between group transition-colors"
    >
      <div className="flex items-center gap-2">
        <div className="relative h-4 w-4 flex items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.div
                key="moon"
                initial={{ y: 20, opacity: 0, rotate: -45 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: -20, opacity: 0, rotate: 45 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute"
              >
                <Moon weight="fill" className="h-4 w-4 text-slate-100" />
              </motion.div>
            ) : (
              <motion.div
                key="sun"
                initial={{ y: 20, opacity: 0, rotate: 45 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                exit={{ y: -20, opacity: 0, rotate: -45 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute"
              >
                <Sun weight="fill" className="h-4 w-4 text-amber-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <span className="font-medium text-sm">Dark Mode</span>
      </div>

      <div 
        className={`w-9 h-5 rounded-full p-[2px] transition-colors duration-300 flex ${
          isDark ? "bg-[#10b981]" : "bg-slate-200 dark:bg-slate-700"
        }`}
      >
        <motion.div
          layout
          className={`h-4 w-4 rounded-full bg-white shadow-sm flex items-center justify-center ${
            isDark ? "origin-right" : "origin-left"
          }`}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
        >
        </motion.div>
      </div>
    </DropdownMenuItem>
  )
}
