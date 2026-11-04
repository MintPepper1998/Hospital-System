import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz"

export const DEFAULT_TIMEZONE = "Asia/Kolkata"

/**
 * Returns current Date in Asia/Kolkata timezone
 */
export function getNowIST(): Date {
  return toZonedTime(new Date(), DEFAULT_TIMEZONE)
}

/**
 * Formats a date/timestamp to Asia/Kolkata time string (e.g. "05:36 AM" or "11:30 AM")
 */
export function formatTimeIST(
  date: Date | string | number | null | undefined,
  pattern = "hh:mm a"
): string {
  if (!date) return ""
  try {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
    return formatInTimeZone(d, DEFAULT_TIMEZONE, pattern)
  } catch {
    return ""
  }
}

/**
 * Formats a date/timestamp to 24-hour Asia/Kolkata time string (e.g. "05:36" or "17:30")
 */
export function formatTime24IST(
  date: Date | string | number | null | undefined
): string {
  return formatTimeIST(date, "HH:mm")
}

/**
 * Formats a date/timestamp to Asia/Kolkata date string (e.g. "26/10/2026")
 */
export function formatDateIST(
  date: Date | string | number | null | undefined,
  pattern = "dd/MM/yyyy"
): string {
  if (!date) return ""
  try {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
    return formatInTimeZone(d, DEFAULT_TIMEZONE, pattern)
  } catch {
    return ""
  }
}

/**
 * Formats a date/timestamp to Asia/Kolkata full date-time string (e.g. "26/10/2026, 05:36 AM")
 */
export function formatDateTimeIST(
  date: Date | string | number | null | undefined,
  pattern = "dd/MM/yyyy, hh:mm a"
): string {
  if (!date) return ""
  try {
    const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
    return formatInTimeZone(d, DEFAULT_TIMEZONE, pattern)
  } catch {
    return ""
  }
}

/**
 * Generates the appointment time string for right now in Asia/Kolkata (e.g. "05:36 AM")
 */
export function getCurrentAppointmentTimeIST(use12Hour = true): string {
  return formatTimeIST(new Date(), use12Hour ? "hh:mm a" : "HH:mm")
}
