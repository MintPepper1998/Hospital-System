"use client"

import { useEffect, useState } from "react"
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Stethoscope,
} from "lucide-react"

interface StatCardProps {
  label: string
  value: number
  subtitle: string
  icon: React.ReactNode
  gradient: string
  iconBg: string
  delay: number
}

function AnimatedNumber({ target, delay }: { target: number; delay: number }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (target === 0) return
    const timeout = setTimeout(() => {
      let start = 0
      const step = Math.max(1, Math.floor(target / 20))
      const interval = setInterval(() => {
        start += step
        if (start >= target) {
          setCount(target)
          clearInterval(interval)
        } else {
          setCount(start)
        }
      }, 40)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timeout)
  }, [target, delay])

  return <>{count}</>
}

function StatCard({ label, value, subtitle, icon, gradient, iconBg, delay }: StatCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm p-5 shadow-sm hover:shadow-lg transition-all duration-500 hover:-translate-y-1"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Subtle gradient accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${gradient} opacity-80 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            {label}
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-2 tabular-nums">
            <AnimatedNumber target={value} delay={delay} />
          </p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`h-11 w-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>

      {/* Decorative circle */}
      <div className={`absolute -bottom-6 -right-6 h-24 w-24 rounded-full ${gradient} opacity-[0.06] group-hover:opacity-[0.1] transition-opacity duration-500`} />
    </div>
  )
}

interface DoctorStatsProps {
  totalToday: number
  completed: number
  pending: number
  inProgress: number
}

export function DoctorStats({ totalToday, completed, pending, inProgress }: DoctorStatsProps) {
  const completionRate = totalToday > 0 ? Math.round((completed / totalToday) * 100) : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3 xl:gap-4">
      <StatCard
        label="Today"
        value={totalToday}
        subtitle="Scheduled"
        icon={<CalendarCheck className="h-4 w-4 text-teal-600" />}
        gradient="bg-gradient-to-r from-teal-400 to-emerald-500"
        iconBg="bg-teal-50"
        delay={0}
      />
      <StatCard
        label="Done"
        value={completed}
        subtitle={`${completionRate}%`}
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
        gradient="bg-gradient-to-r from-emerald-400 to-green-500"
        iconBg="bg-emerald-50"
        delay={80}
      />
      <StatCard
        label="Queue"
        value={pending}
        subtitle="Waiting"
        icon={<Clock3 className="h-4 w-4 text-amber-600" />}
        gradient="bg-gradient-to-r from-amber-400 to-orange-500"
        iconBg="bg-amber-50"
        delay={160}
      />
      <StatCard
        label="Active"
        value={inProgress}
        subtitle="Consulting"
        icon={<Stethoscope className="h-4 w-4 text-violet-600" />}
        gradient="bg-gradient-to-r from-violet-400 to-purple-500"
        iconBg="bg-violet-50"
        delay={240}
      />
    </div>
  )
}
