import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz"
import { startOfMonth, subMonths, endOfMonth, startOfQuarter, subDays } from "date-fns"

export const TZ = "Asia/Kolkata"
export type DateRange = { from: Date; to: Date; fromStr: string; toStr: string }

export function todayStr(): string {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM-dd")
}

export function istDayStart(dateStr: string): Date {
  return fromZonedTime(`${dateStr}T00:00:00`, TZ)
}

export function rangeFromStrings(fromStr: string, toStr: string): DateRange {
  // to is exclusive (start of the day after toStr)
  const toDate = new Date(istDayStart(toStr).getTime() + 24 * 60 * 60 * 1000)
  return { from: istDayStart(fromStr), to: toDate, fromStr, toStr }
}

export function presetRange(p: "today" | "yesterday" | "7d" | "30d" | "mtd" | "lastMonth" | "qtd" | "fytd"): DateRange {
  const now = new Date()
  const todayIST = toZonedTime(now, TZ)
  const today = formatInTimeZone(now, TZ, "yyyy-MM-dd")
  const yesterday = formatInTimeZone(subDays(now, 1), TZ, "yyyy-MM-dd")

  switch (p) {
    case "today":
      return rangeFromStrings(today, today)
    case "yesterday":
      return rangeFromStrings(yesterday, yesterday)
    case "7d":
      return rangeFromStrings(formatInTimeZone(subDays(now, 6), TZ, "yyyy-MM-dd"), today)
    case "30d":
      return rangeFromStrings(formatInTimeZone(subDays(now, 29), TZ, "yyyy-MM-dd"), today)
    case "mtd":
      return rangeFromStrings(formatInTimeZone(startOfMonth(todayIST), TZ, "yyyy-MM-dd"), today)
    case "lastMonth": {
      const lm = subMonths(todayIST, 1)
      return rangeFromStrings(
        formatInTimeZone(startOfMonth(lm), TZ, "yyyy-MM-dd"),
        formatInTimeZone(endOfMonth(lm), TZ, "yyyy-MM-dd")
      )
    }
    case "qtd":
      return rangeFromStrings(formatInTimeZone(startOfQuarter(todayIST), TZ, "yyyy-MM-dd"), today)
    case "fytd": {
      const year = todayIST.getMonth() >= 3 ? todayIST.getFullYear() : todayIST.getFullYear() - 1
      const startOfFy = new Date(year, 3, 1) // 1 April
      return rangeFromStrings(formatInTimeZone(startOfFy, TZ, "yyyy-MM-dd"), today)
    }
    default:
      return rangeFromStrings(today, today)
  }
}

export function parseRangeParams(sp: Record<string, string | string[] | undefined>, fallback: "today" | "yesterday" | "7d" | "30d" | "mtd" | "lastMonth" | "qtd" | "fytd" = "mtd"): DateRange {
  const from = Array.isArray(sp.from) ? sp.from[0] : sp.from
  const to = Array.isArray(sp.to) ? sp.to[0] : sp.to
  if (from && to) return rangeFromStrings(from, to)
  
  const preset = (Array.isArray(sp.preset) ? sp.preset[0] : sp.preset) as any
  if (["today", "yesterday", "7d", "30d", "mtd", "lastMonth", "qtd", "fytd"].includes(preset)) {
    return presetRange(preset)
  }
  return presetRange(fallback)
}

export function fmtIST(d: Date | string, pattern = "dd MMM yyyy, hh:mm a"): string {
  if (typeof d === "string") {
    // If it's a bare date string like "2024-01-01", format it at start of day IST
    if (d.length === 10) return formatInTimeZone(istDayStart(d), TZ, pattern)
    d = new Date(d)
  }
  return formatInTimeZone(d, TZ, pattern)
}
