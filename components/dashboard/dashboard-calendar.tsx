"use client"

import { useState } from "react"
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek
} from "date-fns"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const today = new Date()

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })
  const dayNames = ["S", "M", "T", "W", "T", "F", "S"]

  const previousMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const goToToday = () => setCurrentMonth(new Date())

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={previousMonth}
          className="h-6 w-6 text-gray-400 hover:text-gray-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <button 
          onClick={goToToday}
          className="text-sm font-semibold text-gray-900 hover:text-teal-600 transition-colors"
        >
          {format(currentMonth, "MMMM, yyyy")}
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          className="h-6 w-6 text-gray-400 hover:text-gray-600"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((day, idx) => (
          <div
            key={idx}
            className="text-center text-xs font-medium text-gray-400 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isToday = isSameDay(day, today)

          return (
            <div
              key={idx}
              className={`
                h-8 w-8 mx-auto flex items-center justify-center text-xs rounded-full
                transition-colors cursor-pointer
                ${!isCurrentMonth ? "text-gray-300" : "text-gray-700 hover:bg-gray-100"}
                ${isToday ? "bg-teal-500 text-white hover:bg-teal-600 font-semibold" : ""}
              `}
            >
              {format(day, "d")}
            </div>
          )
        })}
      </div>
    </div>
  )
}
