"use client"

import { useEffect, useState } from "react"
import { Sparkles } from "lucide-react"

interface DoctorGreetingProps {
  doctorName: string
  specialization: string | null
  department: string | null
  totalToday: number
  completed: number
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good Morning"
  if (hour < 17) return "Good Afternoon"
  return "Good Evening"
}

function getCurrentTime() {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export function DoctorGreeting({
  doctorName,
  specialization,
  department,
  totalToday,
  completed,
}: DoctorGreetingProps) {
  const [time, setTime] = useState(getCurrentTime())

  useEffect(() => {
    const interval = setInterval(() => setTime(getCurrentTime()), 30000)
    return () => clearInterval(interval)
  }, [])

  const greeting = getGreeting()
  const remaining = totalToday - completed

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between bg-transparent pb-4 border-b border-gray-200">
      <div className="space-y-1.5">
        <h1 className="text-2xl md:text-[28px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
          {greeting}, Dr. {doctorName} <span className="text-gray-300 font-light">—</span> 
          <span className="text-teal-600 font-semibold">{totalToday} patients today</span>
        </h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs shadow-sm border border-gray-200/50">⌘K</span>
          <p>Quick Tip: Use ⌘K to search any patient instantly by name or ID.</p>
        </div>
      </div>
      <div className="mt-4 md:mt-0">
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
          View My Schedule
          <Sparkles className="h-4 w-4 text-teal-600" />
        </button>
      </div>
    </div>
  )
}
