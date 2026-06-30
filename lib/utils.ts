import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge.
 * This ensures Tailwind classes are properly merged without conflicts.
 *
 * Usage:
 * ```tsx
 * cn("px-4 py-2", isActive && "bg-primary", className)
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


/**
 * Convert 24-hour time string (HH:mm) to 12-hour AM/PM format
 * @param timeStr - Time in HH:mm format (e.g., "14:30")
 * @returns Time in 12-hour format (e.g., "2:30 PM")
 */
export function format12HourTime(timeStr: string): string {
  if (!timeStr) return "";
  const [hourStr, minuteStr] = timeStr.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr || "0", 10);

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12; // Convert 0 to 12 for midnight, 13+ to 1-11

  return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`;
}

/**
 * Convert decimal hours to 12-hour AM/PM format
 * @param hours - Decimal hours (e.g., 14.5 for 2:30 PM)
 * @returns Time in 12-hour format (e.g., "2:30 PM")
 */
export function formatDecimalTo12Hour(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return format12HourTime(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
}
