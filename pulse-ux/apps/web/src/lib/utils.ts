import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with clsx and tailwind-merge.
 * This handles class conflicts properly (e.g., "p-2 p-4" becomes "p-4").
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date for display.
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a number as a percentage.
 */
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Truncate a string to a maximum length.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Safely parse a URL and return the hostname, or fallback text.
 */
export function getHostname(url: string, fallback = "Unknown"): string {
  try {
    return new URL(url).hostname;
  } catch {
    return fallback;
  }
}

/**
 * Calculate conversion rate from impressions and conversions.
 */
export function calculateConversionRate(
  conversions: number,
  impressions: number
): number {
  if (impressions === 0) return 0;
  return (conversions / impressions) * 100;
}

/**
 * Calculate lift percentage between control and variant.
 */
export function calculateLift(
  variantRate: number,
  controlRate: number
): number {
  if (controlRate === 0) return 0;
  return ((variantRate - controlRate) / controlRate) * 100;
}

/**
 * Format a conversion rate for display.
 */
export function formatConversionRate(
  conversions: number,
  impressions: number,
  decimals = 1
): string {
  const rate = calculateConversionRate(conversions, impressions);
  return `${rate.toFixed(decimals)}%`;
}
