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


/**
 * Ensure time string is in 24-hour HH:mm format
 * Validates that the time is properly formatted and within valid range
 * @param timeStr - Time string to validate (should be HH:mm)
 * @returns Valid time string in HH:mm format, or empty string if invalid
 */
export function ensureValidTimeFormat(timeStr: string | undefined): string {
  if (!timeStr) return "";
  
  // Remove any whitespace
  timeStr = timeStr.trim();
  
  // Check if it's already in HH:mm format
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (timeRegex.test(timeStr)) {
    // Ensure hours are zero-padded
    const [hours, minutes] = timeStr.split(":");
    return `${hours.padStart(2, "0")}:${minutes}`;
  }
  
  // If it contains AM/PM, it might be in 12-hour format - return as-is for now
  // (This would need a conversion function if we want to support 12-hour input)
  if (timeStr.includes("AM") || timeStr.includes("PM")) {
    console.warn(`Time in 12-hour format detected: ${timeStr}. Expected 24-hour format.`);
    return "";
  }
  
  // Invalid format
  console.warn(`Invalid time format: ${timeStr}. Expected HH:mm format.`);
  return "";
}

/**
 * Normalize time string to ensure it's in 24-hour HH:mm format
 * Adds leading zero to hours if needed
 * @param timeStr - Time string (e.g., "9:30" or "09:30")
 * @returns Normalized time string in HH:mm format
 */
export function normalizeTimeFormat(timeStr: string | undefined): string {
  if (!timeStr) return "";
  
  const trimmed = timeStr.trim();
  const parts = trimmed.split(":");
  
  if (parts.length !== 2) return "";
  
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  
  // Validate ranges
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return "";
  }
  
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}
